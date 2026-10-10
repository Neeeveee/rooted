import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessment, potentialOverlaps, placementExplanation, verificationNeeds, calibratedSize, changeHome, freshStore, parseStore, saveStore, loadStore } from '../src/appModel.ts';
import type { Home, Region } from '../src/appModel.ts';
import { defaults } from '../src/model.ts';
const room: Region = { id: 'room', label: 'Living room', kind: 'room', x: .05, y: .05, width: .9, height: .9, confirmed: true };
const calibration = { a: [0, 0] as [number, number], b: [1, 0] as [number, number], meters: 10, aspect: 2 };
const home: Home = { ...freshStore().home, mode: 'uploaded', widthM: 10, heightM: 5, calibration, regions: [room], geometryVerified: true };
const state = { ...defaults, speciesId: 'snake', x: 3, y: 2 };
test('unmeasured or unverified uploaded plans never claim clear, even with old entered dimensions', () => {
  for (const h of [{ ...home, calibration: undefined }, { ...home, geometryVerified: false }, { ...home, regions: [] }]) {
    const r = assessment(state, h);
    assert.equal(r.spaceStatus, 'unknown');
    assert.deepEqual(r.hardConflicts, []);
  }
});
test('two-point scale calibration respects source image aspect and diagonal distances', () => {
  assert.deepEqual(calibratedSize(calibration), { width: 10, height: 5 });
  assert.deepEqual(calibratedSize({ ...calibration, b: [0, 1], meters: 5 }), { width: 10, height: 5 });
  const diagonal = calibratedSize({ ...calibration, b: [1, 1], meters: Math.sqrt(125) });
  assert.ok(diagonal && Math.abs(diagonal.width - 10) < 1e-10);
  assert.equal(calibratedSize({ ...calibration, b: [0, 0] }), null);
  assert.equal(calibratedSize({ ...calibration, meters: -1 }), null);
});
test('confirmed furniture, wall and door overlaps reuse circle-rectangle detection', () => {
  for (const kind of ['furniture', 'wall', 'door'] as const) {
    const obstacle: Region = { ...room, id: kind, kind, label: 'Test obstacle', x: .3, y: .3, width: .1, height: .2 };
    const h = { ...home, regions: [room, obstacle] };
    const r = assessment(state, h);
    assert.equal(r.spaceStatus, 'conflict'); assert.deepEqual(r.overlapIds, [kind]);
    assert.equal(assessment({ ...state, x: 7, y: 3 }, h).spaceStatus, 'clear');
    assert.equal(assessment(state, { ...h, calibration: undefined }).spaceStatus, 'unknown');
  }
});
test('unknown regions, uncertain obstacles and outside-room placements stay unknown', () => {
  const unknown: Region = { ...room, id: 'unknown', kind: 'unknown', x: .2, y: .2, width: .3, height: .3, confirmed: false };
  assert.equal(assessment(state, { ...home, regions: [room, unknown] }).spaceStatus, 'unknown');
  assert.equal(assessment({ ...state, x: 7, y: 3 }, { ...home, regions: [room, unknown] }).spaceStatus, 'clear');
  assert.equal(assessment(state, { ...home, regions: [room, { ...unknown, kind: 'furniture' }] }).spaceStatus, 'unknown');
  assert.equal(assessment({ ...state, x: .4, y: 2 }, home).spaceStatus, 'unknown');
});
test('current and mature sizes change verified overlap while window alone is informational', () => {
  const obstacle: Region = { ...room, id: 'sofa', label: 'Sofa', kind: 'furniture', x: .34, y: .3, width: .1, height: .2 };
  const h = { ...home, regions: [room, obstacle] };
  assert.equal(assessment({ ...state, speciesId: 'monstera', mode: 'current' }, h).spaceStatus, 'clear');
  assert.equal(assessment({ ...state, speciesId: 'monstera', mode: 'mature' }, h).spaceStatus, 'conflict');
  assert.equal(assessment(state, { ...home, regions: [room, { ...obstacle, kind: 'window', x: .3 }] }).spaceStatus, 'clear');
});
test('calibration and verified regions persist without replacing independent plant records', () => {
  const s = changeHome(freshStore(), home);
  let raw = ''; const storage = { getItem: () => raw, setItem: (_key: string, value: string) => { raw = value; } };
  assert.equal(saveStore(storage, s), '');
  assert.deepEqual(loadStore(storage).store.home, home);
  assert.equal(assessment(state, loadStore(storage).store.home).spaceStatus, 'clear');
  assert.equal(parseStore(JSON.stringify({ ...s, home: { ...home, calibration: { ...calibration, b: [0, 0] } } })), null);
  assert.equal(parseStore(JSON.stringify({ ...s, home: { ...home, regions: [room, room] } })), null);
  assert.equal(parseStore(JSON.stringify({ ...s, home: { ...home, regions: [{ ...room, width: 5 }] } })), null);
  assert.equal(parseStore(JSON.stringify({ ...s, home: { ...home, widthM: 11 } })), null);
});

test('verification checklist identifies exact blockers without confirming geometry', () => {
  const obstacle: Region = {...room,id:'sofa',kind:'furniture',label:'Sofa',x:.3,y:.3,width:.1,height:.2,confirmed:false};
  const draft = {...home,calibration:undefined,geometryVerified:false,regions:[{...room,confirmed:false},obstacle]};
  const needs = verificationNeeds(draft);
  assert.equal(needs.scale,true); assert.equal(needs.room,true); assert.equal(needs.pending.length,2); assert.equal(needs.ready,false);
  assert.equal(verificationNeeds(home).ready,true);
  assert.equal(obstacle.confirmed,false);
});
test('unmeasured marker overlap explains missing scale without claiming collision; calibrated confirmed overlap turns red', () => {
  const obstacle: Region = {...room,id:'sofa',kind:'furniture',label:'Sofa',x:.3,y:.3,width:.1,height:.2};
  const draft = {...home,calibration:undefined,geometryVerified:false,regions:[room,obstacle]};
  const position = {...state,x:3.5,y:2}; // Old dimensions may persist but never authorize measured checks.
  assert.match(placementExplanation(position,draft),/Marker lies on mapped Sofa/);
  assert.match(placementExplanation(position,draft),/Scale is unknown/);
  assert.equal(assessment(position,draft).spaceStatus,'unknown');
  assert.equal(assessment(state,{...draft,calibration,widthM:10,heightM:5}).spaceStatus,'conflict');
});

test('every unconfirmed obstacle gives provisional overlap feedback, without claiming verified safety', () => {
  for(const kind of ['furniture','wall','door'] as const){
    const obstacle:Region={...room,id:kind,label:kind,kind,x:.3,y:.3,width:.1,height:.2,confirmed:false};
    const h={...home,geometryVerified:false,regions:[room,obstacle]};
    assert.deepEqual(potentialOverlaps(state,h).map(r=>r.id),[kind]);
    assert.equal(assessment(state,h).spaceStatus,'unknown');
    assert.equal(potentialOverlaps({...state,x:8,y:3},h).length,0);
    assert.equal(potentialOverlaps(state,{...h,regions:[room,{...obstacle,kind:'window'}]}).length,0);
    assert.equal(potentialOverlaps(state,{...h,regions:[room,{...obstacle,confirmed:true}]}).length,0);
  }
});
