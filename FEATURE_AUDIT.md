# Rooted requirement audit · 2026-10-10

Checked current source, tests, archived recognition results and browser behavior. No recognition requests were made for this update.

| Requested capability | Current status |
| --- | --- |
| Rooted wordmark returns to main destination; clearer hierarchy | Implemented: My Living Home for configured homes, Welcome before setup; breadcrumb and active navigation. |
| Richer persistent quiz | Implemented: seven optional questions plus six plant preference cards; backward navigation and refresh restoration. Routine is context only, not a plant-health prediction. |
| Flashcards early, searchable list later | Implemented in personalization and Discover respectively; likes/passes affect explainable ranking, never cat-safety priority. |
| Add plants outside the small catalog | Implemented as explicit custom adoption with name, stable ID, date and editable location; species facts and footprint remain unknown. No invented species illustration or measured footprint. |
| Cleaner Home Setup | Implemented: basic home choice, optional Beta recognition, review/calibration panels; optional light section; one save action. Manual import, shape editing, category filters and fixture remain available. |
| Preview and multiple independent adoptions | Preserved: catalog illustrations, Current/Mature, pointer/keyboard placement, geometry checks, selection, naming, date, persistence and removal undo. |
| Unverified uploaded plans must not show Clear | Implemented: Unknown/Not verified until scale and usable geometry are verified; confirmed collisions remain red. Custom plants always have unknown placement assessment. |
| Automatic recognition of arbitrary plans | Beta integration exists, explicit request only. Localization is still unreliable. **Production recognition still requests rectangles**, although renderer/editor/collision model supports polygons and lines. The furniture experiment was not substituted into production. |
| Controlled overlay regression / recognition comparison | Offline regression and comparison reports exist. **Historical baseline image-response identity is not conclusively verifiable**; validated ground truth and trustworthy IoU are unavailable. Furniture-only request succeeded in attempt 2, but report does not establish improvement. |
| Pet and lighting context | Cat/dog/both/other answers persist. **Only cat safety is sourced**; dog/other pet safety remains unassessed. One named qualitative light observation is supported, **not multiple independent location observations or measured sunlight**. |
| Care logs, health consultations, death archive, community | Not implemented, intentionally outside the authorized Phase 1/C scope. |

Verification: 50 automated tests pass; production build passes. Browser QA on isolated port 5174 covered seven-question navigation, flashcard refresh restoration, liked-plant ranking, no-result search, custom adoption and refresh, wordmark home navigation, staged setup/manual fixture/editor access, ordinary catalog adoption alongside custom records, and unverified preview. Editor document did not overflow at a 390px viewport. Existing localhost plants and uploaded plan were not changed.

Manual test: Preferences → answer seven questions → like/pass plant cards → save → choose Demo Home → search and preview a plant → explicitly adopt → click Rooted to return home. Search an absent plant name → Add a plant of my own → explicit confirmation → select/move the custom marker → refresh. In Edit home, upload or load the manual example, optionally visit Recognition without requesting it, then Review & calibrate; save unfinished geometry and check Not verified in preview.

## Latest correction · Start vs workspace

Supersedes the earlier wordmark/landing description: Rooted returns to Start, and open/refresh presents the product entry with an explicit workspace shortcut for saved homes. Guided setup now finishes in Plant workspace rather than the discovery list. Flashcards support flip and directional exit motion with reduced-motion alternatives. Recognition was never removed, but its tab-only access was confusing: upload now opens its visible panel, and basic setup exposes it for saved uploads. The server integration and manual review tools remain intact. No live recognition call was used for QA; cloud output accuracy remains Beta.
