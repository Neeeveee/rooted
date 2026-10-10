import { useEffect, useRef, useState } from 'react';
import { applyGeometryImport, importGeometry } from './floorplanImport';
import type { Home } from './appModel';
export function Recognition({ home, onChange, onReady }: { home: Home; onChange: (home: Home) => void; onReady?:()=>void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const latestHome = useRef(home); latestHome.current = home;
  const active = useRef<AbortController | null>(null);
  useEffect(() => { setBusy(false); return () => { active.current?.abort(); }; }, [home.backgroundImageDataUrl]);
  async function detect() {
    const controller = new AbortController(); active.current = controller;
    setBusy(true); setError(''); setComplete(false);
    try {
      const actual = await new Promise<{ width: number; height: number }>((resolve, reject) => { const img = new Image(); img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight }); img.onerror = reject; img.src = home.backgroundImageDataUrl!; });
      const response = await fetch('/api/floorplan/recognize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: home.backgroundImageDataUrl, ...actual }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Recognition failed.');
      const imported = importGeometry(data.geometry, 'gemini');
      imported.metadata.notes = ['Gemini vision detection · approximate and unverified.', 'Review every boundary, obstacle and door clearance. Add missed objects and mark unknown areas. Scale must be calibrated manually.'];
      if (controller.signal.aborted) return;
      if (latestHome.current !== home) throw new Error('Your draft changed during recognition. Results were not applied; retry when editing is finished.');
      onChange(applyGeometryImport(home, imported, actual)); setComplete(true); onReady?.();
    } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Recognition could not complete. Your current plan is unchanged.'); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }
  return <section className="import-notes" aria-label="Automatic floor-plan recognition"><h3>Read your plan <span className="beta-label">Beta</span></h3><p className="fine-print">Gemini suggests preliminary rooms, furniture, walls, doors and windows. It can miss or misplace objects. Every result needs your review and scale calibration. No recognition runs until you click below. Google’s Free Tier may use submitted content to improve its products.</p><p className="fine-print">Recognition replaces draft overlays and resets verification. Your saved home is unchanged until you save.</p><button className="primary" disabled={busy} onClick={() => void detect()}>{busy ? 'Reading your floor plan…' : 'Recognize with Gemini'}</button>{busy && <p role="status">This may take up to a minute. Keep this page open.</p>}{complete && <p role="status">Detection ready. Open Review & calibrate to check the unconfirmed regions before saving.</p>}{error && <p role="alert" className="warning-text">{error}</p>}</section>;
}
