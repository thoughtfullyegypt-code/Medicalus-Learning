# Medalicus 2.0 — Coronary Learning Studio

A learning studio for coronary angiography with an interactive model-based virtual angio lab, C-arm orientation practice, teaching scenarios, retrieval cards, and a guided curriculum.

## Principles
- Original product structure and interaction design; no legacy app components are reused.
- Never pass generated shapes or schematics off as anatomical meshes, patient imaging, or real echo.
- The Projection Coach dial is an angle-orientation schematic; the Virtual Angio Lab is a simplified model-based projection, not a reconstructed patient radiograph.
- Teaching cases are written scenarios, not real patient data or a substitute for clinical training.
- Educational associations are general references, not procedural recommendations.

## Features
- Virtual Angio Lab with model-based coronary projections, interactive RAO/LAO and cranial/caudal C-arm controls, left/right coronary selection, contrast injection, cine playback, magnification, labels, and view-acquisition practice objectives.
- Projection Coach with interactive RAO/LAO and cranial/caudal controls and common teaching presets.
- Text-based case library with search, level filters, saved cases, and learning briefs.
- Flashcards with answer reveal, navigation, and save-for-review state.
- Four-part learning path with session completion tracking.
- Responsive navigation for desktop and mobile.

## Local development
Requires Node.js 20 or newer. Run npm install, then npm run dev.

## Production build
Run npm run build, then npm run preview.

## Next phases
1. Add authentication and persistent learning progress.
2. Add licensed, de-identified real cine studies with documented permissions and expert-verified annotations.
3. Add real, appropriately licensed/de-identified angiography teaching studies with attribution.
4. Add educator-reviewed cases and assessment analytics.

This app is educational and is not intended for clinical decision-making or procedural guidance.
