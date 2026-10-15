# CT-to-ultrasound-proxy pipeline

This is a reproducible preprocessing step for a future educational visualization, not a clinical ultrasound simulator. It maps explicitly segmented structures to grayscale scalar values. A browser shader would still need to compute gradients, beam sampling, speckle, attenuation, gain, log compression, and the sector mask.

## 1. Obtain a source volume

For a quick local prototype, install 3D Slicer and use Sample Data → CTACardio. The sample is distributed by the Slicer testing-data infrastructure; verify the current terms for any redistribution or hosted use. In Slicer, save/export the image as a 3D NIfTI file named heart_ct.nii.gz. Select a single phase if your source is a sequence; a static volume does not encode a heartbeat.

The script accepts NIfTI, not Slicer NRRD. It does not change or remove identifying metadata from the input image; the generated sidecar deliberately does not copy input filenames or patient metadata.

## 2. Create structure masks

The converter requires individual anatomical masks or an integer label map with an explicit class map. A whole-heart mask alone is not enough to distinguish a blood pool from myocardium.

With TotalSegmentator, its general total task does not provide every separate chamber needed for this mapping. The heartchambers_highres task lists myocardium, left/right atria and ventricles, aorta, and pulmonary artery, but the model has separate licensing terms. Review the current TotalSegmentator license and each dataset's terms before using the output on a public or commercial site.

Example command (run only after confirming your license and model availability):

~~~
pip install TotalSegmentator
TotalSegmentator -i heart_ct.nii.gz -o segmentation_masks -ta heartchambers_highres
~~~

Put only the needed cardiac NIfTI masks in a dedicated directory. Names should communicate the structure, for example myocardium.nii.gz, atrium_left.nii.gz, atrium_right.nii.gz, ventricle_left.nii.gz, ventricle_right.nii.gz, aorta.nii.gz, and pulmonary_artery.nii.gz. The script aligns masks to the CT using their NIfTI geometry and nearest-neighbor resampling. Unrecognized structure names fail rather than silently receiving fabricated values.

If you use a single integer label map, create a JSON map from the actual label IDs to actual structure names; IDs differ by model/export and are not assumed by the script. Example schema:

~~~
{
  "1": "ventricle_left",
  "2": "myocardium",
  "3": "atrium_left"
}
~~~

The numeric IDs above are illustrative placeholders only. Replace them with the values from your own segmentation.

## 3. Build the 128³ scalar volume

Install the small preprocessing dependencies:

~~~
python -m venv .venv
source .venv/bin/activate
python -m pip install -r scripts/requirements-processing.txt
~~~

Using individual masks:

~~~
python scripts/build_heart_acoustic_volume.py \
  --ct heart_ct.nii.gz \
  --seg-dir segmentation_masks \
  --output public/volumes/heart_acoustic.bin \
  --size 128
~~~

Using a single integer label map:

~~~
python scripts/build_heart_acoustic_volume.py \
  --ct heart_ct.nii.gz \
  --labels cardiac_labels.nii.gz \
  --label-map-json cardiac-labels.json \
  --output public/volumes/heart_acoustic.bin \
  --size 128
~~~

If your mask folder contains more masks than you intend to include, provide --structures with comma-separated mask filenames without the .nii.gz extension. You can specify role overrides with a JSON object mapping structure names to one of these roles: blood_pool, vessel_lumen, myocardium, fat, vessel_wall, valve, pericardium, or air.

The script maps blood pools and vessel lumens dark, myocardium medium, and selected boundaries / fat brighter. These values are a tunable educational proxy, not a claim that CT intensity equals tissue echogenicity. It crops around the labeled structures, pads the crop in millimeters, resamples to a cubic grid, smooths slightly, and writes raw uint8 bytes plus a JSON transform/provenance sidecar. At 128³, the raw file is exactly 2,097,152 bytes.

The byte order is x-fastest for Three.js Data3DTexture. Use the sidecar transform when aligning the scan plane and the GLB; do not assume that a cube's texture axes correspond to world X/Y/Z without the coordinate transform.

## 4. Publish only after review

Do not commit or deploy source CTs, segmentation source data, or derived GLBs/volumes until redistribution and model licenses have been checked. A local sample being accessible in Slicer does not automatically grant public hosting or commercial redistribution rights.

The current Echo Lab still looks for the four pre-rendered MP4 loops; it does not yet render heart_acoustic.bin or heart.glb. Connecting the volume shader and aligned 3D scan-plane view is a separate app change and must be validated against a real generated volume before it is enabled. Until then, missing assets must continue to produce explicit errors rather than placeholder graphics.

Educational use only. Not for diagnosis, treatment, procedural guidance, or clinical decision-making.
