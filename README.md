# Medalicus 2.0 — Coronary Learning Studio

A medical learning studio with an interactive model-based virtual angio lab, an asset-backed echocardiography viewer, C-arm orientation practice, teaching scenarios, retrieval cards, and a guided curriculum.

## Principles
- Original product structure and interaction design; no legacy app components are reused.
- Never pass generated shapes or schematics off as anatomical meshes, patient imaging, or real echo.
- The Projection Coach dial is an angle-orientation schematic; the Virtual Angio Lab is a simplified model-based projection, not a reconstructed patient radiograph.
- Teaching cases are written scenarios, not real patient data or a substitute for clinical training.
- Educational associations are general references, not procedural recommendations.
- No CT, segmentation, heart mesh, echo loop, or ultrasound volume is bundled without verifying its provenance and redistribution rights.

## Features
- Virtual Angio Lab with model-based coronary projections, interactive RAO/LAO and cranial/caudal C-arm controls, left/right coronary selection, contrast injection, cine playback, magnification, labels, and view-acquisition practice objectives.
- Echo Lab that plays only supplied pre-rendered echo loops. Missing media produces an explicit error state; no synthetic ultrasound is substituted.
- Projection Coach with interactive RAO/LAO and cranial/caudal controls and common teaching presets.
- Text-based case library with search, level filters, saved cases, and learning briefs.
- Flashcards with answer reveal, navigation, and save-for-review state.
- Four-part learning path with session completion tracking.
- CT-to-ultrasound-proxy preprocessing script under scripts/; it builds a compact volume only from real CT geometry and explicit structure masks, and does not fabricate a source CT, GLB, heartbeat, or echo loop.

## Local development
Requires Node.js 20 or newer. Run npm install, then npm run dev.

## Production build
Run npm run build, then npm run preview.

## CT / volume preprocessing
See docs/heart-volume-pipeline.md for the local CT → segmentation masks → raw uint8 volume workflow, including asset licensing checks and byte-order requirements. The generated binary volume and 3D heart model are not present in this repository because no verified source asset was supplied.

## Next phases
1. Add authentication and persistent learning progress.
2. Add licensed, de-identified real cine studies with documented permissions and expert-verified annotations.
3. Add real, appropriately licensed/de-identified angiography teaching studies with attribution.
4. Add educator-reviewed cases and assessment analytics.
5. Add a volume-backed ultrasound proxy and 3D scan-plane viewer only after the same-source volume and aligned heart model are available and verified.

This app is educational and is not intended for clinical decision-making or procedural guidance.
