# Medalicus 2.0 — Coronary Learning Studio

A clean rebuild focused on coronary angiography learning through C-arm orientation practice, written teaching scenarios, retrieval cards, and a guided curriculum.

## Principles
- Original product structure and interaction design; no legacy app components are reused.
- Never pass generated shapes or schematics off as anatomical meshes, patient imaging, or real echo.
- The projection dial is an angle-orientation schematic only.
- Teaching cases are written scenarios, not real patient data or a substitute for clinical training.
- Educational associations are general references, not procedural recommendations.

## Features
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
2. License and validate source imagery or anatomy assets before image-based learning.
3. Add real, appropriately licensed/de-identified angiography teaching studies with attribution.
4. Add educator-reviewed cases and assessment analytics.

This app is educational and is not intended for clinical decision-making or procedural guidance.
