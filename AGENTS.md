# AGENTS.md — Rooted v0.3 incremental development

Read `PRD.md` first for the product requirements, and `DESIGN.md` for the established visual system. `PRODUCT.md` may provide historical context but its old preview-only scope is superseded by `PRD.md`.

## Mission
Upgrade the **existing working Rooted application** into a home-centered plant companion. **No rebuild.** Preserve plant preview and geometry while introducing the user journey in explicit phases.

## Key repository references
- `src/main.tsx`: existing one-page preview UI; reorganize minimally into stages.
- `src/model.ts`: existing catalog, `circleRect`, `evaluate`, demo room, legacy `rooted-preview-v1` data.
- `src/RoomPlan.tsx`: existing SVG placement and interaction; reuse for preview and active home map.
- `src/PlantArt.tsx`, `src/styles.css`: retain illustrations and current design language.
- `tests/model.test.ts`: do not regress verified geometry/preview behavior.

## Non-negotiable execution rules
1. Do **Phase 1 only** when prompted for Phase 1. Phase 2 requires a separate explicit user instruction.
2. Retain Vite/React/TypeScript/SVG/vanilla CSS. No backend, authentication, 3D, unnecessary dependencies or broad infrastructure changes.
3. Preserve current plant preview, Current/Mature behavior, geometry, user-style distinction, cat warnings and unknown-light honesty.
4. Separate temporary *preview selection* from *owned plant instances*, with independent stable IDs and per-plant events.
5. Never silently create owned plants on selecting a species; require explicit Add to My Home.
6. For uploaded floor-plan pictures, do not invent dimensions or geometry. Use demo calibrated room or explicitly user-entered/manual geometries; clearly distinguish unmeasured background.
7. Keep local persistence versioned, guarded against corrupt/old data, with a safe migration path from `rooted-preview-v1`; do not auto-adopt legacy preview plant.
8. Species information must be source-grounded; unknowns remain unknown. Never fabricate oxygen/mood/pest/light estimates or diagnostic advice.
9. Every prominent UI action must work; no inert buttons, fake AI diagnosis or placeholder claims.
10. Maintain a working build; do not rewrite unrelated working code. Prefer simple components and pure testable functions.
11. Respect desktop-first botanical editorial design in `DESIGN.md`, while providing usable touch/click alternatives.
12. Keep a concise progress summary and call out incomplete functionality accurately, rather than claiming it is implemented.

## Work plan
- Before edits: inspect source; identify existing reusable functions and minimum files to change in 3–6 sentences.
- Implement only the current phase's vertical journey, keeping intermediate states runnable.
- Add targeted tests, run `npm test` and `npm run build`, report exact results.
- Explain how to manually test the journey with numbered steps; report any known limitations.
- Stop feature work if QA, deployment, or challenge timebox is endangered.

## Codex efficiency
Do not regenerate specs or large commentary; do not install libraries without necessity. Use existing style tokens. Group related edits, avoid repeated broad refactors, and ask questions only when a critical choice is unresolved.

## Priority hierarchy
1. Correct functioning and state/persistence.
2. Complete user journey for the active phase.
3. Maintain existing visual quality.
4. Optional improvements only after acceptance tests.
