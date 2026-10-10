import { useEffect, useRef, useState } from 'react';
import { defaults, species } from './model';
import type { State } from './model';
import { PlantArt } from './PlantArt';
import { RoomPlan } from './RoomPlan';
import { assessment, potentialOverlaps, placementExplanation, bounds, clampPosition, isCalibrated } from './appModel';
import type { Home, OwnedPlant } from './appModel';

export function Segments<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void }) {
  return <div className="segments" role="group" aria-label={label}>{options.map(option => <button key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}
export function Preview({ initialAdoption = false, state, update, home, ownedPlants, onAdopt, onBack, onSetup }: { initialAdoption?: boolean; state: State; update: (patch: Partial<State>) => void; home: Home; ownedPlants: OwnedPlant[]; onAdopt: (nickname: string) => void; onBack: () => void; onSetup: () => void }) {
  const [confirm, setConfirm] = useState(initialAdoption);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (confirm) dialog.current?.showModal();
    else dialog.current?.close();
  }, [confirm]);
  const [nickname, setNickname] = useState(species.find(p=>p.id===state.speciesId)?.name??'');
  const plant = species.find(p => p.id === state.speciesId)!;
  const result = assessment(state, home);
  const potential = potentialOverlaps(state, home);
  const notices = [...result.hardConflicts, ...potential.map(r=>`Possible overlap with mapped ${r.kind}: ${r.label}. ${isCalibrated(home)?'Detection needs confirmation.':'Scale unknown; marker overlap only, footprint not evaluated.'}`)];
  const conflict = notices.length > 0;
  const unassessed = result.spaceStatus === 'unknown';
  const calibrated = isCalibrated(home);
  return <>
    <main>
      <div className="intro"><div><p className="eyebrow">Plant workspace · not yet owned</p><h1>Find its place in your home.</h1></div><div className="button-row"><button className="reset" onClick={onBack}>Find plants</button><button className="reset" onClick={onSetup}>Edit floor plan</button><button className="reset" onClick={() => update({ speciesId: defaults.speciesId, mode: defaults.mode, ...clampPosition(home, defaults.x, defaults.y) })}>Reset preview</button></div></div>
      <div className="workspace">
        <aside className="library preview-library" aria-labelledby="library-title"><div className="section-heading"><h2 id="library-title">Choose your plant</h2><span className="count">06</span></div><p className="section-subtitle">One plant. A few possibilities.</p>
          <button className="primary full-width" onClick={() => { setNickname(plant.name); setConfirm(true); }}>Add to My Home</button>
          <div className="plant-list">{species.map(p => <button className={`plant-option ${p.id === plant.id ? 'selected' : ''}`} key={p.id} aria-pressed={p.id === plant.id} onClick={() => update({ speciesId: p.id })}><PlantArt id={p.id} /><span className="plant-info"><strong>{p.name}</strong><em>{p.scientificName}</em><span>{p.form}</span></span><span className="selection-indicator" aria-hidden="true">{p.id === plant.id ? '✓' : ''}</span></button>)}</div>
          <div className="size-note"><span className="minor-heading">Illustrative spread</span><div className="size-comparison"><div><span>Current</span><strong>{plant.current.toFixed(2)} <small>m</small></strong></div><span className="size-arrow" aria-hidden="true">→</span><div><span>Mature</span><strong>{plant.mature.toFixed(2)} <small>m</small></strong></div></div><p>Demo footprint diameters, not growth predictions. Actual size varies by plant and conditions.</p></div>
        </aside>
        <section className="space" aria-labelledby="space-title"><div className="space-toolbar"><div><h2 id="space-title">Your space</h2><p>{home.name} · {calibrated ? `${bounds(home).width.toFixed(2)} × ${bounds(home).height.toFixed(2)} m` : "Unmeasured background"}</p></div><Segments label="Footprint preview" value={state.mode} options={[{ value: 'current', label: 'Current' }, { value: 'mature', label: 'Mature' }]} onChange={mode => update({ mode })} /></div>
          <div className="canvas-area"><RoomPlan state={state} result={{...result, overlapIds:[...result.overlapIds,...potential.map(r=>r.id)]}} onMove={update} home={home} ownedPlants={ownedPlants} /></div>
          <div className="plan-legend"><span><i className={state.mode === 'mature' ? 'legend-ring dashed' : 'legend-ring'} />{state.mode === 'mature' ? 'Mature' : 'Current'} {calibrated ? `footprint · ${plant[state.mode].toFixed(2)} m (illustrative diameter)` : 'marker · not to scale'}</span>{state.mode === 'mature' && <span><i className="legend-ring small" />Current spread</span>}{home.mode === 'demo' && <span><i className="legend-zone" />Door clearance</span>}{unassessed && <span>{calibrated ? 'Calibrated image · geometry incomplete here' : 'Image scale unknown'}</span>}</div>
          <p id="plan-instructions" className="plan-instructions"><span aria-hidden="true">↔</span> Drag the plant or click in the room to place it. <span className="keyboard-hint">Arrow keys move it, too.</span></p>
          <div className={`live-summary ${conflict ? 'has-conflict' : unassessed ? 'is-unknown' : ''}`} aria-live="polite"><span className="status-icon" aria-hidden="true">{conflict ? '!' : unassessed ? '?' : '✓'}</span><div><strong>{conflict ? result.hardConflicts.length ? 'Confirmed spatial conflict' : 'Possible overlap · needs review' : unassessed ? 'Not verified' : 'Clear of mapped obstacles'}</strong><p>{conflict ? notices[0] : unassessed ? placementExplanation(state, home) : state.mode === 'current' ? 'No overlap with mapped furniture or clearance. This is a limited geometry check, not a safety guarantee. Try Mature to compare.' : 'No mapped obstacle overlap at this illustrative size. Light and pet suitability are separate checks.'}</p></div>{unassessed&&<button className="secondary" onClick={onSetup}>Review home geometry →</button>}</div>
        </section>
        <aside className="impact" aria-labelledby="impact-title"><h2 id="impact-title">Home impact</h2><p className="section-subtitle">A considered fit, from every angle.</p>
          <div className="assessments" aria-live="polite">
            <section className={`assessment ${conflict ? 'conflict' : unassessed ? 'unknown' : 'compatible'}`}><div className="assessment-title"><h3><span className="status-icon" aria-hidden="true">{conflict ? '!' : unassessed ? '?' : '✓'}</span>Space</h3><span className="status-label">{conflict ? result.hardConflicts.length ? 'Conflict' : 'Possible overlap' : unassessed ? 'Not verified' : 'Clear'}</span></div>{conflict ? notices.map(note => <p key={note}>{note}</p>) : <p>{unassessed ? placementExplanation(state, home) : "The illustrative footprint clears confirmed obstacles within the verified room area."}</p>}</section>
            <section className={`assessment ${result.conditionalWarnings.length ? 'conflict' : 'neutral'}`}><div className="assessment-title"><h3><span className="status-icon" aria-hidden="true">{result.conditionalWarnings.length ? '!' : 'i'}</span>Cat safety</h3><span className="status-label">{!state.hasCat ? 'Not applied' : plant.catSafety === 'toxic' ? 'Warning' : plant.catSafety === 'non-toxic' ? 'Non-toxic' : 'Unknown'}</span></div><p>{!state.hasCat ? 'Have a cat? Turn on the household setting below.' : result.conditionalWarnings[0] || (plant.catSafety === 'non-toxic' ? 'ASPCA lists this species as non-toxic to cats. It is still best to discourage chewing.' : 'Safety has not been verified for this species.')}</p>{state.hasCat && plant.source && <a href={plant.source} target="_blank" rel="noreferrer">ASPCA species reference <span aria-hidden="true">↗</span></a>}</section>
            <section className="assessment preference"><div className="assessment-title"><h3><span className="status-icon" aria-hidden="true">≈</span>Living with it</h3><span className="status-label">Your taste</span></div><p>{result.preferenceNotes[0]}</p></section>
            <section className="assessment unknown"><div className="assessment-title"><h3><span className="status-icon" aria-hidden="true">?</span>Light</h3><span className="status-label">{home.light === "unknown" ? "Unknown" : "Self-reported"}</span></div><p>{result.unknowns[0]}</p></section>
          </div>
          <div className="preferences"><h3>Make it yours</h3><Segments label="Aesthetic preference" value={state.style} options={[{ value: 'airy', label: 'Airy' }, { value: 'jungle', label: 'Urban Jungle' }]} onChange={style => update({ style })} /><div className="cat-setting"><label htmlFor="cat-toggle">Cat at home</label><button id="cat-toggle" className="switch" role="switch" aria-checked={state.hasCat} aria-label="Cat at home" onClick={() => update({ hasCat: !state.hasCat })}><span /></button></div><p>Your style changes the interpretation.<br />Space and safety checks stay the same.</p></div>
        </aside>
      </div>
      <footer className="app-footer"><span>A preview, not a promise.</span><p>Illustrative sizes; real-world fit needs a closer look. Existing owned plants are shown as context; plant-to-plant overlap is not assessed.</p><span className="footer-brand">Rooted · Preview</span></footer>
    </main>
    <dialog ref={dialog} className="confirm-panel" aria-labelledby="adopt-title" onCancel={() => setConfirm(false)}>
      <h2 id="adopt-title">Bring this plant home?</h2><p>Confirm only when you have brought it home. This creates a separate owned plant, dated today.</p>
      <label className="field">Plant nickname<input autoFocus maxLength={60} value={nickname} onChange={e => setNickname(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setConfirm(false); }} /></label>
      {result.hardConflicts.map(note => <p className="warning-text" key={note}>! {note}</p>)}
      {result.conditionalWarnings.map(note => <p className="warning-text" key={note}>! {note}</p>)}
      {unassessed && <p>Space is not fully assessed on this uploaded plan.</p>}
      <div className="button-row"><button className="secondary" onClick={() => setConfirm(false)}>Keep previewing</button><button className="primary" onClick={() => { setConfirm(false); onAdopt(nickname); }}>Confirm adoption</button></div>
    </dialog>

  </>;
}
