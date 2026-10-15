#!/usr/bin/env python3
"""Small end-to-end smoke test using synthetic masks, never a synthetic asset for the app."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

import nibabel as nib
import numpy as np


SCRIPT = Path(__file__).with_name("build_heart_acoustic_volume.py")


def run_converter(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        check=False,
        capture_output=True,
        text=True,
    )


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="heart-volume-test-") as directory:
        root = Path(directory)
        ct_path = root / "ct.nii.gz"
        affine = np.diag([1.5, 1.5, 1.5, 1.0])
        affine[:3, 3] = [20.0, -10.0, 35.0]
        reference = nib.Nifti1Image(np.zeros((32, 32, 32), dtype=np.int16), affine)
        nib.save(reference, ct_path)

        mask_dir = root / "masks"
        mask_dir.mkdir()
        masks = {
            "myocardium": (slice(9, 22), slice(10, 23), slice(9, 22)),
            "ventricle_left": (slice(12, 18), slice(13, 19), slice(12, 19)),
            "atrium_left": (slice(16, 23), slice(14, 20), slice(17, 24)),
            "aorta": (slice(23, 27), slice(16, 21), slice(14, 22)),
        }
        for name, slices in masks.items():
            data = np.zeros((32, 32, 32), dtype=np.uint8)
            data[slices] = 1
            nib.save(nib.Nifti1Image(data, affine), mask_dir / f"{name}.nii.gz")

        raw_output = root / "heart_acoustic.bin"
        result = run_converter([
            "--ct", str(ct_path),
            "--seg-dir", str(mask_dir),
            "--output", str(raw_output),
            "--size", "32",
            "--padding-mm", "2",
            "--blur", "0",
        ])
        if result.returncode != 0:
            raise AssertionError(f"Segmentation-directory conversion failed:\n{result.stderr}\n{result.stdout}")
        if raw_output.stat().st_size != 32 ** 3:
            raise AssertionError("Raw output length does not equal size³ bytes.")
        sidecar = json.loads(raw_output.with_name("heart_acoustic.json").read_text(encoding="utf-8"))
        if sidecar["dimensions_xyz"] != [32, 32, 32]:
            raise AssertionError("Unexpected dimensions in the sidecar.")
        if sidecar["data_order"].find("x-fastest") < 0:
            raise AssertionError("Sidecar does not document the required x-fastest byte order.")
        roles = {item["role"] for item in sidecar["structures"]}
        if not {"myocardium", "blood_pool", "vessel_lumen"}.issubset(roles):
            raise AssertionError(f"Missing expected tissue roles: {roles}")
        volume = np.fromfile(raw_output, dtype=np.uint8)
        if not {8, 108}.issubset(set(np.unique(volume))):
            raise AssertionError("Expected mapped tissue intensities are not present.")

        # Exercise the integer-label-map input path as well.
        labelmap = np.zeros((32, 32, 32), dtype=np.uint8)
        labelmap[9:22, 10:23, 9:22] = 1
        labelmap[12:18, 13:19, 12:19] = 2
        labelmap[23:27, 16:21, 14:22] = 3
        labels_path = root / "labels.nii.gz"
        nib.save(nib.Nifti1Image(labelmap, affine), labels_path)
        label_json = root / "label-map.json"
        label_json.write_text(json.dumps({
            "1": "myocardium",
            "2": "ventricle_left",
            "3": "aorta"
        }), encoding="utf-8")
        label_output = root / "label_map_volume.bin"
        result = run_converter([
            "--ct", str(ct_path),
            "--labels", str(labels_path),
            "--label-map-json", str(label_json),
            "--output", str(label_output),
            "--size", "32",
            "--padding-mm", "2",
            "--blur", "0",
        ])
        if result.returncode != 0:
            raise AssertionError(f"Integer-label-map conversion failed:\n{result.stderr}\n{result.stdout}")
        if label_output.stat().st_size != 32 ** 3:
            raise AssertionError("Label-map output length does not equal size³ bytes.")

        # Unrecognized structures must fail closed rather than receive guessed values.
        unknown_dir = root / "unknown"
        unknown_dir.mkdir()
        unknown = np.zeros((32, 32, 32), dtype=np.uint8)
        unknown[12:18, 12:18, 12:18] = 1
        nib.save(nib.Nifti1Image(unknown, affine), unknown_dir / "unknown_tissue.nii.gz")
        result = run_converter([
            "--ct", str(ct_path),
            "--seg-dir", str(unknown_dir),
            "--output", str(root / "must_not_exist.bin"),
            "--size", "32",
        ])
        if result.returncode == 0 or "Cannot classify structure" not in result.stderr:
            raise AssertionError("Unknown structures should stop conversion with an explicit error.")

    print("Volume converter smoke tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
