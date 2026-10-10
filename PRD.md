# Rooted — PRD v0.3 · Incremental Upgrade

**Status:** Implementation-ready specification for the *existing* Rooted v0.1 repository (`rootedv1.zip`), 2026-10-09.  
**Challenge:** Palantir Product Design Show & Tell — Lens A (working product).  
**Governing principle:** Evolve the existing application, **not** rebuild it. Preserve its working preview while restoring the original home-centered lifecycle journey.

## 1. Product definition

**Rooted is a home-centered plant companion**, enabling a resident to understand personal preferences, map their home, discover plants, preview placement and trade-offs, adopt a plant into their home, care for their individual plants, and retain lifecycle records when plants leave. The home map remains the primary workspace after onboarding.

**Experience promise:** *Discover a plant → imagine it in your home → bring it home → look after this specific plant over time.*

**Not a claim:** Rooted is not proven to be first-of-its-kind. Plant mapping, recommendations and care logs exist elsewhere; emphasize coherent use of household context across stages rather than asserting unprecedented features.

## 2. Existing implementation — preserve it

Verified in uploaded source:
- React + TypeScript + Vite application; `src/main.tsx`, `src/RoomPlan.tsx`, `src/PlantArt.tsx`, `src/model.ts`, `src/styles.css`.
- Three species (Monstera, snake plant, spider plant) in `src/model.ts`; current/mature illustrative diameter values and cat-safety metadata.
- SVG furnished room with 4.0 m × 3.6 m demo dimensions, selectable and movable single plant, mouse/keyboard placement.
- Circle-versus-rectangle overlap logic (`circleRect`) and `evaluate` in `src/model.ts` for furniture/door clearance, aesthetics, pet warning, and unknown light.
- Existing appearance and responsive styling as defined in `DESIGN.md`; local preview persistence under `rooted-preview-v1`.
- Existing geometry tests in `tests/model.test.ts`.

**Preservation rules:** Keep current preview geometry, text honesty, safety separation, PlantArt assets and overall design language; adapt APIs only as necessary. Avoid rewriting everything into a new framework.

## 3. User journey and navigation

**First visit:** Welcome → Quick Quiz → Home Setup → Discover → Preview → Confirm / Add to My Home → My Living Home.  
**Returning visit:** Open My Living Home directly → select owned plant → plant dossier, care events and history → discover or add another plant.  
**Later lifecycle:** Log symptoms/photo and optional notes → mark dead/removed → historical archive.  
**Future only:** AI diagnostic service and neighborhood/community visiting.

Users may **skip** onboarding questions, use a **predefined demo home**, and choose a species directly instead of accepting recommendations. No compulsory account creation.

## 4. Delivery phases and stop conditions

### Phase 1 — End-to-end first-use and adoption (P0, next Codex task)

P0-1. **Quick Quiz:** Four short questions: `style` (airy/jungle), `careTime` (low/moderate/high), `experience` (beginner/experienced), and `hasCat` (yes/no). Store all answers. Include Skip and Edit Preferences.

P0-2. **Home Setup:** Offer (a) current furnished demo bedroom for immediate experience; (b) optional user-uploaded floor-plan image as background. User can set known room width/height or use illustrative/unmeasured mode, and mark known light conditions for designated locations or mark Unknown. **Do not infer window geometry, light or furniture collisions from pixels in an uploaded photo.** Existing geometry is meaningful only in the calibrated demo room or for manually defined geometries. Keep background image in browser; show helpful error for image too large / storage unavailable. If implementation threatens P0 stability, ship demo home first, keep upload as P1.

P0-3. **Discover:** Expand curated catalog to approximately 6 species where supported with honest information. Provide Browse All and Personalized Picks. User quiz changes recommendation ordering with explainable deterministic rules; no AI claims. Pet-related hazards remain visible, never concealed by preference score. For unknown care/light attributes show Unknown rather than made-up values. A user can always manually select any plant.

P0-4. **Preview:** Reuse current SVG room and collision engine, Current/Mature illustrative footprint, style and pet-safety feedback. A preview plant is **not** an owned plant. Provide `Add to My Home` explicit confirmation.

P0-5. **Adoption:** Confirm creates a **new** owned plant `id` (UUID or robust fallback), with speciesId, location, adoptedAt, active status and empty events. Multiple instances of the same species must remain separate.

P0-6. **My Living Home:** After adoption, the home floor plan becomes the normal landing dashboard, with all active plant icons and clear selection of a specific plant. From there, navigate to its individual dossier, add another plant, or revisit Discover. The preview plant must never silently overwrite an adopted plant. Provide rename/edit location and remove or undo accidental placement as needed for basic usability.

**Phase 1 exit gate:** A first-time user can finish Quiz → choose demo or upload home → see changed recommendations → preview plant → adopt it → see it on the home map → refresh and still find the same plant. Two plants of identical species remain independent. All visible primary controls work. Existing preview collision tests still pass.

### Phase 2 — Care and lifecycle (P1, separate Codex task after P0 acceptance)

P1-1. Individual dossier: nickname, species, adoption date, current placement, optional photo, current status, chronological events.

P1-2. One-click **Watered** and **Fertilized** buttons append distinct timestamped care events on the selected owned-plant ID, with Undo last event. Never claim a fixed schedule is medically/scientifically precise; if displaying next check, label as generic reminder or user-configured, not automatic diagnosis.

P1-3. Health / observation events: user enters note, date, optionally adds compressed photo; save record and show timeline. If AI is not connected, label this a **journal / question draft**, not “AI diagnosis.” Photos subject to browser storage limits; graceful failure required.

P1-4. Mark deceased or moved out. Remove from *active* map, retain dossier/events in Archive; optional small memorial card with nickname/species/dates only. Provide reversible restore where sensible.

**Phase 2 exit gate:** Refresh preserves independent care histories; archived plants do not appear active; all archives remain viewable.

### Phase 3 — Only if time remains (P2)

Polish upload calibration / manually marked windows and furniture, improve catalog accuracy and recommendation explanations, enhance responsive navigation and onboarding transitions. No fake 3D, room image computer vision, or cloud sync.

### Excluded this challenge

Authentication, backend/database migration, AI image recognition/diagnosis, simulated bot replies, fabricated oxygen/mood/pest risk numbers, actual building-plan recognition, accurate sunlight simulation, social network/QQ Farm interactions, unsupported plant-care predictions.

## 5. Data architecture

Existing `State` in `src/model.ts` is single-preview-only and must not continue serving as the primary app record. Separate clearly:

```ts
type UserProfile = {
  style: 'airy' | 'jungle';
  careTime: 'low' | 'moderate' | 'high' | null;
  experience: 'beginner' | 'experienced' | null;
  hasCat: boolean;
  onboardingDone: boolean;
};
type Home = {
  id: string;
  name: string;
  mode: 'demo' | 'uploaded';
  widthM?: number; heightM?: number;
  backgroundImageDataUrl?: string; // optional, local only, storage-limited
  locations?: Array<{ id:string; label:string; light:'low'|'medium'|'bright'|'unknown' }>;
};
type PreviewSelection = { speciesId: string; x: number; y: number; sizeMode: 'current' | 'mature' };
type OwnedPlant = {
  id: string; speciesId: string; nickname?: string;
  homeId: string; x: number; y: number;
  adoptedAt: string; status: 'active' | 'deceased' | 'removed';
};
type PlantEvent = {
  id: string; plantId: string; timestamp: string;
  type: 'water' | 'fertilize' | 'observation' | 'health' | 'status';
  note?: string; photoDataUrl?: string;
};
type RootedStoreV2 = {
  version: 2;
  profile: UserProfile;
  homes: Home[];
  activeHomeId: string;
  ownedPlants: OwnedPlant[];
  events: PlantEvent[];
  preview: PreviewSelection;
};
```

Model is illustrative and may be adjusted to match the existing code with minimal complexity. All event IDs and plant IDs must be stable and independent. Store ISO timestamps with browser-local display. Keep species database data separate from an individual's records.

**Persistence:** Use a new versioned localStorage key (e.g. `rooted-app-v2`) with schema validation, robust parsing and safe defaults. Read `rooted-preview-v1` at first migration only to carry over style/cat preference and an optional *preview selection*; **never treat a preview plant as adopted**. Do not wipe legacy data automatically. Image storage can exceed localStorage quotas: warn and allow retry without photo.

## 6. Rules and truthfulness

- **Objective space conflict:** Existing measured demo geometry calculations. For uploaded image without manual calibration, say "Not assessed" rather than showing a fictitious clear result.
- **Taste:** `airy` / `jungle` influences preference messaging only, not safety or collision detection.
- **Pet safety:** use verified species facts with source URLs; uncertainty shown explicitly. Toxic is a safety warning, not a preference score.
- **Light:** user-marked illumination is self-reported and not actual lux. Window pixels alone are insufficient.
- **Care burden:** use clearly sourced qualitative species guidance; do not promise personal care schedules based only on a quiz.
- **Pest warnings:** condition-based (e.g. persistently wet potting mix), not “this species attracts gnats” or “put it by the window.”
- **Growth:** Current/Mature diameters are illustrative for visualization, NOT validated growth forecasts or age predictions.
- **No** oxygen coverage in m², happiness score, synthetic pest probabilities, invented time-to-death, or guaranteed diagnostic conclusions.

## 7. Visual and UX specification

`DESIGN.md` from the existing repository is authoritative and **unchanged**. Preserve editorial botanical style and layout language. Reinterpret the current 3-column preview as the **Preview stage**; the **post-adoption home map** becomes the main destination, without turning Rooted into an e-commerce catalog.

- Users can identify whether they are **Previewing** or **Living Home / Owned**.
- A clear progress / back mechanism appears in first-run onboarding; Save / Skip works.
- Clicking an owned plant opens the corresponding dossier without confusing it with a species catalog entry.
- Tooltips, feedback, and labels remain legible without relying only on glow or color.
- Responsive layout: prioritize desktop demo, preserve usable mobile controls.
- Do not add decorative controls without working actions.

## 8. Repository-level implementation guidance

- Reuse `src/model.ts` pure geometry functions and extend with separate app data/domain models; avoid circular dependencies.
- Reuse `src/RoomPlan.tsx` coordinates/rendering. Adapt to multiple owned plants; retain preview positioning and keyboard/mouse controls.
- Reuse `src/PlantArt.tsx` for catalog and dossier; preserve SVG art for existing species.
- Split `src/main.tsx` only when helpful for clarity: `Onboarding`, `HomeSetup`, `Discover`, `Preview`, `HomeDashboard`, `PlantDossier` can be simple local components without a routing library.
- Prefer lightweight pure recommendation function and local catalog. No external dependency needed for state management.
- Keep existing `tests/model.test.ts` and extend tests for recommendation preferences, data migration, independent IDs/events, and persistence/archiving.

## 9. Acceptance checklist

- [ ] First user can complete or skip 4-question onboarding.
- [ ] User preferences persist and visibly change recommendation order/rationale.
- [ ] User can choose demo home; optional uploaded background is honestly labelled if not measurable.
- [ ] Current preview interactions still work (geometry, size modes, taste, cat, unknown light).
- [ ] Previewing never silently creates or modifies an owned plant.
- [ ] Confirming adoption creates an independent owned plant and adds it to home map.
- [ ] Two plants of the same species can exist, move, and be selected separately.
- [ ] Reload preserves home/profile/adoptions; corrupted storage does not crash.
- [ ] Existing automated geometry tests pass; production build succeeds.
- [ ] Phase 2: one-click care logs are linked to the correct plant and persist.
- [ ] Phase 2: health notes/photos are stored or fail gracefully; no fake AI advice.
- [ ] Phase 2: deceased/removed plants leave active map but remain in archive.
- [ ] Primary buttons produce real, visible results and there are no broken navigation paths.

## 10. Delivery/time discipline

Challenge has a **3-hour work limit**. Treat it as the overall permitted effort, subject to official wording; a Codex usage/reset window is a separate account quota, not an extension of the challenge. Budget must account for development, debugging, deployment and demo deliverables as applicable. Maintain working milestones and stop adding features if deployment and verification are at risk.

**Implementation request sequence:**
1. Codex Task 1: Phase 1 only, run tests/build and give reproducible demo steps.
2. User independently verifies flow, reports a single consolidated bug list.
3. Codex Task 2: Phase 2 only after Phase 1 acceptance and time remaining.
4. Final: deploy, test public URL, capture <=3-minute video explaining problem, choices, implementation and AI usage; submit according to official challenge email.

**Important:** Because this is an upgrade, do not reset the repository and do not delete already working interactions. Keep a Git commit/backup before changes.
