import { useState, useRef, useEffect } from 'react';
import { PlantArt } from './PlantArt';
import { RoomPlan } from './RoomPlan';
import { species } from './model';
import { assessment, isCalibrated } from './appModel';
import type { Store, OwnedPlant } from './appModel';

export function HomeDashboard({ store, onSelect, onEdit, onRemove, onDiscover, onSetup }: { store: Store; selectedId: string; onSelect: (id: string) => void; onEdit: (id: string, patch: Partial<Pick<OwnedPlant, 'nickname' | 'x' | 'y'>>) => void; onRemove: (id: string) => void; onDiscover: () => void; onSetup: () => void }) {
  const [opened, setOpened] = useState<string | null>(null);
  const recordDialog = useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    if(!opened){recordDialog.current?.close();return;}
    recordDialog.current?.showModal();
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{document.body.style.overflow=previousOverflow;};
  },[opened]);
  const selected = store.ownedPlants.find(p=>p.id===opened);
  const state = {...store.preview,...selected,plantId:selected?.id??'none',mode:'current' as const,...store.profile};
  const result = assessment(state,store.home);
  return <main className="plant-archive"><div className="intro"><div><p className="eyebrow">My plants · individual records</p><h1>The residents of {store.home.name}.</h1><p className="lede">{store.ownedPlants.length} plants at home. Each has its own story and saved place.</p></div><button className="primary" onClick={onDiscover}>+ Add a plant</button></div>
    {!store.ownedPlants.length&&<div className="empty-state"><h2>Your first resident is waiting.</h2><p>Preview a plant, then choose Add to My Home to create its individual record.</p><button className="secondary" onClick={onDiscover}>Find your first plant →</button></div>}
    <div className="resident-grid">{store.ownedPlants.map(p=><button key={p.id} className="resident-card" aria-haspopup="dialog" aria-controls="plant-record-dialog" aria-expanded={opened===p.id} onClick={()=>{setOpened(p.id);onSelect(p.id);}}><div className="resident-art"><PlantArt id={p.speciesId}/></div><h2>{p.nickname}</h2><p>{p.customName??species.find(s=>s.id===p.speciesId)?.name}</p><span>At home since {new Date(p.adoptedAt).toLocaleDateString()}</span><strong>Open plant record →</strong></button>)}</div>
    <dialog ref={recordDialog} id="plant-record-dialog" className="resident-record resident-record-modal" aria-labelledby="plant-record-title" onCancel={()=>setOpened(null)} onClose={()=>setOpened(null)} onClick={e=>{if(e.target===e.currentTarget){const box=e.currentTarget.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)setOpened(null);}}}>{selected&&<><div className="resident-record-heading"><h2 id="plant-record-title">Plant resident record</h2><button autoFocus className="secondary" onClick={()=>setOpened(null)}>Close record</button></div><div className="resident-record-body"><div className="resident-portrait"><PlantArt id={selected.speciesId}/><p>{selected.customName??species.find(s=>s.id===selected.speciesId)?.name}</p></div><div className="dossier"><PlantDossier key={selected.id} plant={selected} store={store} onEdit={patch=>onEdit(selected.id,patch)} onRemove={()=>{onRemove(selected.id);setOpened(null);}}/></div></div><details className="resident-location"><summary>View or edit this plant’s saved location</summary><button className="text-button" onClick={onSetup}>Edit floor plan</button><div className="canvas-area"><RoomPlan state={state} result={result} home={store.home} ownedPlants={store.ownedPlants} selectedId={selected.id} onSelect={id=>{setOpened(id);onSelect(id);}} onMove={pos=>onEdit(selected.id,pos)}/></div><p id="plan-instructions">Drag this plant to update its saved location.</p></details></>}</dialog>
    <footer className="app-footer"><span>One home. Individual stories.</span><p>Each adoption is an independent record. Saved in this browser.</p></footer></main>;
}

function PlantDossier({ plant, store, onEdit, onRemove }: { plant: OwnedPlant; store: Store; onEdit: (patch: Partial<Pick<OwnedPlant, 'nickname' | 'x' | 'y'>>) => void; onRemove: () => void }) {
  const [nickname, setNickname] = useState(plant.nickname);
  const [removing, setRemoving] = useState(false);
  const [renamed, setRenamed] = useState(false);
  const s = species.find(s => s.id === plant.speciesId); 
  const result = assessment({ ...store.preview, ...plant, plantId: plant.id, mode: 'current', ...store.profile }, store.home);
  return <><h2>{plant.nickname}</h2><p className="section-subtitle">{s?.scientificName??`${plant.customName} · custom record`}</p><dl className="plant-facts"><div><dt>At home since</dt><dd>{new Date(plant.adoptedAt).toLocaleDateString()}</dd></div><div><dt>Location</dt><dd>{plant.x.toFixed(2)}, {plant.y.toFixed(2)} {isCalibrated(store.home) ? 'm' : 'relative units'}</dd></div><div><dt>Status</dt><dd>Owned · active</dd></div></dl><label className="field">Nickname<input maxLength={60} value={nickname} onChange={e => { setNickname(e.target.value); setRenamed(false); }} /></label><button className="secondary" disabled={!nickname.trim()} onClick={() => { onEdit({ nickname: nickname.trim() }); setRenamed(true); }}>Save name</button>{renamed && <p className="fine-print" role="status">Name updated.</p>}<p className="fine-print">To edit location, move this selected plant on the map. Other plants keep their own positions.</p><div className="dossier-notes" aria-live="polite">{result.hardConflicts.map(n => <p className="warning-text" key={n}>! {n}</p>)}{result.conditionalWarnings.map(n => <p className="warning-text" key={n}>! {n}</p>)}<p>{result.unknowns[0]}</p>{s?<a href={s.source} target="_blank" rel="noreferrer">{s.catSafety==='toxic'?'Toxic to cats':'Non-toxic to cats'} · ASPCA ↗</a>:<p>The map shows a location marker only.</p>}</div><details className="instance-details"><summary>Individual record</summary><p>ID: {plant.id}</p><p>Adoption: {plant.adoptedAt}</p></details>{removing ? <div className="remove-confirm"><p>Remove this accidental placement? The individual record will be deleted; Undo is available immediately afterward.</p><div className="button-row"><button className="secondary" onClick={() => setRemoving(false)}>Cancel</button><button className="secondary danger" onClick={onRemove}>Confirm removal</button></div></div> : <button className="text-button danger" onClick={() => setRemoving(true)}>Remove accidental placement</button>}</>;
}
