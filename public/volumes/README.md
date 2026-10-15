# Generated volume assets

This folder is reserved for the future volume-backed viewer. After processing real, appropriately licensed source data, the expected files are:

- heart_acoustic.bin — raw uint8 128³ by default (2,097,152 bytes), x-fastest byte order for Three.js Data3DTexture.
- heart_acoustic.json — sidecar containing dimensions, transform, brightness mapping, and limitations.

These files are intentionally not committed yet: the repository does not include a source CT or reviewed structure masks. Run scripts/build_heart_acoustic_volume.py locally after checking the data and model licenses. The current Echo Lab does not load this binary yet; it currently plays only pre-rendered MP4 loops if supplied. Do not use a drawn or generated substitute when source assets are absent.
