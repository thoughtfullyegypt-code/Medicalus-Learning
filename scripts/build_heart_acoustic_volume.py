#!/usr/bin/env python3
"""Convert aligned, labeled cardiac CT structures to a compact ultrasound-proxy volume.

This creates a tissue-label intensity proxy, not physically calibrated acoustic data.
It must not be interpreted or marketed as diagnostic ultrasound.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

import nibabel as nib
import numpy as np
from nibabel.processing import resample_from_to
from scipy.ndimage import gaussian_filter


ROLE_INTENSITY = {
    "air": 0,
    "blood_pool": 8,
    "vessel_lumen": 8,
    "myocardium": 108,
    "fat": 168,
    "vessel_wall": 220,
    "valve": 235,
    "pericardium": 226,
}
# Larger priorities win where masks overlap. Air remains black if a lung/air
# mask is deliberately included. Prefer mutually exclusive structure masks.
ROLE_PRIORITY = {
    "blood_pool": 20,
    "vessel_lumen": 25,
    "fat": 30,
    "myocardium": 40,
    "vessel_wall": 50,
    "valve": 60,
    "pericardium": 70,
    "air": 100,
}
VALID_ROLES = set(ROLE_INTENSITY)


def normalize_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def strip_nifti_suffix(path: Path) -> str:
    name = path.name
    if name.lower().endswith(".nii.gz"):
        return name[:-7]
    if name.lower().endswith(".nii"):
        return name[:-4]
    return path.stem


def infer_role(structure_name: str) -> str | None:
    name = normalize_name(structure_name)
    tokens = set(name.split("_"))

    if name in {"air", "lung", "lung_left", "lung_right", "lungs", "trachea", "bronchus", "bronchi"} or tokens.intersection({"lung", "air"}):
        return "air"
    if "valve" in tokens:
        return "valve"
    if "pericardium" in tokens or "pericardial" in tokens:
        return "pericardium"
    if "fat" in tokens or "adipose" in tokens:
        return "fat"
    if "myocardium" in tokens or "myocardial" in tokens or "cardiac_muscle" in name:
        return "myocardium"
    if "wall" in tokens and tokens.intersection({"vessel", "artery", "vein", "aortic", "aorta", "coronary", "pulmonary"}):
        return "vessel_wall"

    chamber_terms = {"atrium", "atria", "ventricle", "ventricles"}
    if (
        name in {"blood_pool", "blood", "left_ventricle", "right_ventricle", "left_atrium", "right_atrium",
                 "atrium_left", "atrium_right", "ventricle_left", "ventricle_right"}
        or tokens.intersection(chamber_terms)
        or (tokens.intersection({"lv", "rv", "la", "ra"}) and len(tokens) <= 3)
    ):
        return "blood_pool"

    if (
        name in {"aorta", "pulmonary_artery", "pulmonary_vein", "coronary_artery", "coronary_arteries"}
        or tokens.intersection({"aorta", "aortic", "artery", "arteries", "vein", "veins", "coronary"})
    ):
        return "vessel_lumen"

    return None


def load_role_overrides(path: Path | None) -> dict[str, str]:
    if path is None:
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("The role override JSON must be an object mapping structure names to roles.")
    normalized: dict[str, str] = {}
    for name, role in data.items():
        key = normalize_name(str(name))
        value = normalize_name(str(role))
        if value not in VALID_ROLES:
            raise ValueError(f"Unsupported role {role!r} for {name!r}. Valid roles: {sorted(VALID_ROLES)}")
        normalized[key] = value
    return normalized


def resolve_role(name: str, explicit_role: str | None, overrides: dict[str, str]) -> str:
    normalized = normalize_name(name)
    role = overrides.get(normalized) or (normalize_name(explicit_role) if explicit_role else None) or infer_role(name)
    if role not in VALID_ROLES:
        raise ValueError(
            f"Cannot classify structure {name!r}. Rename/map it explicitly or add it to the role override JSON. "
            f"Valid roles: {sorted(VALID_ROLES)}"
        )
    return role


def load_aligned(image_path: Path, reference: nib.spatialimages.SpatialImage, order: int) -> np.ndarray:
    image = nib.load(str(image_path))
    if len(image.shape) != 3:
        raise ValueError(f"{image_path.name} is not a 3D volume (shape={image.shape}). Select one cardiac phase first.")
    if image.shape == reference.shape and np.allclose(image.affine, reference.affine, rtol=0, atol=1e-4):
        return np.asanyarray(image.dataobj)
    aligned = resample_from_to(image, reference, order=order, mode="constant", cval=0)
    return np.asanyarray(aligned.dataobj)


def apply_mask(
    mask: np.ndarray,
    structure_name: str,
    role: str,
    acoustic: np.ndarray,
    priority: np.ndarray,
    occupied: np.ndarray,
) -> int:
    mask = np.asarray(mask) > 0
    count = int(np.count_nonzero(mask))
    if count == 0:
        raise ValueError(f"Structure mask {structure_name!r} is empty after alignment to the CT.")
    occupied |= mask
    rank = ROLE_PRIORITY[role]
    selected = mask & (rank >= priority)
    acoustic[selected] = ROLE_INTENSITY[role]
    priority[selected] = rank
    return count


def get_structure_items(args: argparse.Namespace, reference: nib.spatialimages.SpatialImage,
                        overrides: dict[str, str]) -> list[tuple[str, str, np.ndarray, int]]:
    items: list[tuple[str, str, np.ndarray, int]] = []

    if args.labels:
        if not args.label_map_json:
            raise ValueError("--label-map-json is required with --labels.")
        labelmap = load_aligned(Path(args.labels), reference, order=0)
        rounded = np.rint(labelmap)
        if np.any(np.abs(labelmap.astype(np.float32) - rounded.astype(np.float32)) > 1e-3):
            raise ValueError("Label map contains non-integer values; use a discrete segmentation label map.")
        labelmap = rounded.astype(np.int32)
        raw_mapping = json.loads(Path(args.label_map_json).read_text(encoding="utf-8"))
        if not isinstance(raw_mapping, dict):
            raise ValueError("Label-map JSON must be an object mapping label IDs to structure names.")
        mapping: dict[int, tuple[str, str | None]] = {}
        for raw_id, entry in raw_mapping.items():
            try:
                label_id = int(raw_id)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"Label-map key {raw_id!r} is not an integer ID.") from exc
            if isinstance(entry, str):
                mapping[label_id] = (entry, None)
            elif isinstance(entry, dict) and isinstance(entry.get("name"), str):
                mapping[label_id] = (entry["name"], entry.get("role"))
            else:
                raise ValueError(f"Map entry for label {raw_id!r} must be a name or an object with a name field.")

        values = {int(v) for v in np.unique(labelmap) if int(v) != 0}
        unmapped = sorted(values - set(mapping))
        if unmapped:
            raise ValueError(f"Nonzero label IDs have no name in the JSON map: {unmapped}")
        for label_id in sorted(values):
            name, explicit_role = mapping[label_id]
            role = resolve_role(name, explicit_role, overrides)
            items.append((name, role, labelmap == label_id, label_id))
        return items

    if args.label_map_json:
        raise ValueError("--label-map-json can only be used together with --labels.")
    seg_dir = Path(args.seg_dir)
    paths = sorted(list(seg_dir.glob("*.nii")) + list(seg_dir.glob("*.nii.gz")))
    if not paths:
        raise ValueError(f"No .nii/.nii.gz structure masks found in {seg_dir}.")
    if args.structures:
        wanted = {normalize_name(name) for name in args.structures.split(",") if name.strip()}
        indexed = {normalize_name(strip_nifti_suffix(path)): path for path in paths}
        missing = sorted(wanted - set(indexed))
        if missing:
            raise ValueError(f"Requested mask filenames not found in --seg-dir: {missing}")
        paths = [indexed[name] for name in sorted(wanted)]

    for path in paths:
        name = strip_nifti_suffix(path)
        role = resolve_role(name, None, overrides)
        mask = load_aligned(path, reference, order=0)
        items.append((name, role, mask > 0, len(items) + 1))
    return items


def bounds_from_mask(mask: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    if not mask.any():
        raise ValueError("No non-background structure voxels were found.")
    starts, stops = [], []
    for axis in range(3):
        reduce_axes = tuple(i for i in range(3) if i != axis)
        occupied = np.flatnonzero(np.any(mask, axis=reduce_axes))
        starts.append(int(occupied[0]))
        stops.append(int(occupied[-1]))
    return np.asarray(starts, dtype=np.float64), np.asarray(stops, dtype=np.float64)


def build_target_affine(reference: nib.spatialimages.SpatialImage, center_vox: np.ndarray,
                        cube_mm: float, size: int) -> tuple[np.ndarray, list[float]]:
    affine = np.asarray(reference.affine, dtype=np.float64)
    spacing_in = np.asarray(nib.affines.voxel_sizes(affine), dtype=np.float64)
    directions = affine[:3, :3] / spacing_in[np.newaxis, :]
    spacing_out = cube_mm / size
    target_affine = np.eye(4, dtype=np.float64)
    target_affine[:3, :3] = directions * spacing_out
    center_world = (affine @ np.array([*center_vox, 1.0]))[:3]
    target_affine[:3, 3] = center_world - target_affine[:3, :3] @ np.full(3, (size - 1) / 2.0)
    return target_affine, spacing_in.tolist()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build a uint8 3DTexture volume from a CT and explicit cardiac segmentation labels."
    )
    parser.add_argument("--ct", required=True, help="3D CT in NIfTI (.nii or .nii.gz); export NRRD from Slicer first.")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--labels", help="Integer label-map NIfTI. Requires --label-map-json.")
    source.add_argument("--seg-dir", help="Folder containing only the individual NIfTI structure masks to include.")
    parser.add_argument("--label-map-json", help="JSON mapping integer label IDs to structure names / optional roles.")
    parser.add_argument("--structures", help="Comma-separated mask filenames (without .nii/.nii.gz) to select from --seg-dir.")
    parser.add_argument("--role-overrides-json", help="Optional JSON mapping normalized structure names to roles.")
    parser.add_argument("--output", default="public/volumes/heart_acoustic.bin", help="Raw uint8 output path.")
    parser.add_argument("--size", type=int, default=128, help="Cubic output dimensions; default 128 means 128^3 bytes.")
    parser.add_argument("--padding-mm", type=float, default=18.0, help="Physical padding around the labeled bounding box.")
    parser.add_argument("--blur", type=float, default=0.45, help="Small Gaussian smoothing sigma in output voxels; 0 disables.")
    args = parser.parse_args()

    try:
        if args.size < 16 or args.size > 512:
            raise ValueError("--size must be between 16 and 512.")
        if args.padding_mm < 0 or args.blur < 0:
            raise ValueError("--padding-mm and --blur must be non-negative.")
        ct_path = Path(args.ct)
        if not ct_path.is_file():
            raise ValueError(f"CT file not found: {ct_path}")
        reference = nib.load(str(ct_path))
        if len(reference.shape) != 3:
            raise ValueError(
                f"CT must be a single 3D phase (shape={reference.shape}). Select/export one cardiac phase first; "
                "the converter does not invent a heartbeat."
            )
        overrides = load_role_overrides(Path(args.role_overrides_json) if args.role_overrides_json else None)
        structures = get_structure_items(args, reference, overrides)
        if not structures:
            raise ValueError("No structures were selected.")

        acoustic = np.zeros(reference.shape, dtype=np.uint8)
        priority = np.zeros(reference.shape, dtype=np.uint8)
        occupied = np.zeros(reference.shape, dtype=bool)
        provenance = []
        for name, role, mask, label_id in structures:
            count = apply_mask(mask, name, role, acoustic, priority, occupied)
            provenance.append({
                "name": name,
                "role": role,
                "brightness": ROLE_INTENSITY[role],
                "source_label_id": label_id if args.labels else None,
                "voxels_on_ct_grid": count,
            })

        bbox_min, bbox_max = bounds_from_mask(occupied)
        center_vox = (bbox_min + bbox_max) / 2.0
        source_spacing = np.asarray(nib.affines.voxel_sizes(reference.affine), dtype=np.float64)
        physical_extent = (bbox_max - bbox_min + 1.0) * source_spacing
        cube_mm = float(np.max(physical_extent) + 2.0 * args.padding_mm)
        target_affine, spacing_in = build_target_affine(reference, center_vox, cube_mm, args.size)

        acoustic_image = nib.Nifti1Image(acoustic, reference.affine)
        sampled = resample_from_to(
            acoustic_image, ((args.size, args.size, args.size), target_affine),
            order=1, mode="constant", cval=0.0
        ).get_fdata(dtype=np.float32)
        if args.blur > 0:
            sampled = gaussian_filter(sampled, sigma=args.blur)
        sampled_u8 = np.clip(np.rint(sampled), 0, 255).astype(np.uint8)

        # Three.js Data3DTexture consumes x-fastest bytes. NIfTI stores an
        # (i,j,k) array; transpose to (k,j,i) before C-order serialization.
        texture_bytes = np.ascontiguousarray(sampled_u8.transpose(2, 1, 0))
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        texture_bytes.tofile(output_path)
        sidecar_path = output_path.with_name(output_path.stem + ".json")
        metadata: dict[str, Any] = {
            "format": "raw uint8",
            "dimensions_xyz": [args.size, args.size, args.size],
            "expected_byte_length": args.size ** 3,
            "data_order": "x-fastest; source (i,j,k) sampled volume transposed to (k,j,i) before C-order write",
            "target_affine_nifti_ijk_to_world": target_affine.tolist(),
            "source_voxel_spacing_mm": spacing_in,
            "output_voxel_spacing_mm": cube_mm / args.size,
            "cube_field_of_view_mm": cube_mm,
            "crop_center_source_voxel_ijk": center_vox.tolist(),
            "brightness_by_role": ROLE_INTENSITY,
            "structures": provenance,
            "smoothing_sigma_output_voxels": args.blur,
            "limitations": [
                "Segmentation-derived educational proxy, not measured acoustic impedance or a validated ultrasound reconstruction.",
                "Boundary brightness is produced by the browser shader; this file contains mapped tissue values only.",
                "A static single-phase CT does not encode cardiac motion.",
                "Do not use for diagnosis, treatment, procedural guidance, or clinical decisions."
            ],
        }
        sidecar_path.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
        expected = args.size ** 3
        actual = output_path.stat().st_size
        if actual != expected:
            raise RuntimeError(f"Output size check failed: expected {expected} bytes, got {actual}.")
        print(f"Wrote {output_path} ({actual:,} bytes)")
        print(f"Wrote {sidecar_path}")
        print(f"Dimensions: {args.size} x {args.size} x {args.size}; voxel size: {cube_mm / args.size:.2f} mm")
        print("Review source-dataset and segmentation-model permissions before publishing these derived assets.")
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
