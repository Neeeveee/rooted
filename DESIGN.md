# Rooted — DESIGN.md

**Version:** v0.2 · Editorial Botanical × Spatial Intelligence  
**Status:** approved direction based on two user-provided visual references: (1) white, high-end editorial botanical product page; (2) muted-green plant app UI kit with Poppins and clear components.  
**Read alongside:** `PRD.md` (product scope) and `AGENTS.md` (engineering constraints). If a visual choice conflicts with MVP functionality, keep the functionality.

## 1. Design thesis

**Borrow the visual atmosphere of reference 1 and the interface discipline of reference 2.** Aim for ~70% botanical editorial / interior-design publication, ~30% functional plant-app UI.

Rooted should feel like **an elegant home-and-plants spatial tool**, not a plant store, admin dashboard, gardening game, or decorative landing page. The primary visual is a **usable overhead home plan**. Every plant placement and Current/Mature toggle must produce a meaningful, accurate response.

**Keywords:** editorial minimalism; warm, airy whitespace; premium botanical imagery; architectural precision; grounded information; calm interactions.

**Avoid:** thick green page backgrounds; uniform card grids everywhere; giant ecommerce hero that displaces the map; cart/favorite/checkout UI; noisy gradients; cartoon plants; gamified confetti; glassmorphism; made-up environmental heat maps.

## 2. Art direction from the two references

### Reference 1 — visual identity (dominant)
- Use plentiful near-white negative space and subtle architectural lines.
- Make plant silhouettes and the room plan the visual protagonists.
- Editorial serif typography for wordmark, page heading and one short explanatory statement.
- Asymmetric, airy composition rather than tightly packed cards.
- Product photography *style* is allowed, but do not depend on downloading or generating elaborate assets; simple plant silhouettes will suffice for MVP.
- **Do not copy its ecommerce product-purchase layout.**

### Reference 2 — UI system (supporting)
- Forest green, muted moss, and sage used consistently for actions, active selections, and noncritical emphasis.
- Clean sans-serif UI type for all controls, microcopy, dimensions, assessments, and cards.
- Predictable component states, subtle borders, compact cards and readable labels.
- Soft, minimal radii. **Do not recreate its mobile shopping navigation.**

## 3. Design tokens (implement as CSS variables)

| Variable | Value | Purpose |
|---|---|---|
| `--bg` | `#F9F9F6` | Main near-white background; generous open space |
| `--surface` | `#FFFFFF` | Panels and cards |
| `--surface-alt` | `#F0F2EC` | Subtle wells / selected area |
| `--forest` | `#253528` | Primary typography and strongest CTA |
| `--moss` | `#49654E` | Interactive green / active control |
| `--sage` | `#8BA889` | Secondary accents |
| `--sage-pale` | `#E5E9DF` | Low-contrast active background |
| `--muted` | `#68716B` | Supporting text |
| `--line` | `#D8DED5` | Borders and grid/plan separators |
| `--amber` | `#A66C29` | Caution (with text + icon) |
| `--terracotta` | `#B96A5D` | Verified safety/hard spatial conflict |
| `--unknown` | `#697783` | Unknown/insufficient evidence |

**Color allocation:** roughly 75–85% neutral/white, 10–20% subtle warm-gray surfaces, <10% saturated green and risk colors. Do not cover the entire page in sage. All essential meaning must be available through labels/shapes/icons, not color alone.

### Typography
- Display title / section headlines: **serif**, e.g. `Georgia, 'Times New Roman', serif` using locally available fonts. High contrast, confident but restrained; avoid oversized headings on functional screens.
- Controls, body, captions, scores: **sans-serif**: `'Poppins', 'Inter', system-ui, -apple-system, sans-serif` as a fallback stack. Do not assume Poppins is installed; prefer system fallback over adding a network font dependency.
- Desktop wordmark 25–30px, display headline 26–36px, section heading 18–22px; interface body 14–16px, captions 12–13px with adequate contrast.
- Use restrained letter spacing, sentence case, brief editorial copy.

### UI geometry
- Panels radius 10–12px; controls 7–9px; no pill-button overload.
- Borders 1px muted green-gray; lightweight shadows only when needed.
- Spacing scale 4 / 8 / 12 / 16 / 24 / 32px; comfortable vertical rhythm.
- Iconography: consistent thin-line icons or simple CSS/SVG, not multicolor emoji as main interface icons.
- Hover, selected, focus-visible and disabled states must be legible.

## 4. Main application layout: the room plan is the hero

**Target viewport:** 1440 × 900, functional from 1280 × 720. One-screen working interface, not an ecommerce landing page.

```text
┌────────────────────────────────────────────────────────────────────┐
│ Rooted [serif]       Plants in their place           Reset / Help  │
├───────────────┬───────────────────────────┬────────────────────────┤
│ Plant library │    YOUR SPACE            │ HOME IMPACT            │
│               │   [Current | Mature]      │                        │
│ species 1     │                           │ Space                  │
│ species 2     │    LARGE 2D ROOM PLAN     │ Safety                 │
│ species 3     │ furniture • door • window │ Living with it         │
│               │       ↕ drag plant        │ Known / unknown        │
│ short notes   │                           │                        │
├───────────────┴───────────────────────────┴────────────────────────┤
│ Contextual explanation / source or limitation note               │
└────────────────────────────────────────────────────────────────────┘
```

- **Header (56–72px):** serif Rooted wordmark, one short descriptor; small unobtrusive Reset. Do not add dead navigation links or shopping icons.
- **Left (230–260px):** three species, selected state, compact plant silhouette and metadata. Editorial breathing room instead of marketplace product tiles.
- **Center (minimum 50% available width):** warm-white SVG room plan, furniture, clearly shown window and door zone, movable plant, footprint layers. This is the most visually prominent area.
- **Right (270–330px):** Home Impact with concise Space / Light / Safety / Lifestyle notes; user preferences (Airy vs Urban Jungle; cat present) visibly tied to output.
- Keep at least one meaningful visual transformation above the fold without scrolling.
- Narrow screens: stack plant selector → canvas → impact; offer click-to-place when drag is impractical.

## 5. Architectural plan and botanical illustration

- Use a calm 2D architectural overhead drawing, not a fake photograph of an apartment.
- Walls: crisp dark green-gray outlines. Furniture: subdued taupe/light-gray fills. Window: subtly cool line accent. Door/clearance area: restrained dashed/hatch notation.
- Plant: distinctive dark-green **botanical silhouette**, legible even at 32–48px; each species can have a minimal different shape (broad-leaf / upright / arching) using inline SVG.
- Selected plant: fine selection ring and a soft semi-transparent footprint. Its radius or dimensions must be derived from the **same values used by the collision algorithm**.
- Current/Mature switch changes **both** footprint rendering and live collision/impact messaging. A 150–220ms transition is optional, and must respect `prefers-reduced-motion`.
- A faint overlay/ring may indicate selection or assessed footprint. **Never imply literal oxygen radius, mood radius, pest radius, simulated CO₂, or accurate solar exposure.**
- No exact claims about mature size or plant health unless vetted; if size is demo data, label it clearly.

## 6. Impact visualization: precise, not pseudo-scientific

Four states, always accompanied by a short textual reason:

1. **Compatible** — moss green, check, when the limited known conditions support it.
2. **Caution** — amber, outlined alert, for a potential/conditional issue.
3. **Conflict** — terracotta, high-contrast outline/icon, for true geometry overlap or verified safety concern.
4. **Unknown** — blue-gray, `?`/info, when home measurements or evidence are missing.

Separate **subjective style** from **objective constraints**:
- `Airy` vs `Urban Jungle` may change the description of visual density; neither can suppress safety warnings.
- A plant may look beautiful in a crowded room while still overlapping required clearance.
- Lack of measured light is `Unknown`, not `Safe` or `Unsafe`.
- Never invent numerical oxygen output, air purification coverage, emotional uplift percentages, or pest likelihood.

## 7. Component specification

| Component | Visual behavior | Working behavior |
|---|---|---|
| Species option | airy row, botanical mini silhouette, thin selected border/moss highlight | selects the actual species and footprint values |
| Room canvas | dominant light area, precise thin geometry | click to place; pointer drag if supported; map coords correct under scaling |
| Current/Mature | small segmented green-neutral switch | updates footprints and checks instantly |
| User preferences | compact visible segmented control / labeled toggle | updates subjective copy and cat safety feedback |
| Impact panel | 3–4 short entries, line/icon/status | reflects *current* selected plant and placement |
| Reset | minimal outline/text button | restores controls, location and evaluations |

No fake CTA, mocked checkout, chat button, social feed, nonworking navigation, or filler charts.

## 8. Microcopy

**Voice:** concise, editorial, helpful; explain the observation before giving advice. Never shame user preferences.

- Good: `You like a lush room. That's a style choice—not a hazard.`
- Good: `At its illustrative mature width, this plant overlaps the door-clear zone.`
- Good: `Light at this location hasn't been measured.`
- Good: `This species may be unsafe around cats. See the source before deciding.`
- Avoid: `Generates oxygen for 8 square metres.`
- Avoid: `Will make you 30% happier.`
- Avoid: `This plant will definitely die in this room.`

## 9. Build order / scope discipline

1. First implement a **functioning** spacious 3-column layout and room canvas using the tokens above.
2. Connect plant selection, placement, footprint state, and real collision calculation.
3. Wire preferences and factual/unknown impact messages.
4. Add accessible styling and responsive behavior.
5. Only if there is time, polish subtle transitions or species silhouette illustrations.

Prioritize reliability and demo performance over decoration. **Do not create a landing page first. Do not add photography or font packages as prerequisites.** No additional pages unless explicitly demanded by `PRD.md`.

## 10. Visual acceptance checklist

- [ ] Feels more like a premium botanical editorial design tool than an ecommerce plant shop.
- [ ] Room canvas clearly dominates; UI remains legible and operable at 1280 × 720.
- [ ] Near-white canvas + dark forest type + sparse muted green accents; no green-filled entire screen.
- [ ] Serif headings and sans-serif UI have clear roles.
- [ ] Botanical silhouettes distinguish species, without requiring external images.
- [ ] Plant motion, footprint and assessment are driven by the same actual app state and measurements.
- [ ] The user can perceive why the feedback changed after moving or resizing the plant.
- [ ] Warnings have labels, appropriate evidence state and usable contrast.
- [ ] No unsupported oxygen, mood, pest or lighting numerical claims.
- [ ] No dead controls, shopping cart, community or extra unfinished flows.
