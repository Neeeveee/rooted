import { reviewRegions } from './journeyState';
import { RegionShape } from './RegionShape';
import { geometryWarnings, shapeBounds, validShape, vertices, trusted } from './spatial';
import type { Point } from './spatial';
import { useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { applyGeometryImport, importGeometry } from './floorplanImport';
import { calibratedSize, verificationNeeds, uid } from './appModel';
import type { Home, Region } from './appModel';

export function GeometryEditor({ home, onChange }: { home: Home; onChange: (home: Home) => void }) {
  const [tool, setTool] = useState<Region['kind'] | 'scale' | 'select'>(home.regions?.length?'select':'room');
  const [visibleKinds,setVisibleKinds] = useState<Region['kind'][]>(['furniture','wall','door','window','room','unknown']);
  const [onlyUnconfirmed,setOnlyUnconfirmed] = useState(false);
  const [showLabels,setShowLabels] = useState(false);
  const [selected, setSelected] = useState('');
  const [points, setPoints] = useState<[number, number][]>([]);
  const [meters, setMeters] = useState('');
  const [aspect, setAspect] = useState(home.calibration?.aspect ?? (home.geometryImport ? home.geometryImport.imageWidth / home.geometryImport.imageHeight : 1));
  const [shapeType, setShapeType] = useState<'rect'|'polygon'|'line'>('rect');
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);
  const [vertexText, setVertexText] = useState('');
  const [error, setError] = useState('');
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const importSequence = useRef(0);
  const [importing, setImporting] = useState(false);
  const start = useRef<[number, number] | null>(null);
  const [end, setEnd] = useState<[number, number] | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const regions = home.regions ?? [];
  const warnings = geometryWarnings(regions);
  const visible = reviewRegions(regions,visibleKinds,onlyUnconfirmed);
  function selectRegion(id:string){setSelected(id);setTool('select');setVertexText('');}
  const current = regions.find(r => r.id === selected);
  async function importFile(file?: File) {
    if (!file) return;
    const sequence = ++importSequence.current; setError(''); setImporting(true);
    try {
      if (file.size > 300000) throw new Error('Choose a geometry JSON file under 300 KB.');
      const imported = importGeometry(JSON.parse(await file.text()));
      const actual = await new Promise<{ width: number; height: number }>((resolve, reject) => { const img = new Image(); img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight }); img.onerror = reject; img.src = home.backgroundImageDataUrl!; });
      const next = applyGeometryImport(home, imported, actual);
      if (sequence === importSequence.current) { onChange(next); setSelected(''); setPoints([]); setMeters(''); setTool('select'); }
    } catch (e) { if (sequence === importSequence.current) setError(e instanceof Error ? e.message : 'Could not read geometry JSON.'); }
    finally { if (sequence === importSequence.current) setImporting(false); }
  }
  function update(regions: Region[]) { onChange({ ...home, regions, geometryVerified: false }); }
  function addShape(ps:Point[]) {
    if(tool==='select'||tool==='scale'||regions.length>=200)return;
    const shape = shapeType==='line' ? {type:'line' as const,points:ps as [Point,Point],thickness:.005} : {type:'polygon' as const,points:ps};
    const r:Region={id:uid(),label:`${tool} ${regions.length+1}`,kind:tool,...shapeBounds(ps),shape,confirmed:false,reviewed:false,...(tool==='door'?{doorRole:shapeType==='line'?'opening' as const:'clearance' as const}:{})};
    if(!validShape(r)){setError('Invalid shape. Use distinct points and a simple polygon without crossing edges.');return;}
    update([...regions,r]);setSelected(r.id);setDraftPoints([]);setTool('select');setError('');
  }
  function point(e: PointerEvent<SVGSVGElement>): [number, number] {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.current!.getScreenCTM()!.inverse());
    return [Math.max(0, Math.min(1, p.x / 1000)), Math.max(0, Math.min(1, p.y / (1000 / aspect)))];
  }
  function finish(e: PointerEvent<SVGSVGElement>) {
    if (!start.current || tool === 'select') return;
    const a = start.current, b = point(e); start.current = null; setEnd(null);
    if (tool === 'scale') { setPoints(points.length === 1 ? [points[0], b] : [b]); return; }
    if(shapeType==='line'){addShape([a,b]);return;}
    const width = Math.abs(b[0] - a[0]), height = Math.abs(b[1] - a[1]);
    if (width < .003 || height < .003) return;
    if (regions.length >= 200) { setError('This plan supports up to 200 regions. Remove a region before adding another.'); return; }
    const id = uid(); update([...regions, { id, kind: tool, label: `${tool} ${regions.length + 1}`, x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), width, height, confirmed: false, reviewed:false }]); selectRegion(id);
  }
  function calibrate() {
    const c = { a: points[0], b: points[1], meters: Number(meters), aspect };
    const size = points.length === 2 ? calibratedSize(c) : null;
    if (!size || size.width < 1 || size.width > 50 || size.height < 1 || size.height > 50) { setError('Choose two distinct endpoints and a real length that gives image bounds between 1 and 50 m.'); return; }
    setError(''); onChange({ ...home, calibration: c, widthM: size.width, heightM: size.height, geometryVerified: false });
  }
  const needs = verificationNeeds(home);
  const canVerify = needs.ready;
  function reviewNext(roomOnly = false) {
    const next = roomOnly ? regions.find(r=>r.kind==='room'&&!trusted(r,regions)) : needs.pending[0];
    setOnlyUnconfirmed(false); setVisibleKinds(['furniture','wall','door','window','room','unknown']);
    if(next) { selectRegion(next.id); requestAnimationFrame(()=>document.querySelector('.region-fields')?.scrollIntoView({block:'center',behavior:'smooth'})); }
    else {setTool('room'); svg.current?.scrollIntoView({block:'center',behavior:'smooth'});}
  }
  return <section className="geometry-editor"><h2>Map & verify your plan</h2><p>Review recognition results. Draw rectangles, polygons or line segments; leave uncharted space outside rooms or mark it Unknown.</p>
    <details className="geometry-advanced"><summary>Import geometry & source details</summary><label className="field">Import geometry JSON<input type="file" accept=".json,application/json" disabled={importing} onChange={e => void importFile(e.target.files?.[0])} /></label><p className="fine-print">Replaces draft overlays and resets calibration and verification. Supports the attached 0–1000 fixture and a version 1 normalized-0-1 envelope. Nothing is automatically confirmed.</p>{home.geometryImport && <div className="import-notes"><strong>{home.geometryImport.origin === 'manual-fixture' ? 'Manual test fixture · not AI recognition' : home.geometryImport.origin === 'gemini' ? 'Gemini vision detection · unverified' : 'Imported JSON · unverified source'}</strong>{home.geometryImport.notes.map(n => <p className="fine-print" key={n}>{n}</p>)}</div>}</details>
    <div className="geometry-tools" role="group" aria-label="Drawing tool">{(['select', 'room', 'wall', 'door', 'window', 'furniture', 'unknown', 'scale'] as const).map(t => <button className="secondary" aria-pressed={tool === t} key={t} onClick={() => { setTool(t); if(t!=='select'&&t!=='scale')setVisibleKinds(k=>k.includes(t)?k:[...k,t]); setDraftPoints([]); setShapeType('rect'); start.current = null; setEnd(null); }}>{t === 'door' ? 'Door clearance' : t === 'scale' ? 'Calibrate scale' : t[0].toUpperCase() + t.slice(1)}</button>)}</div>
    {tool!=='select'&&tool!=='scale'&&<div className="button-row"><label className="field">Shape<select value={shapeType} onChange={e=>{setShapeType(e.target.value as typeof shapeType);setDraftPoints([]);}}><option value="rect">Rectangle</option><option value="polygon">Polygon</option>{['wall','window','door'].includes(tool)&&<option value="line">Line segment</option>}</select></label>{shapeType==='polygon'&&<><button className="secondary" disabled={draftPoints.length<3} onClick={()=>addShape(draftPoints)}>Finish polygon</button><button className="text-button" onClick={()=>setDraftPoints([])}>Clear points</button></>}</div>}
    {shapeType==='polygon'&&tool!=='select'&&tool!=='scale'&&<p className="fine-print">Click vertices in order, then Finish polygon. {draftPoints.length} points.</p>}
    <div className="geometry-filters" role="group" aria-label="Visible geometry layers">{(['furniture','wall','door','window','room','unknown'] as const).map(kind=><label className="check-field" key={kind}><input type="checkbox" checked={visibleKinds.includes(kind)} onChange={e=>{setVisibleKinds(ks=>e.target.checked?[...ks,kind]:ks.filter(k=>k!==kind));setSelected('');}}/>{kind==='furniture'?'Furniture':kind==='unknown'?'Unknown':kind[0].toUpperCase()+kind.slice(1)+'s'}</label>)}</div>
    <div className="review-options"><label className="check-field"><input type="checkbox" checked={onlyUnconfirmed} onChange={e=>{setOnlyUnconfirmed(e.target.checked);setSelected('');}}/>Needs review only</label><label className="check-field"><input type="checkbox" checked={showLabels} onChange={e=>setShowLabels(e.target.checked)}/>Show all object labels</label><span>{regions.filter(r=>trusted(r,regions)).length} of {regions.length} confirmed · {Object.keys(warnings).length} with geometry warnings</span></div>
    <p className="fine-print">Filters change visibility only; placement checks always use the complete saved geometry. Select an object to see its name, warnings and editing controls.</p>
    <p className="fine-print">{tool === 'scale' ? 'Click two endpoints of a known measurement, then enter its real length below.' : 'Drag across the image to add a region. Select an overlay or its list entry to edit it. Door regions must include the entire swing / clearance area. Room regions describe usable interior space.'}</p>
    <svg ref={svg} className="geometry-canvas" viewBox={`0 0 1000 ${1000 / aspect}`} role="group" aria-label="Floor-plan geometry editor" onPointerDown={e => { if (e.button !== 0 || tool === 'select') return; if(shapeType==='polygon'&&tool!=='scale'){setDraftPoints([...draftPoints,point(e)]);return;} start.current = point(e); setEnd(start.current); e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { if (start.current) setEnd(point(e)); }} onPointerUp={finish} onPointerCancel={() => { start.current = null; setEnd(null); }}>
      <image href={home.backgroundImageDataUrl} width="1000" height={1000 / aspect} preserveAspectRatio="none" onLoad={e => { const img = new Image(); img.onload = () => setAspect(img.naturalWidth / img.naturalHeight); img.src = e.currentTarget.getAttribute('href')!; }} />
      {visible.map(r => <g key={r.id} role="button" tabIndex={tool==='select'?0:-1} aria-label={`Edit ${r.label}, ${trusted(r,regions)?'confirmed':'needs review'}`} onKeyDown={e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();selectRegion(r.id);}}} style={{ pointerEvents: tool === 'select' ? 'auto' : 'none' }} onPointerDown={e => { if (tool === 'select') { e.stopPropagation(); selectRegion(r.id); } }}><RegionShape region={r} width={1000} height={1000/aspect} className={`geometry-region ${r.kind} ${trusted(r,regions) ? 'confirmed' : 'uncertain'} ${selected === r.id ? 'selected' : ''}`} />{(showLabels||selected===r.id)&&<text x={r.x * 1000 + 4} y={r.y * 1000 / aspect + 18}>{r.label}</text>}</g>)}
      {start.current && end && tool !== 'scale' && tool !== 'select' && <rect x={Math.min(start.current[0], end[0]) * 1000} y={Math.min(start.current[1], end[1]) * 1000 / aspect} width={Math.abs(end[0] - start.current[0]) * 1000} height={Math.abs(end[1] - start.current[1]) * 1000 / aspect} className="geometry-region uncertain" />}
      {draftPoints.length>0&&<polyline points={draftPoints.map(p=>`${p[0]*1000},${p[1]*1000/aspect}`).join(' ')} fill="none" stroke="#A66C29" strokeWidth="2"/>}
      {points.map((p, i) => <circle key={i} cx={p[0] * 1000} cy={p[1] * 1000 / aspect} r="7" fill="#A66C29" />)}{points.length === 2 && <line x1={points[0][0] * 1000} y1={points[0][1] * 1000 / aspect} x2={points[1][0] * 1000} y2={points[1][1] * 1000 / aspect} stroke="#A66C29" strokeWidth="3" />}
    </svg>
    <div className="geometry-legend">Solid: confirmed · Dashed: unconfirmed · Gray: unknown. Windows are informational; they do not estimate light.</div>
    <div className="calibration-controls"><p className="fine-print">{tool === 'scale' ? `${points.length} of 2 endpoints selected. Click both ends of a printed dimension or another length you know.` : 'First choose Calibrate scale, then click the two endpoints of a known measurement on the image.'}</p><div className="button-row"><label className="field">Known length (m)<input type="number" min="0.01" step="0.01" value={meters} onChange={e => setMeters(e.target.value)} /></label><button className="secondary" disabled={points.length !== 2} onClick={calibrate}>Apply calibration</button></div></div>
    <p role="status">{home.calibration ? `Scale calibrated · image ${home.widthM!.toFixed(2)} × ${home.heightM!.toFixed(2)} m` : 'Scale unknown. Plant footprints cannot be measured on this image.'}</p>
    <div className="geometry-review"><div className="region-list" aria-label="Geometry objects">{!visible.length&&<p className="fine-print">No objects match these filters. Show more layers or turn off Needs review only.</p>}{visible.map(r => <button key={r.id} className="text-button" aria-pressed={selected === r.id} onClick={() => selectRegion(r.id)}>{r.label} · {r.kind === 'unknown' ? 'unknown' : trusted(r,regions) ? 'confirmed' : 'needs review'}</button>)}</div>
    {current && <div className="region-fields"><h3>{current.label}</h3>{warnings[current.id]?.map(message=><p className="warning-text" key={message}>{message}</p>)}<label className="field">Region name<input maxLength={60} value={current.label} onChange={e => update(regions.map(r => r.id === selected ? { ...r, label: e.target.value } : r))} /></label><div className="form-columns">{!current.shape && (['x', 'y', 'width', 'height'] as const).map(k => <label className="field" key={k}>{k} (% of image)<input type="number" min="0" max="100" step="0.1" value={Number((current[k] * 100).toFixed(2))} onChange={e => { const value = Math.max(k === 'width' || k === 'height' ? .001 : 0, Math.min(1, Number(e.target.value) / 100)); const r = { ...current, [k]: value, confirmed: false, reviewed:false }; r.width = Math.min(r.width, 1 - r.x); r.height = Math.min(r.height, 1 - r.y); if (r.width > 0 && r.height > 0) update(regions.map(q => q.id === selected ? r : q)); }} /></label>)}</div>{!current.shape&&<button className="secondary" onClick={()=>update(regions.map(q=>q.id===selected?{...q,shape:{type:'polygon',points:vertices(q)},confirmed:false,reviewed:false}:q))}>Convert rectangle to editable polygon</button>}
    {current.shape&&<><p className="fine-print">Vertices as JSON pairs in normalized 0–1 coordinates. Current: {JSON.stringify(vertices(current).map(p=>p.map(v=>Number(v.toFixed(4)))))}</p><label className="field">Replacement vertices<textarea value={vertexText} onChange={e=>setVertexText(e.target.value)} placeholder="[[0.1,0.1],[0.4,0.1],[0.3,0.4]]" /></label><button className="secondary" onClick={()=>{try{const ps=JSON.parse(vertexText);const r={...current,shape:{...current.shape!,points:ps},...shapeBounds(ps),confirmed:false,reviewed:false} as Region;if(!validShape(r))throw Error();update(regions.map(q=>q.id===selected?r:q));setError('');}catch{setError('Invalid vertices. Enter a simple polygon or two distinct line endpoints in 0–1 coordinates.');}}}>Apply vertices</button>{current.shape.type==='line'&&<label className="field">Line thickness (% of image width)<input type="number" min="0.01" max="5" step="0.1" value={current.shape.thickness*100} onChange={e=>{const r={...current,shape:{...current.shape!,thickness:Number(e.target.value)/100},confirmed:false,reviewed:false} as Region;if(validShape(r))update(regions.map(q=>q.id===selected?r:q));}}/></label>}</>}
    {current.kind==='door'&&<label className="field">Door geometry<select value={current.doorRole??'clearance'} onChange={e=>update(regions.map(q=>q.id===selected?{...q,doorRole:e.target.value as 'opening'|'clearance',confirmed:false,reviewed:false}:q))}><option value="opening">Opening (informational)</option><option value="clearance">Clearance (collision region)</option></select></label>}
    {warnings[current.id]?.length>0&&<label className="check-field"><input type="checkbox" checked={!!current.reviewed} onChange={e=>update(regions.map(q=>q.id===selected?{...q,reviewed:e.target.checked}:q))}/>I checked these geometry warnings against the image.</label>}
    <div className="button-row region-actions"><button className="secondary" disabled={!current.label.trim()} onClick={() => update(regions.map(r => r.id === selected ? { ...r, confirmed: !r.confirmed } : r))}>{current.confirmed ? 'Mark unconfirmed' : 'Confirm region'}</button><button className="text-button danger" onClick={() => { update(regions.filter(r => r.id !== selected)); setSelected(''); }}>Remove region</button></div></div>}
    </div>
    {error && <p role="alert" className="warning-text">{error}</p>}
    <section className="verification-checklist" aria-label="Placement check requirements"><h3>{canVerify ? 'Ready for your final confirmation' : 'Before enabling placement checks'}</h3>
    {needs.scale&&<div><span>1 · Calibrate a known real-world length.</span><button className="secondary" onClick={()=>{setTool('scale');setPoints([]);svg.current?.scrollIntoView({block:'center',behavior:'smooth'});}}>Set image scale →</button></div>}
    {needs.room&&<div><span>2 · Confirm at least one usable room interior.</span><button className="secondary" onClick={()=>reviewNext(true)}>Review room boundaries →</button></div>}
    {!!needs.pending.length&&<div><span>3 · {needs.pending.length} objects still need review. Confirm, correct or remove them.</span><button className="secondary" onClick={()=>reviewNext()}>Review next object →</button></div>}
    <label className="check-field"><input type="checkbox" checked={!!home.geometryVerified} aria-describedby="verification-feedback" onChange={e => { if(e.target.checked && !canVerify){setVerificationAttempted(true);return;} setVerificationAttempted(false);onChange({ ...home, geometryVerified: e.target.checked }); }} />I verified the scale, room interiors, obstacles and door clearance. Unchecked areas remain unknown.</label><p id="verification-feedback" role="status" className={verificationAttempted&&!canVerify?'warning-text':'fine-print'}>{verificationAttempted&&!canVerify ? `Cannot verify yet: ${[needs.scale?'set image scale':null,needs.room?'confirm a room interior':null,needs.pending.length?`review ${needs.pending.length} remaining objects`:null].filter(Boolean).join('; ')}. Use the buttons above to complete these steps.` : canVerify?'All prerequisites met. You can now confirm this plan.':'Finish the steps above before confirming. Clicking this checkbox will show what is missing.'}</p><p className="fine-print">Calibration and at least one confirmed room are required. Confirm or remove every uncertain region before verifying. Placement checks apply only inside confirmed rooms, excluding Unknown regions.</p></section>
  </section>;
}
