export type Species = {
  id: string; name: string; scientificName: string; form: string;
  care?: 'low' | 'moderate'; careSource?: string; lowLight?: boolean;
  current: number; mature: number; catSafety: 'toxic' | 'non-toxic' | 'unknown'; source?: string;
};
const sourceRoot = 'https://www.aspca.org/pet-care/aspca-poison-control/toxic-and-non-toxic-plants/';
// Size values are demo assumptions, not species growth predictions.
// Cat safety checked against the individual ASPCA species pages on 2026-10-09.
export const species: Species[] = [
  { id: 'monstera', name: 'Monstera', scientificName: 'Monstera deliciosa', form: 'Broad & sculptural', care: 'moderate', careSource: 'https://plants.ces.ncsu.edu/plants/monstera-deliciosa/', current: 0.6, mature: 1.4, catSafety: 'toxic', source: sourceRoot + 'ceriman' },
  { id: 'snake', name: 'Snake plant', scientificName: 'Sansevieria trifasciata', form: 'Upright & architectural', care: 'low', lowLight: true, careSource: 'https://plants.ces.ncsu.edu/plants/dracaena-trifasciata/', current: 0.35, mature: 0.6, catSafety: 'toxic', source: sourceRoot + 'snake-plant' },
  { id: 'spider', name: 'Spider plant', scientificName: 'Chlorophytum comosum', form: 'Soft & arching', care: 'low', careSource: 'https://www.rhs.org.uk/plants/spider-plants/growing-guide', current: 0.45, mature: 0.85, catSafety: 'non-toxic', source: sourceRoot + 'spider-plant' },
  { id: 'palm', name: 'Parlor palm', scientificName: 'Chamaedorea elegans', form: 'Feathery & upright', current: 0.5, mature: 1.0, catSafety: 'non-toxic', source: sourceRoot + 'parlor-palm', care: 'low', lowLight: true, careSource: 'https://plants.ces.ncsu.edu/plants/chamaedorea-elegans/' },
  { id: 'castiron', name: 'Cast iron plant', scientificName: 'Aspidistra elatior', form: 'Broad & upright', current: 0.45, mature: 0.9, catSafety: 'non-toxic', source: sourceRoot + 'cast-iron-plant', care: 'low', lowLight: true, careSource: 'https://plants.ces.ncsu.edu/plants/aspidistra-elatior/' },
  { id: 'peperomia', name: 'Baby rubber plant', scientificName: 'Peperomia obtusifolia', form: 'Rounded & compact', current: 0.3, mature: 0.5, catSafety: 'non-toxic', source: sourceRoot + 'baby-rubber-plant', care: 'low', careSource: 'https://plants.ces.ncsu.edu/plants/peperomia-obtusifolia/' },
];
export type Rect = { id: string; label: string; x: number; y: number; width: number; height: number };
export const room = {
  width: 4, height: 3.6,
  furniture: [
    { id: 'bed', label: 'bed', x: 0.32, y: 0.42, width: 1.55, height: 2.05 },
    { id: 'bedside', label: 'bedside table', x: 1.99, y: 0.46, width: 0.45, height: 0.45 },
    { id: 'dresser', label: 'dresser', x: 3.43, y: 0.35, width: 0.55, height: 1.35 },
  ] satisfies Rect[],
  clearance: { id: 'door', label: 'door-clear zone', x: 2.8, y: 2.5, width: 1.2, height: 1.1 } satisfies Rect,
};
export type State = { speciesId: string; plantId: string; x: number; y: number; mode: 'current' | 'mature'; style: 'airy' | 'jungle'; hasCat: boolean };
export const defaults: State = { speciesId: 'monstera', plantId: 'plant-1', x: 2.48, y: 2.87, mode: 'current', style: 'airy', hasCat: false };
export const storageKey = 'rooted-preview-v1';
export function parseState(raw: string | null): State {
  try {
    const s = JSON.parse(raw ?? 'null');
    if (!s || !species.some(p => p.id === s.speciesId) || !Number.isFinite(s.x) || !Number.isFinite(s.y)
      || s.x < 0 || s.x > room.width || s.y < 0 || s.y > room.height
      || !['current', 'mature'].includes(s.mode) || !['airy', 'jungle'].includes(s.style) || typeof s.hasCat !== 'boolean') return { ...defaults };
    return { speciesId: s.speciesId, plantId: 'plant-1', x: s.x, y: s.y, mode: s.mode, style: s.style, hasCat: s.hasCat };
  } catch { return { ...defaults }; }
}
export function circleRect(x: number, y: number, radius: number, rect: Rect): boolean {
  const dx = x - Math.max(rect.x, Math.min(x, rect.x + rect.width));
  const dy = y - Math.max(rect.y, Math.min(y, rect.y + rect.height));
  return dx * dx + dy * dy < radius * radius;
}
export function moveTo(x: number, y: number) {
  return { x: Math.max(0, Math.min(room.width, x)), y: Math.max(0, Math.min(room.height, y)) };
}
export type Evaluation = { hardConflicts: string[]; conditionalWarnings: string[]; preferenceNotes: string[]; unknowns: string[]; overlapIds: string[] };
export function evaluate(state: State): Evaluation {
  const plant = species.find(p => p.id === state.speciesId)!;
  const radius = plant[state.mode] / 2;
  const overlapIds = [...room.furniture, room.clearance].filter(r => circleRect(state.x, state.y, radius, r)).map(r => r.id);
  const hardConflicts = [];
  if (overlapIds.includes('door')) hardConflicts.push('May obstruct access at this size. Move the footprint out of the door-clear zone.');
  for (const item of room.furniture) if (overlapIds.includes(item.id)) hardConflicts.push(`May overlap the ${item.label}. Give the footprint more room.`);
  if (state.x - radius < 0 || state.x + radius > room.width || state.y - radius < 0 || state.y + radius > room.height) hardConflicts.push('Footprint extends beyond the room. Move it away from the wall.');
  const conditionalWarnings = state.hasCat && plant.catSafety === 'toxic' ? [`${plant.name} is toxic to cats. Choose a non-toxic species for a home with a cat.`] : [];
  const large = plant[state.mode] >= 1;
  const preferenceNotes = [state.style === 'airy'
    ? large ? 'May look visually dense. A smaller footprint would leave more breathing room.' : 'A little green, with room to breathe. This footprint suits your airy preference.'
    : large ? 'May suit your dense greenery preference. A lush statement for your room.' : 'A gentle start to your urban jungle. This footprint adds a compact touch of green.'];
  const unknowns = ['Light suitability has not been verified. A window alone cannot tell us enough.'];
  if (state.hasCat && plant.catSafety === 'unknown') unknowns.push('Cat safety is unknown for this species.');
  return { hardConflicts, conditionalWarnings, preferenceNotes, unknowns, overlapIds };
}
