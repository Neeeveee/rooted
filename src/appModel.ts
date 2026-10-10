import { validShape, regionHit, trusted, shapeBounds } from './spatial.ts';
import type { Shape } from './spatial.ts';
import { validImport } from './floorplanImport.ts';
import type { GeometryImport } from './floorplanImport.ts';
import { defaults, evaluate, parseState, species, storageKey } from './model.ts';
import type { State } from './model.ts';

export type Profile = {
  style: 'airy' | 'jungle'; careTime: 'low' | 'moderate' | 'high' | null;
  experience: 'beginner' | 'experienced' | null; hasCat: boolean; onboardingDone: boolean; quizStep?: number; pets?: 'none' | 'cat' | 'dog' | 'both' | 'other';
  spacePreference?: 'compact' | 'statement'; formPreference?: 'broad' | 'upright' | 'soft'; routine?: 'home' | 'away' | 'variable'; likedSpecies?: string[]; passedSpecies?: string[]; plantCardIndex?: number;
};
export type Region = { id: string; label: string; kind: 'room' | 'wall' | 'door' | 'window' | 'furniture' | 'unknown'; x: number; y: number; width: number; height: number; confirmed: boolean; shape?: Shape; doorRole?: 'opening' | 'clearance'; reviewed?: boolean };
export type Calibration = { a: [number, number]; b: [number, number]; meters: number; aspect: number };
export function calibratedSize(c: Calibration) {
  const distance = Math.hypot((c.b[0] - c.a[0]) * c.aspect, c.b[1] - c.a[1]);
  if (!Number.isFinite(distance) || distance < .001 || !Number.isFinite(c.meters) || c.meters <= 0 || !Number.isFinite(c.aspect) || c.aspect <= 0) return null;
  const height = c.meters / distance;
  return { width: height * c.aspect, height };
}
export const isCalibrated = (home: Home) => home.mode === 'demo' || !!(home.calibration && calibratedSize(home.calibration));
export const geometryReady = (home: Home) => home.mode === 'demo' || !!(isCalibrated(home) && home.geometryVerified && home.regions?.some(r => r.kind === 'room' && trusted(r, home.regions ?? [])) && home.regions.every(r => trusted(r, home.regions ?? []) || r.kind === 'unknown'));
export function verificationNeeds(home: Home) {
  const regions = home.regions ?? [];
  const scale = !isCalibrated(home);
  const room = !regions.some(r => r.kind === 'room' && trusted(r, regions));
  const pending = regions.filter(r => r.kind !== 'unknown' && !trusted(r, regions));
  return { scale, room, pending, ready: !scale && !room && !pending.length };
}
export function potentialOverlaps(state: State, home: Home) {
  if(home.mode!=='uploaded'||state.speciesId==='custom')return [];
  const size=bounds(home), calibrated=isCalibrated(home);
  const radius=calibrated?(species.find(s=>s.id===state.speciesId)?.[state.mode]??0)/2:1e-9;
  return (home.regions??[]).filter(r=>['furniture','wall','door'].includes(r.kind)&&r.doorRole!=='opening'&&(!calibrated||!trusted(r,home.regions??[]))&&regionHit(r,[state.x,state.y],radius,size.width,size.height));
}
export function placementExplanation(state: State, home: Home) {
  if (home.mode !== 'uploaded') return '';
  const size = bounds(home);
  const underMarker = (home.regions ?? []).filter(r => ['furniture','wall','door'].includes(r.kind) && r.doorRole !== 'opening' && regionHit(r, [state.x,state.y], 1e-9, size.width,size.height));
  const marker = underMarker.length ? `Marker lies on mapped ${underMarker.map(r=>r.label).join(', ')}. ` : '';
  if (!isCalibrated(home)) return marker + 'Scale is unknown: this marker is not a measured plant footprint. Calibrate scale in Review & calibrate to check overlaps.';
  if (underMarker.some(r=>!trusted(r,home.regions??[]))) return marker + 'This geometry still needs confirmation. Review the selected objects before relying on collision feedback.';
  return 'Placement is not verified here. Confirm rooms and obstacles, finish verification, and keep the footprint inside a confirmed room.';
}
export type Home = {
  id: string; name: string; mode: 'demo' | 'uploaded'; ready: boolean;
  savedUploadedPlan?: Omit<Home, 'savedUploadedPlan'>;
  widthM?: number; heightM?: number; backgroundImageDataUrl?: string;
  geometryImport?: GeometryImport;
  calibration?: Calibration; regions?: Region[]; geometryVerified?: boolean;
  light: 'low' | 'medium' | 'bright' | 'unknown'; lightLocation: string;
};
export function switchHomeMode(home:Home, mode:Home['mode']):Home {
  if(home.mode===mode)return home;
  if(mode==='uploaded'){const saved=home.savedUploadedPlan;return {...home,...saved,mode,savedUploadedPlan:undefined,widthM:saved?.widthM,heightM:saved?.heightM};}
  const {savedUploadedPlan: _cached,...uploaded}=home;
  return {...home,mode,savedUploadedPlan:uploaded,widthM:4,heightM:3.6,backgroundImageDataUrl:undefined,geometryImport:undefined,calibration:undefined,regions:undefined,geometryVerified:undefined};
}
export type OwnedPlant = {
  id: string; speciesId: string; customName?: string; nickname: string; homeId: string;
  x: number; y: number; adoptedAt: string; status: 'active'; events: never[];
};
export type Store = { version: 2; profile: Profile; home: Home; preview: State; ownedPlants: OwnedPlant[] };
export const appKey = 'rooted-app-v2';
export const demoHome: Home = { id: 'home-1', name: 'My bedroom', mode: 'demo', ready: false, widthM: 4, heightM: 3.6, light: 'unknown', lightLocation: 'Room overall' };
export function freshStore(legacy: string | null = null): Store {
  const preview = parseState(legacy);
  return { version: 2, profile: { style: preview.style, careTime: null, experience: null, hasCat: preview.hasCat, onboardingDone: false }, home: { ...demoHome }, preview, ownedPlants: [] };
}
export function bounds(home: Home) { return { width: home.widthM ?? 4, height: home.heightM ?? 3.6 }; }
export function clampPosition(home: Home, x: number, y: number) {
  const { width, height } = bounds(home);
  return { x: Math.max(0, Math.min(width, x)), y: Math.max(0, Math.min(height, y)) };
}
export function changeHome(store: Store, home: Home): Store {
  // Retain relative positions when changing the manually entered bounds.
  const old = bounds(store.home), next = bounds(home);
  const position = (p: { x: number; y: number }) => ({ x: p.x / old.width * next.width, y: p.y / old.height * next.height });
  return { ...store, home, preview: { ...store.preview, ...position(store.preview) }, ownedPlants: store.ownedPlants.map(p => ({ ...p, ...position(p) })) };
}
export function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `plant-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
export function adopt(store: Store, nickname: string, date = new Date().toISOString(), id = uid()): Store {
  if (store.ownedPlants.some(p => p.id === id)) throw new Error('Duplicate plant ID');
  const p = store.preview;
  const owned: OwnedPlant = { id, speciesId: p.speciesId, nickname: nickname.trim().slice(0, 60) || species.find(s => s.id === p.speciesId)!.name, homeId: store.home.id, x: p.x, y: p.y, adoptedAt: date, status: 'active', events: [] };
  return { ...store, ownedPlants: [...store.ownedPlants, owned] };
}
export function adoptCustom(store: Store, name: string, date = new Date().toISOString(), id = uid()): Store {
  const clean = name.trim().slice(0,60);
  if (!clean || store.ownedPlants.some(p=>p.id===id)) throw new Error('A plant name and unique ID are required.');
  return {...store, ownedPlants:[...store.ownedPlants,{id,speciesId:'custom',customName:clean,nickname:clean,homeId:store.home.id,...clampPosition(store.home,store.preview.x,store.preview.y),adoptedAt:date,status:'active',events:[]}]};
}
export function editPlant(store: Store, id: string, patch: Partial<Pick<OwnedPlant, 'nickname' | 'x' | 'y'>>): Store {
  return { ...store, ownedPlants: store.ownedPlants.map(p => p.id === id ? { ...p, ...patch, ...clampPosition(store.home, patch.x ?? p.x, patch.y ?? p.y) } : p) };
}
export function assessment(state: State, home: Home) {
  if (state.speciesId === 'custom') return {hardConflicts:[],conditionalWarnings:[],preferenceNotes:[],unknowns:['Custom plant: species, footprint, care, light and pet safety are unverified.'],overlapIds:[],spaceStatus:'unknown' as const};
  const result = evaluate(state);
  let spaceStatus: 'unknown' | 'clear' | 'conflict' = 'clear';
  if (home.mode === 'uploaded') {
    result.hardConflicts = []; result.overlapIds = []; spaceStatus = 'unknown';
    result.unknowns.push('Uploaded geometry not assessed until scale and regions are verified.');
    if (isCalibrated(home)) {
      const size = bounds(home), r = species.find(p => p.id === state.speciesId)![state.mode] / 2;
      const overlaps = (region: Region) => regionHit(region, [state.x,state.y], r, size.width,size.height);
      const contains = (region: Region) => regionHit(region, [state.x,state.y], r, size.width,size.height,true);
      for (const region of home.regions ?? []) {
        if (trusted(region, home.regions ?? []) && region.doorRole !== 'opening' && ['wall', 'door', 'furniture'].includes(region.kind) && overlaps(region)) {
          result.overlapIds.push(region.id); result.hardConflicts.push(`Overlaps confirmed ${region.kind === 'door' ? 'door-clearance zone' : region.kind}: ${region.label}.`);
        }
      }
      if (geometryReady(home)) {
        const rooms = home.regions!.filter(q => trusted(q, home.regions ?? []) && q.kind === 'room');
        const inside = rooms.some(contains);
        const unknown = home.regions!.some(q => (q.kind === 'unknown' || !trusted(q, home.regions ?? [])) && overlaps(q));
        if (inside && !unknown) spaceStatus = 'clear';
        else result.unknowns.push('Footprint reaches outside a confirmed room or intersects an uncertain / unknown area.');
      }
    }
  }
  if (result.hardConflicts.length) spaceStatus = 'conflict';
  if (home.light !== 'unknown') result.unknowns[0] = `${home.lightLocation}: ${home.light} light, self-reported. Suitability at this plant’s position has not been verified.`;
  return { ...result, spaceStatus };
}
export function recommend(profile: Profile, home: Home) {
  return species.map((plant, index) => {
    let score = 0; const reasons: string[] = [];
    const styleMatch = profile.style === 'airy' ? plant.mature < 1 : plant.mature >= 1;
    if (styleMatch) { score += 2; reasons.push(profile.style === 'airy' ? 'A compact demo spread for your airy taste.' : 'A larger demo spread for your lush-room taste.'); }
    if (profile.careTime === 'low' && plant.care === 'low') { score += 3; reasons.push('Lower-maintenance guidance suits your limited care time.'); }
    if ((profile.careTime === 'moderate' || profile.careTime === 'high') && plant.care === 'moderate') { score += 3; reasons.push('Your available care time leaves room for moderate maintenance.'); }
    if (profile.experience === 'beginner' && plant.care === 'low') { score += 2; reasons.push('We prioritize lower maintenance for a first plant.'); }
    if (profile.experience === 'experienced' && plant.care === 'moderate') { score += 1; reasons.push('Your experience makes moderate maintenance worth considering.'); }
    if (home.light === 'low' && plant.lowLight) { score += 2; reasons.push('Source notes tolerance of lower light; your observation still needs checking.'); }
    if (home.widthM && home.heightM && plant.mature < Math.min(home.widthM, home.heightM) / 4) { score += 1; reasons.push('A smaller illustrative footprint relative to your room bounds.'); }
    if (profile.spacePreference === 'compact' && plant.mature < 1 || profile.spacePreference === 'statement' && plant.mature >= 1) {score += 2; reasons.unshift('Matches the plant scale you prefer.');}
    const forms: Record<string,string[]> = {broad:['monstera','castiron','peperomia'],upright:['snake'],soft:['spider','palm']};
    if(profile.formPreference && forms[profile.formPreference].includes(plant.id)){score += 2; reasons.unshift('Matches your preferred leaf silhouette.');}
    if(profile.likedSpecies?.includes(plant.id)){score += 4; reasons.unshift('You liked this plant in your discovery cards.');}
    if(profile.passedSpecies?.includes(plant.id)){score -= 2; reasons.push('You passed on this silhouette; it remains available.');}
    if (!reasons.length) reasons.push('Another option to explore; no strong match from the answers available.');
    // Safety is a separate ordering tier, never offset by a taste score.
    const safetyTier = profile.hasCat ? plant.catSafety === 'non-toxic' ? 0 : plant.catSafety === 'unknown' ? 1 : 2 : 0;
    return { plant, reasons, score, safetyTier, index };
  }).sort((a, b) => a.safetyTier - b.safetyTier || b.score - a.score || a.index - b.index);
}

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 100): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
const oneOf = (v: unknown, values: unknown[]) => values.includes(v);
const dimension = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 50;
const speciesId = (v: unknown) => species.some(s => s.id === v);
export function parseStore(raw: string): Store | null {
  try {
    const s: unknown = JSON.parse(raw);
    if (!record(s) || s.version !== 2 || !record(s.profile) || !record(s.home) || !record(s.preview) || !Array.isArray(s.ownedPlants)) return null;
    const p = s.profile, h = s.home, v = s.preview;
    if (!oneOf(p.style, ['airy', 'jungle']) || !oneOf(p.careTime, [null, 'low', 'moderate', 'high']) || !oneOf(p.experience, [null, 'beginner', 'experienced']) || typeof p.hasCat !== 'boolean' || typeof p.onboardingDone !== 'boolean') return null;
    if (p.quizStep !== undefined && (!Number.isInteger(p.quizStep) || Number(p.quizStep)<0 || Number(p.quizStep)>7)) return null;
    if (p.pets !== undefined && !oneOf(p.pets,['none','cat','dog','both','other'])) return null;
    for(const [key,values] of Object.entries({spacePreference:['compact','statement'],formPreference:['broad','upright','soft'],routine:['home','away','variable']})) if(p[key]!==undefined&&!oneOf(p[key],values))return null;
    for(const key of ['likedSpecies','passedSpecies']) if(p[key]!==undefined&&(!Array.isArray(p[key])||p[key].length>species.length||!p[key].every(speciesId)||new Set(p[key]).size!==p[key].length))return null;
    if(p.plantCardIndex!==undefined&&(!Number.isInteger(p.plantCardIndex)||Number(p.plantCardIndex)<0||Number(p.plantCardIndex)>=species.length))return null;
    if (h.savedUploadedPlan !== undefined) {
      const cached=h.savedUploadedPlan;
      if(!record(cached)||cached.mode!=='uploaded'||cached.savedUploadedPlan!==undefined||!parseStore(JSON.stringify({...s,home:cached,ownedPlants:[],preview:{...v,x:0,y:0}})))return null;
    }
    if (!text(h.id) || !text(h.name, 60) || !oneOf(h.mode, ['demo', 'uploaded']) || typeof h.ready !== 'boolean' || !oneOf(h.light, ['low', 'medium', 'bright', 'unknown']) || !text(h.lightLocation, 60)) return null;
    if ((h.widthM !== undefined || h.heightM !== undefined) && (!dimension(h.widthM) || !dimension(h.heightM))) return null;
    if (h.mode === 'demo' && (h.widthM !== 4 || h.heightM !== 3.6)) return null;
    if (h.backgroundImageDataUrl !== undefined && (typeof h.backgroundImageDataUrl !== 'string' || h.backgroundImageDataUrl.length > 1500000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(h.backgroundImageDataUrl))) return null;
    if (h.geometryImport !== undefined && !validImport(h.geometryImport)) return null;
    if (h.geometryVerified !== undefined && typeof h.geometryVerified !== 'boolean') return null;
    if (h.regions !== undefined) {
      if (!Array.isArray(h.regions) || h.regions.length > 200) return null;
      const regionIds = new Set();
      for (const r of h.regions) {
        if (!record(r) || !text(r.id) || regionIds.has(r.id) || !text(r.label, 60) || !oneOf(r.kind, ['room', 'wall', 'door', 'window', 'furniture', 'unknown']) || typeof r.confirmed !== 'boolean') return null;
        if (!validShape(r as unknown as Region)) return null;
        if (!r.shape && !['x', 'y', 'width', 'height'].every(k => typeof r[k] === 'number' && Number.isFinite(r[k]) && (r[k] as number) >= 0 && (r[k] as number) <= 1)  ) return null;
        if (r.shape) Object.assign(r, shapeBounds((r as unknown as Region).shape!.points));
        regionIds.add(r.id);
      }
    }
    if (h.calibration !== undefined) {
      const c = h.calibration;
      if (!record(c) || ![c.a, c.b].every(p => Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1))) return null;
      const size = calibratedSize(c as unknown as Calibration);
      if (!size || !dimension(size.width) || !dimension(size.height) || Math.abs(size.width - Number(h.widthM)) > .00001 || Math.abs(size.height - Number(h.heightM)) > .00001) return null;
    }
    const home = h as unknown as Home;
    const validPosition = (a: Record<string, unknown>) => typeof a.x === 'number' && Number.isFinite(a.x) && a.x >= 0 && a.x <= bounds(home).width && typeof a.y === 'number' && Number.isFinite(a.y) && a.y >= 0 && a.y <= bounds(home).height;
    if (!speciesId(v.speciesId) || !validPosition(v) || !oneOf(v.mode, ['current', 'mature'])) return null;
    const ids = new Set();
    for (const item of s.ownedPlants) {
      if (!record(item) || !text(item.id) || ids.has(item.id) || !(speciesId(item.speciesId)||item.speciesId==='custom'&&text(item.customName,60)) || !text(item.nickname, 60) || item.homeId !== h.id || !validPosition(item) || item.status !== 'active' || typeof item.adoptedAt !== 'string' || !Number.isFinite(Date.parse(item.adoptedAt)) || !Array.isArray(item.events) || item.events.length !== 0) return null;
      ids.add(item.id);
    }
    return { version: 2, profile: p as unknown as Profile, home, ownedPlants: s.ownedPlants as OwnedPlant[], preview: { speciesId: v.speciesId as string, plantId: 'preview', x: v.x as number, y: v.y as number, mode: v.mode as State['mode'], style: p.style as State['style'], hasCat: p.hasCat as boolean } };
  } catch { return null; }
}
export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>;
export function loadStore(storage: StoragePort): { store: Store; warning: string } {
  try {
    const raw = storage.getItem(appKey);
    if (raw !== null) {
      const parsed = parseStore(raw);
      return { store: parsed ?? freshStore(), warning: parsed ? '' : 'Saved data could not be read. A fresh session is open; the unreadable record stays untouched until you save a change.' };
    }
    return { store: freshStore(storage.getItem(storageKey)), warning: '' };
  } catch { return { store: freshStore(), warning: 'Browser storage is unavailable. Changes will last only for this session.' }; }
}
export function saveStore(storage: StoragePort, store: Store): string {
  try { storage.setItem(appKey, JSON.stringify(store)); return ''; }
  catch { return 'Not saved: browser storage is full or unavailable. Your previous saved home is unchanged. Remove the floor-plan image and retry, or keep this tab open for session-only use.'; }
}
