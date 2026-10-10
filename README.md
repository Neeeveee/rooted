# Rooted — Phase 1

An incremental upgrade of the original React + TypeScript + Vite preview. SVG, plain CSS, browser-local storage; no new dependencies. Optional Gemini recognition runs through a local server endpoint.

## Run

```sh
npm ci
npm run dev
npm test
npm run build
```

Node 22.18+; tested with Node 24. Production output: `dist/`.

## Full journey

1. Open the app in a fresh browser profile to see Welcome. Complete the four questions, or skip them. Returning users can use **Preferences** to edit answers.
2. Set up a home: use the demo bedroom, or choose **My floor plan** and select a PNG/JPEG/WebP smaller than 1 MB. Map and verify spatial regions, calibrate scale using a known measurement, and optionally add a named light observation. You may save unfinished geometry; placement remains Unknown.
3. Compare **Personalized picks** with **Browse all**. Edit preferences to change ordering. Each pick explains the deterministic match; source links and cat hazards remain visible.
4. Preview a species. Move it by drag, click, or arrow keys. **Current / Mature** changes the illustrative footprint and calibrated collision checks. Uncalibrated images show neutral, unscaled markers. Aesthetic settings do not hide space or safety warnings.
5. Choose **Add to My Home**, name the plant, then **Confirm adoption**. A unique owned record is created with species, position, home, adoption timestamp, active status and an independent empty events array.
6. Add a second plant of the same species. Select either plant on the map or list, rename it, and move it. The other plant and the preview remain independent.
7. Refresh: My Living Home opens with the same owned records. Test **Remove accidental placement**, its confirmation, and **Undo removal**.

The browser used during verification contains two demonstration Monstera instances. Use a separate browser profile/private window to try the first-use journey without disturbing saved data.

## Preserved and extended

- Preserved `circleRect`, `evaluate`, the furnished demo room, original three plant illustrations, current/mature behavior, cat warnings and style separation. Original geometry tests are unchanged.
- Reused `RoomPlan` for both preview and owned home. It supports a selected plant plus other independent owned markers, or an uploaded background.
- Expanded the local catalog to six species. ASPCA safety and NC State/RHS qualitative care sources are linked in the UI and catalog. Additional species: parlor palm, cast iron plant and baby rubber plant.
- Added guarded `rooted-app-v2` persistence. Legacy `rooted-preview-v1` contributes only preferences and a preview; it is never automatically adopted or deleted. Invalid v2 data is not overwritten until the user saves a change.
- Saved pre-upgrade source in `backups/rooted-v1-before-phase1.tar.gz`.

## Limits

- One home; local browser only. Browser data clearing removes records; there is no cloud sync.
- Gemini floor-plan recognition is available through the local Vite server; it produces approximate, unconfirmed overlays that require review. Uploaded plans also support manual editable overlays and verification. Rectangles only; compose several for irregular rooms, angled walls or furniture. Uncharted space and explicitly Unknown regions stay unevaluated. Windows are informational. User confirmation is not a professional survey.
- Calibrate by marking two endpoints of a known real-world length. Source image aspect is retained in the coordinate calculation; the existing plan renderer maps that coordinate system to its SVG canvas. Previously entered width/height alone does not count as calibration. Uncalibrated plans have neutral markers with no meter-based footprint claim. A Clear state requires calibrated scale, global verification, full footprint inside a confirmed room, and no uncertain/unknown overlap. Confirmed furniture/wall/door overlap produces Conflict once scale is calibrated, even if overall verification remains incomplete.
- One named, self-reported light observation per home. Actual suitability at individual plant locations remains unverified.
- Footprint sizes are demo assumptions, not growth predictions. Plant-to-plant collision detection is not included.
- The quiz covers cats; other pets are not assessed. No fabricated care schedules or health claims.
- Image input is limited to 1 MB. Invalid files and storage failures produce visible errors. A rejected image save leaves the previous stored home unchanged and allows retry without the image. Other storage failures keep in-memory changes and warn that they are not saved.
- Removal is for accidental placement, with an immediate session-only Undo. No lifecycle archive or Phase 2 care/history features.
- Not published. This task's deliverable is the local app and production build.

## Verification (2026-10-09)

- `npm test`: **34 passed, 0 failed** (29 existing tests + 5 recognition/security tests).
- `npm run build`: TypeScript and Vite production build passed.
- Browser: four-question onboarding, demo setup, deterministic recommendation explanations, current/mature conflict, aesthetic/safety separation, adoption confirmation, two same-species instances, independent movement/rename, map selection, refresh, removal and Undo passed.
- Earlier Phase 1 upload checks: oversized image rejection, local PNG selection and image persistence. New editor checks: manual room/furniture drawing, region rename and confirmation, two-point calibration, global verification/save, confirmed furniture conflict, clear placement, uncharted-position Unknown, and refresh persistence. Browser checks used a blank test image with explicitly manual test geometry, not simulated recognition.
- 1280 × 720 dashboard fits vertically; 390 px layout has no horizontal overflow. No captured browser console errors.
- Storage corruption/quota/unavailable cases verified with unit tests; browser quota exhaustion was not forced.

## Uploaded plan: map, calibrate, verify

1. My Living Home → **Edit home** → **My floor plan** → upload an image under 1 MB.
2. Select **Room** and drag rectangles over usable room interiors. Select **Furniture**, **Wall**, **Door clearance** or **Window** to add corresponding overlays. Door rectangles must include the swing/clearance zone.
3. Select an overlay with **Select**, or use its list entry. Rename it, correct x/y/width/height as percentages of the source image, then **Confirm region**. Remove incorrect regions. Mark unmapped or uncertain parts **Unknown**. Geometry edits revoke global verification.
4. Select **Calibrate scale**. Click two endpoints of a known measurement, enter its actual length in meters, then **Apply calibration**. Calibrated whole-image bounds must be 1–50 m.
5. Confirm every region (or remove it / mark its area Unknown), then check the verification declaration. Save home. Saving unfinished work is allowed but does not produce a Clear state.
6. Preview or move an owned plant: confirmed obstacle overlap is red; a footprint wholly within verified room coverage is clear; uncharted or unknown coverage is neutral and Not evaluated. Refresh to verify persistence.

Backup before this correction: `backups/rooted-before-geometry-editor.tar.gz`. No new dependencies, external requests, backend or Phase 2 features were added.

## Attached apartment fixture

**Edit home → My floor plan → Load attached apartment test** loads the supplied original JPEG and manual JSON into the draft. This does not run recognition or modify saved data until Save. All 33 regions start unconfirmed; review each, correct wall thickness/openings, calibrate the printed scale bar, and add manually verified room interiors before enabling green Clear feedback. The fixture provides no room coverage or verified measurement. Confirmed obstacle collisions work after calibration even while other areas remain Unknown.

Alternatively upload the original image, then use **Import geometry JSON**. Image dimensions must match exactly (849 × 1200); mismatches and unsupported geometry show errors without replacing the draft. Import replaces draft overlays and resets calibration/verification. Imported simulated placements and status claims are ignored. The reference overlay PNG is visual guidance only.

`src/floorplanImport.ts` exports a pure adapter and reusable `GeometryPayload` contract for future integrations:

```ts
{ version: 1, coordinateSystem: 'normalized-0-1', imageWidth: 849, imageHeight: 1200,
  regions: [{ id: 'bed-1', label: 'Bed', kind: 'furniture',
    x: 0.678, y: 0.255, width: 0.119, height: 0.112 }] }
```

Kinds: room, furniture, wall, door (clearance), window, unknown. Coordinates are relative to the full source image. All provider regions require fresh user confirmation. Current adapter supports axis-aligned rectangles and two-point axis-aligned wall/window lines; lines receive an explicitly unverified one-source-pixel initial thickness. Arbitrary polygons and angled lines are rejected instead of silently approximated. Origin/dimensions/limitations persist alongside the geometry. The fixture itself makes no external request; Gemini recognition is a separate explicit action.

Browser verified bundled loading/alignment, individual confirmation, printed-bar calibration, upper-bed collision, gray unverified geometry, and reload with both existing plant records intact. The current QA home uses the attached fixture with one reviewed bed; other regions remain unconfirmed. Backup: `backups/rooted-before-fixture-import.tar.gz`.

## Gemini recognition

Set `GEMINI_API_KEY` in ignored `.env.local`, then run `npm run dev` (or `npm run build` followed by `npm run preview`). Open **Edit home → My floor plan**, upload a PNG/JPEG/WebP under 1 MB, and click **Recognize with Gemini**. This sends the selected image to Google and replaces only draft overlays. Review, correct/add/remove and confirm regions, calibrate a known length, verify coverage, then save. Saved plants remain independent. Static `dist/` hosting alone does not provide the recognition endpoint.

The server uses vision-capable `gemini-3.1-flash-lite`, available with Free Tier pricing. No billing services are enabled, no paid fallback or automatic retry is used; actual billing/quota follows the Google project's configuration. Free Tier submissions may be used by Google to improve products. The key is server-only and excluded from production assets. The endpoint accepts same-origin local requests, validates images and provider coordinates, limits request size and concurrent calls, and returns sanitized errors.

Provider coordinates explicitly use 0–1000 units and are validated/converted to the reusable normalized 0–1 contract. Detection never establishes scale or confirms geometry. Axis-aligned approximations can miss or misidentify objects; human review is required. Failed recognition leaves the draft intact.

Verified a real request with the supplied apartment image and a successful browser-button request containing all five requested geometry categories. Production assets were scanned for the configured secret: no match. Current browser detection results are an unsaved review draft; existing saved home data was preserved. Backup: `backups/rooted-before-gemini.tar.gz`.

## Phase A: offline shape upgrade

No Gemini calls were made for this phase. Existing recognition remains single-pass rectangles; this phase adds manual shape correction, not a new recognition strategy.

- Optional `shape` supports `{type:'polygon',points:[[x,y],...]}` or `{type:'line',points:[[x1,y1],[x2,y2]],thickness:0.005}`. Points are normalized 0–1, thickness is a fraction of image width. Bounds remain for legacy compatibility and are derived on shape import/load. Existing rectangles, storage key/version, owned records and demo calculations are retained.
- Furniture/walls can use polygons, rooms are non-obstacle polygons, windows are informational lines, and doors distinguish informational openings from collision clearance regions. Line collisions use a round-ended stroke of the same physical width as rendered. Concave polygon collisions and full circular room containment use edges, not bounding-box collisions. Multiple-room union coverage is still conservative: a footprint must fit wholly within one room region.
- In Edit home choose a category and Shape. Click polygon vertices then Finish polygon; drag lines/rectangles. Select a shape to replace vertex coordinates or line thickness. Existing rectangles can be converted to editable polygons. Doors have an opening/clearance selector. Remove/confirm/calibrate/save work as before.
- Oversized extents, unusually thick walls/windows, large same-category bounding overlap, missing door clearance and walls through room interiors trigger review messages. These are heuristics, not automatic correction. Simple polygon structure and normalized coordinates are strictly checked. New flagged geometry needs explicit warning acknowledgement in addition to confirmation. Previously confirmed legacy rectangles retain behavior; warnings remain visible for review. Bounding overlap may intentionally overflag concave shapes.

Offline regression: `node --experimental-strip-types scripts/overlay-regression.mjs` reproduces `tests/fixtures/overlay-regression.svg` from the saved raw response and apartment image. `tests/fixtures/provenance.json` pins image/raw/converted hashes; tests compare every conversion and generated overlay. The existing request script names this image and both output files, and response values match the conversion exactly. **A request ID/image digest was not captured at recognition time, so historical same-request identity cannot be conclusively verified.** Current hashes pin the regression pair only. No provenance is invented.

### Phase B proposal — not implemented or authorized

Use this exact full-image SHA256 and a manually reviewed reference with separate room polygons, furniture polygons, wall/window centerlines, door openings/clearance. Freeze reference before scoring. Preserve raw outputs, model/prompt/settings, full-image/crop hashes, request IDs when available, usage and latency for each run.

A: existing full-image single-pass (1 call/run). B: same model, five category-specific full-image requests (5 calls/run); evaluate cropped recognition only as a separate optional arm with fixed crop bounds and exact crop-to-full transform (one call/category/crop). C: optional offline thresholding/line extraction to refine wall candidates, scored separately, never auto-confirmed. Keep model and image constant to isolate strategy. First stage: one run per arm; repeat only with approval (suggest three runs to quantify variability).

Measure per category: matched-instance precision/recall; furniture/room/clearance polygon IoU (target median >=0.70, report fraction >=0.50); wall/window endpoint and symmetric centerline error in source pixels (target median <=10px); wall thickness error; door-opening localization and clearance recall; room-obstacle inconsistency count. Also score false-clear/false-conflict rates on a fixed set of manually labeled plant placements and count/time manual corrections. Report totals and failures, not just averages. Compare total tokens, latency and quota usage. No scale inference; placement evaluation uses the same manual calibration.

A vs B pilot needs 6 new requests; reuse the archived A result as a historical baseline with zero calls, clearly marked non-contemporaneous. Crops add requests; classical refinement adds zero API requests. Free Tier quota may cover requests, but no monetary ceiling or tier can be guaranteed from code; review the project's quota/billing before approving. No paid fallback. No Phase B code or requests have been executed.

### Phase C journey integration

Quiz progress and cat/dog/other pet answers persist; existing profiles remain compatible. Dog/other pet safety remains explicitly unassessed. Editing a home from preview returns to that preview. Switching to Demo retains the uploaded plan for restoration. Geometry review hides labels by default, exposes selected-object controls, and filters layers without changing collision data. Recognition is marked Beta and remains explicit-click only. Discovery includes expandable source-backed species details. Clear means only clearance of mapped obstacles; unknown geometry stays Not verified.

Verification: 45 tests pass and production build passes. Browser QA used an isolated 127.0.0.1 origin to preserve localhost data: quiz refresh at question 2, full demo journey, two independently positioned Parlor palms, refresh persistence, Current/Mature collision transition, drag placement, manual apartment fixture with gray Not verified feedback, layer filtering/selection, and review→save→preview return. Narrow viewport checked at 390px with no horizontal document overflow. No Gemini requests were made.

Manual check: (1) In a fresh browser profile, complete or skip the four-question quiz, then save Demo Home. (2) Open plant details, preview a plant, drag it and compare Current/Mature; explicitly confirm adoption. (3) Add another of the same species, select/move each, then refresh to check independent records. (4) Edit home, upload a plan or load the manual apartment example, save without verification: preview must remain Not verified; Review home geometry opens editable overlays and Save home & return restores preview. Calibrate and confirm mapped rooms/obstacles before expecting Clear.

### Journey refinement · 2026-10-10

Rooted wordmark links home; breadcrumbs clarify stages. Personalization now has seven optional questions and persistent plant preference flashcards. Discover is a searchable list, with explicit custom-plant adoption for missing species (unknown footprint and facts). Home Setup separates basic choices, optional Beta recognition and geometry review; all original spatial tools remain available. Existing v2 records remain compatible. See `FEATURE_AUDIT.md` for the request-by-request audit and current limitations. Verification: 50 tests and production build pass; isolated browser QA preserved localhost data. No new API requests or dependencies.

### Start and workspace correction · 2026-10-10

Start is now the entry screen on open/refresh, including a short product introduction and an explicit Start/Continue action. Rooted and the Start breadcrumb return there. Completed homes offer a direct Plant workspace shortcut; My plants remains the owned-instance dashboard. Guided flow is Start → questions/cards → Home Setup → Plant workspace; independent catalog exploration is optional afterward. Restarting personalization retains existing plants/home and taste choices, resets completed question/card positions, and resumes unfinished positions.

Plant cards have a stacked deck, a reversible flip and directional like/pass exits. Choices save immediately; outgoing copies are inert and removed after animation. Reduced-motion preferences disable these transitions. Floor-plan upload opens the optional real Gemini recognition panel immediately. Existing uploaded plans also expose recognition in basic setup. Recognition remains mounted across tool tabs, runs only on explicit request, and successful recognition opens review/calibration. An always-visible Edit floor plan action is available in the plant workspace. No live Gemini request was made in this correction.

## GitHub Pages

`npm run build:pages` creates the static frontend for `/rooted/`. The deployment workflow runs on pushes to main or manually in Actions. In repository Settings → Pages, set Source to GitHub Actions, then run “Deploy Rooted to GitHub Pages”. Published URL: https://Neeeveee.github.io/rooted/ (also shown in the workflow deployment and Settings → Pages).

Pages does not run Node.js: Gemini recognition is disabled with an in-app explanation. Manual floor-plan upload/editing, calibration, preview, quiz and plant adoption remain browser-local. Data from localhost does not transfer to the Pages origin. No backend, API key or GitHub secret is required. Local `npm run dev` and `npm run build` retain their existing behavior and `/` base.

The Pages build excludes the entire public fixture directory to prevent publishing user floor plans. The local example is hidden on Pages. `.env.local` and credentials must never be committed or uploaded; `GEMINI_API_KEY` remains server-only and never receives a VITE_ prefix.

## Quiz review and returning users

Quiz answers are session-only drafts until the review screen's **Save preferences & continue** action succeeds. Review all seven answers and plant-card choices, edit an answer, or discard changes. Refresh discards unsaved quiz edits while retaining explicitly saved preferences, home and owned plants.

First visits open Welcome. After saving the quiz, returning users resume unfinished Home Setup or enter Plant workspace when their home is ready. **Restart Quiz** opens a fresh quiz draft for demos without deleting home or adoption data. Only a subsequent explicit Save replaces saved preferences.
