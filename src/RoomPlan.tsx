import { RegionShape } from './RegionShape';
import { trusted } from './spatial';
import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { room, species } from './model';
import type { State, Evaluation } from './model';
import { PlantArt } from './PlantArt';
import { bounds, clampPosition, demoHome, assessment, isCalibrated } from './appModel';
import type { Home, OwnedPlant } from './appModel';

export function RoomPlan({ state, result, onMove, home = demoHome, ownedPlants = [], selectedId, onSelect, hideSelected = false }: { state: State; result: Evaluation; onMove: (pos: { x: number; y: number }) => void; home?: Home; ownedPlants?: OwnedPlant[]; selectedId?: string; onSelect?: (id: string) => void; hideSelected?: boolean }) {
  const size = bounds(home);
  const uploaded = home.mode === 'uploaded';
  const [imageAspect, setImageAspect] = useState(home.geometryImport ? home.geometryImport.imageWidth / home.geometryImport.imageHeight : home.calibration?.aspect ?? 400 / 360);
  const planHeight = uploaded ? 400 / imageAspect : 360;
  const sx = 400 / size.width, sy = planHeight / size.height;
  const moveTo = (x: number, y: number) => clampPosition(home, x, y);
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const plant = species.find(p => p.id === state.speciesId) ?? {id:'custom',name:ownedPlants.find(p=>p.id===selectedId)?.customName??'Custom plant',current:.4,mature:.4};
  const custom = state.speciesId === 'custom';
  const calibrated = isCalibrated(home);
  const radius = calibrated && !custom ? plant[state.mode] / 2 : .2;
  const unknown = assessment(state, home).spaceStatus === 'unknown';
  const conflicts = result.hardConflicts.length > 0 || result.overlapIds.length > 0;
  function point(event: PointerEvent<SVGSVGElement>) {
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return null;
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: (p.x - 60) / sx, y: (p.y - 55) / sy };
  }
  function down(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || hideSelected) return;
    const p = point(event);
    if (!p || p.x < 0 || p.x > size.width || p.y < 0 || p.y > size.height) return;
    const onPlant = Math.hypot(p.x - state.x, p.y - state.y) <= radius;
    offset.current = onPlant ? { x: p.x - state.x, y: p.y - state.y } : { x: 0, y: 0 };
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    if (!onPlant) onMove(moveTo(p.x, p.y));
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    if (!dragging.current) return;
    const p = point(event);
    if (p) onMove(moveTo(p.x - offset.current.x, p.y - offset.current.y));
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!directions[event.key] || hideSelected) return;
    event.preventDefault();
    const [dx, dy] = directions[event.key];
    const step = event.shiftKey ? 0.25 : 0.1;
    onMove(moveTo(state.x + dx * step, state.y + dy * step));
  }
  return <svg ref={svg} className="room-plan" viewBox={`0 0 520 ${planHeight + 115}`} tabIndex={0} role="group" aria-label={`Interactive home plan. ${hideSelected ? 'Select an owned plant.' : `${plant.name} at ${state.x.toFixed(1)}, ${state.y.toFixed(1)} ${!calibrated ? 'relative units' : 'meters'}.`}`} aria-describedby="plan-instructions" onPointerDown={down} onPointerMove={move} onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }} onLostPointerCapture={() => { dragging.current = false; }} onKeyDown={key}>
    <defs>
      <pattern id="floor" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#D8DED5" strokeWidth=".45" /></pattern>
      <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" stroke="#A66C29" strokeWidth=".6" opacity=".4" /></pattern>
      <clipPath id="room-clip"><rect x="60" y="55" width="400" height={planHeight} /></clipPath>
    </defs>
    <g className="dimension"><path d="M60 25H460M60 20V30M460 20V30" /><rect x="230" y="14" width="60" height="20" fill="#F9F9F6" stroke="none" /><text x="260" y="29">{uploaded ? calibrated ? `${home.widthM!.toFixed(2)} m` : 'Unmeasured' : '4.0 m'}</text><path d={`M30 55V${55 + planHeight}M25 55H35M25 ${55 + planHeight}H35`} /><text transform={`translate(24 ${55 + planHeight / 2}) rotate(-90)`}>{uploaded ? calibrated ? `${home.heightM!.toFixed(2)} m` : 'Not to scale' : '3.6 m'}</text></g>
    <rect x="60" y="55" width="400" height={planHeight} fill="#F3F3ED" />
    <rect x="60" y="55" width="400" height={planHeight} fill="url(#floor)" />
    {!uploaded && <><g transform="translate(60 55)">
      <rect x="17" y="28" width="180" height="235" rx="3" fill="#E8E6DE" stroke="#D8D6CC" />
      {room.furniture.map(item => <rect key={item.id} x={item.x * 100} y={item.y * 100} width={item.width * 100} height={item.height * 100} rx="3" fill={result.overlapIds.includes(item.id) ? '#F0DCD6' : '#E0DFD5'} stroke={result.overlapIds.includes(item.id) ? '#B96A5D' : '#9B9F91'} strokeWidth="1" />)}
      <g fill="#F9F9F6" stroke="#B3B6A9" strokeWidth=".8"><rect x="38" y="48" width="143" height="193" rx="4" /><rect x="44" y="56" width="61" height="36" rx="6" /><rect x="113" y="56" width="61" height="36" rx="6" /><path d="M38 103H181V235Q181 241 175 241H44Q38 241 38 235Z" fill="#D7DDCF" /><path d="M38 119H181M45 125V233M174 125V233" fill="none" /></g>
      <text x="109" y="182" className="furniture-label">Bed</text>
      <circle cx="221" cy="68" r="12" fill="#F4F2E9" stroke="#9B9F91" strokeWidth=".8" /><circle cx="221" cy="68" r="4" fill="#C0C4B5" />
      <path d="M349 80H392M349 125H392M369 55H375M369 99H375M369 144H375" stroke="#A3A698" fill="none" />
      <text x="371" y="105" className="furniture-label" transform="rotate(90 371 105)">Dresser</text>
      <rect x="280" y="250" width="120" height="110" fill="url(#hatch)" stroke={result.overlapIds.includes('door') ? '#B96A5D' : '#A66C29'} strokeDasharray="4 4" strokeWidth="1.2" />
      <text x="340" y="267" className="zone-label">Keep clear</text>
      <path d="M400 355H305M305 355A95 95 0 0 1 400 260" fill="none" stroke="#9D9C88" strokeWidth="1" /><path d="M400 355V260" stroke="#5F695A" strokeWidth="2" />
    </g>
    <path d="M350 55H460V355M460 410V415H60V55H190" fill="none" stroke="#4A5749" strokeWidth="5" strokeLinejoin="miter" />
    <path d="M190 52H350M190 58H350M190 49V61M270 52V58M350 49V61" stroke="#829EA0" strokeWidth="1.5" />
    <text x="270" y="47" className="window-label">Window</text>
    <text x="480" y="393" className="furniture-label" transform="rotate(-90 480 393)">Door</text>
    </>}
    {uploaded && home.backgroundImageDataUrl && <image href={home.backgroundImageDataUrl} x="60" y="55" width="400" height={planHeight} preserveAspectRatio="none" opacity=".8" onLoad={e => { const img = new Image(); img.onload = () => setImageAspect(img.naturalWidth / img.naturalHeight); img.src = e.currentTarget.getAttribute('href')!; }} />}
    {uploaded && home.regions?.map(r => <RegionShape key={r.id} region={r} x={60} y={55} width={400} height={planHeight} className={`geometry-region ${r.kind} ${trusted(r, home.regions ?? []) ? 'confirmed' : 'uncertain'}`} style={result.overlapIds.includes(r.id) ? { stroke: '#A15A4D', fill: '#B96A5D', fillOpacity: .3 } : undefined}><title>{r.label} · {trusted(r, home.regions ?? []) ? 'confirmed' : 'uncertain'}</title></RegionShape>)}
    <g clipPath="url(#room-clip)">
      {ownedPlants.filter(p => p.id !== selectedId).map(p => <g key={p.id} transform={`translate(${60 + p.x * sx} ${55 + p.y * sy})`} role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined} aria-label={`Select ${p.nickname}`} className="owned-marker" onPointerDown={e => { if (onSelect) { e.stopPropagation(); onSelect(p.id); } }} onKeyDown={e => { if (onSelect && ["Enter", " "].includes(e.key)) { e.preventDefault(); e.stopPropagation(); onSelect(p.id); } }}>
        <circle r="20" fill="#F9F9F6" stroke="#8BA889" /><g transform="scale(.5)"><PlantArt id={p.speciesId} top /></g><title>{p.nickname}</title>
      </g>)}
      {!hideSelected &&
      <g transform={`translate(${60 + state.x * sx} ${55 + state.y * sy})`}>
        <ellipse data-testid="footprint" rx={custom||!calibrated?13:radius * sx} ry={custom||!calibrated?13:radius * sy} fill={conflicts ? '#B96A5D' : unknown ? '#777F7A' : '#8BA889'} fillOpacity=".16" stroke={conflicts ? '#A15A4D' : unknown ? '#626B65' : '#49654E'} strokeWidth="1.5" strokeDasharray={state.mode === 'mature' ? '5 4' : undefined} />
        {calibrated && !custom && state.mode === 'mature' && <ellipse rx={plant.current * sx / 2} ry={plant.current * sy / 2} fill="none" stroke="#49654E" strokeOpacity=".55" strokeWidth="1" />}
        <g transform={`scale(${plant.current * (calibrated && !custom ? sx : 100) / 78} ${plant.current * (calibrated && !custom ? sy : 100) / 78})`}><PlantArt id={plant.id} top /></g>
        <circle r="3" fill="#FFFFFF" stroke="#253528" strokeWidth="1.4" />
      </g>}
    </g>
    {!uploaded && <g className="scale"><path d="M63 446H163M63 442V450M113 442V450M163 442V450" /><text x="63" y="464" textAnchor="start">0</text><text x="163" y="464" textAnchor="end">1 m</text></g>}
    <text x="460" y={planHeight + 98} textAnchor="end" className="plan-caption">{custom ? 'Custom plant · location marker only, footprint unknown' : uploaded ? calibrated ? home.geometryVerified ? 'Verified overlays · uncharted areas unknown' : 'Calibrated · geometry not verified' : 'Uncalibrated · marker is not to scale' : 'Illustrative bedroom · overhead view'}</text>
  </svg>;
}
