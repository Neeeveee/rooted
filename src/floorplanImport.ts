import { validShape, shapeBounds } from './spatial.ts';
import type { Home, Region } from './appModel.ts';

// Future recognition integrations can emit this normalized, versioned envelope.
// Import never trusts confirmation, scale, placements or safety flags from a provider.
export type GeometryPayload = {
  version: 1; coordinateSystem: 'normalized-0-1';
  imageWidth: number; imageHeight: number;
  regions: Omit<Region, 'confirmed'>[];
};
export type GeometryImport = { version: 1; origin: 'manual-fixture' | 'external-json' | 'gemini'; imageWidth: number; imageHeight: number; notes: string[] };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const number = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const dimension = (n: unknown): n is number => number(n) && Number.isInteger(n) && n > 0 && n <= 30000;
export function validImport(v: unknown): v is GeometryImport {
  return record(v) && v.version === 1 && ['manual-fixture', 'external-json', 'gemini'].includes(String(v.origin)) && dimension(v.imageWidth) && dimension(v.imageHeight) && Array.isArray(v.notes) && v.notes.length <= 10 && v.notes.every(n => typeof n === 'string' && n.length <= 300);
}
export function importGeometry(value: unknown, origin: GeometryImport['origin'] = 'external-json') {
  if (!record(value)) throw new Error('Geometry must be a JSON object.');
  const canonical = value.version === 1 && value.coordinateSystem === 'normalized-0-1';
  const imageWidth = canonical ? value.imageWidth : value.image_width;
  const imageHeight = canonical ? value.imageHeight : value.image_height;
  if (!dimension(imageWidth) || !dimension(imageHeight)) throw new Error('Missing or invalid source image dimensions.');
  const regions: Region[] = [];
  const ids = new Set<string>();
  const add = (r: Region) => {
    if (!r.id || r.id.length > 100 || ids.has(r.id) || !r.label.trim() || r.label.length > 60 || !['room', 'wall', 'door', 'window', 'furniture', 'unknown'].includes(r.kind) || ![r.x, r.y, r.width, r.height].every(number) || r.x < 0 || r.y < 0 || (!r.shape && (r.width <= 0 || r.height <= 0)) || r.x + r.width > 1.000001 || r.y + r.height > 1.000001) throw new Error('Invalid, duplicate or out-of-bounds geometry region.');
    if (!validShape(r)) throw new Error('Invalid or self-intersecting geometry shape.');
    ids.add(r.id); regions.push({ ...r, confirmed: false, ...(origin==='gemini'?{reviewed:false}:{}) });
  };
  if (canonical) {
    if (!Array.isArray(value.regions)) throw new Error('Missing regions array.');
    for (const r of value.regions) {
      if (!record(r) || typeof r.id !== 'string' || typeof r.label !== 'string') throw new Error('Invalid region.');
      add({ id: r.id, label: r.label, kind: r.kind as Region['kind'], x: r.x as number, y: r.y as number, width: r.width as number, height: r.height as number, confirmed: false, ...(r.shape ? { shape: r.shape as Region['shape'], ...shapeBounds((r.shape as NonNullable<Region['shape']>).points) } : {}), ...(r.doorRole ? {doorRole: r.doorRole as Region['doorRole']} : {}) });
    }
  } else {
    if (value.coordinate_system !== 'normalized 0-1000, image top-left origin') throw new Error('Unsupported coordinate system. Use normalized 0–1000 fixture or version 1 normalized-0-1 envelope.');
    const point = (p: unknown): [number, number] => {
      if (!Array.isArray(p) || p.length !== 2 || !p.every(n => number(n) && n >= 0 && n <= 1000)) throw new Error('Invalid coordinate.');
      return p as [number, number];
    };
    for (const [key, kind] of [['furniture', 'furniture'], ['walls', 'wall'], ['doors', 'door'], ['windows', 'window']] as const) {
      if (!Array.isArray(value[key])) throw new Error(`Missing ${key} array.`);
      for (const item of value[key]) {
        if (!record(item) || typeof item.id !== 'string') throw new Error('Invalid region ID.');
        let x: number, y: number, width: number, height: number;
        if (kind === 'furniture') {
          if (!Array.isArray(item.polygon) || item.polygon.length !== 4) throw new Error('Only rectangular furniture polygons are supported.');
          const ps = item.polygon.map(point), xs = [...new Set(ps.map(p => p[0]))], ys = [...new Set(ps.map(p => p[1]))];
          if (xs.length !== 2 || ys.length !== 2 || new Set(ps.map(p => p.join(','))).size !== 4) throw new Error('Only axis-aligned rectangles are supported; polygon was not approximated.');
          x = Math.min(...xs); y = Math.min(...ys); width = Math.max(...xs) - x; height = Math.max(...ys) - y;
        } else if (kind === 'door') {
          if (!Array.isArray(item.clearance_box) || item.clearance_box.length !== 4) throw new Error('Invalid door-clearance box.');
          const a = point(item.clearance_box.slice(0, 2)), b = point(item.clearance_box.slice(2));
          [x, y] = a; width = b[0] - x; height = b[1] - y;
        } else {
          const line = kind === 'wall' ? item.polyline : item.line;
          if (!Array.isArray(line) || line.length !== 2) throw new Error('Only two-point axis-aligned lines are supported.');
          const a = point(line[0]), b = point(line[1]);
          if (a[0] !== b[0] && a[1] !== b[1]) throw new Error('Angled lines need manual geometry; not silently converted to rectangles.');
          // The fixture supplies centerlines, not wall thickness. One source pixel is
          // an explicitly unverified starting width, editable before confirmation.
          const tx = 1000 / imageWidth, ty = 1000 / imageHeight;
          x = Math.max(0, Math.min(a[0], b[0]) - (a[0] === b[0] ? tx / 2 : 0));
          y = Math.max(0, Math.min(a[1], b[1]) - (a[1] === b[1] ? ty / 2 : 0));
          width = Math.min(1000 - x, Math.abs(b[0] - a[0]) || tx); height = Math.min(1000 - y, Math.abs(b[1] - a[1]) || ty);
        }
        add({ id: item.id, label: typeof item.label === 'string' ? item.label : `${kind} ${item.id}`, kind, x: x / 1000, y: y / 1000, width: width / 1000, height: height / 1000, confirmed: false });
      }
    }
  }
  if (!regions.length || regions.length > 200) throw new Error('Import requires 1–200 regions.');
  const metadata: GeometryImport = { version: 1, origin, imageWidth, imageHeight, notes: canonical ? ['Imported regions are unconfirmed. Verify against the source image.'] : ['Manually interpreted test coordinates, not automatic recognition.', 'Wall/window centerlines start at one source pixel wide. Correct thickness and openings before confirming.', 'Fixture omits room coverage and smaller features. Add room interiors and mark unknown areas.'] };
  return { regions, metadata };
}
export function applyGeometryImport(home: Home, imported: ReturnType<typeof importGeometry>, actual: { width: number; height: number }): Home {
  if (actual.width !== imported.metadata.imageWidth || actual.height !== imported.metadata.imageHeight) throw new Error('JSON dimensions do not match this image. Select the original uncropped image.');
  return { ...home, mode: 'uploaded', regions: imported.regions, geometryImport: imported.metadata, geometryVerified: false, calibration: undefined, widthM: undefined, heightM: undefined };
}
