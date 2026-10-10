import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, evaluate, parseState, room, circleRect, moveTo, species } from '../src/model.ts';

test('T01: bed and clearance overlaps appear and disappear on movement', () => {
  assert.ok(evaluate({ ...defaults, x: 1, y: 1 }).overlapIds.includes('bed'));
  assert.ok(evaluate({ ...defaults, x: 3.3, y: 3 }).overlapIds.includes('door'));
  assert.equal(evaluate({ ...defaults, x: 2.7, y: 1.8 }).hardConflicts.length, 0);
});
test('T02: default current is clear; mature overlaps the door zone', () => {
  assert.equal(evaluate(defaults).hardConflicts.length, 0);
  assert.deepEqual(evaluate({ ...defaults, mode: 'mature' }).overlapIds, ['door']);
});
test('T03: taste cannot suppress geometry or safety', () => {
  const airy = evaluate({ ...defaults, mode: 'mature', hasCat: true });
  const jungle = evaluate({ ...defaults, mode: 'mature', hasCat: true, style: 'jungle' });
  assert.deepEqual(airy.hardConflicts, jungle.hardConflicts);
  assert.deepEqual(airy.conditionalWarnings, jungle.conditionalWarnings);
  assert.notDeepEqual(airy.preferenceNotes, jungle.preferenceNotes);
});
test('T04: cat setting and species affect safety, not geometry', () => {
  for (const plant of species) {
    const base = { ...defaults, speciesId: plant.id };
    assert.deepEqual(evaluate(base).hardConflicts, evaluate({ ...base, hasCat: true }).hardConflicts);
    assert.equal(evaluate({ ...base, hasCat: true }).conditionalWarnings.length, plant.catSafety === 'toxic' ? 1 : 0);
    assert.ok(plant.source?.startsWith('https://www.aspca.org/'));
  }
  assert.equal(evaluate(defaults).conditionalWarnings.length, 0);
});
test('T05: persistence round trip, corrupt values, and stable instance ID', () => {
  const saved = { ...defaults, speciesId: 'snake', x: 3.1, y: 1.9, mode: 'mature', style: 'jungle', hasCat: true };
  assert.deepEqual(parseState(JSON.stringify(saved)), saved);
  for (const raw of [null, '', '{', '{}', 'null', '3', '[]', JSON.stringify({ ...defaults, speciesId: 'invalid' }), JSON.stringify({ ...defaults, x: -1 }), JSON.stringify({ ...defaults, x: '2' }), JSON.stringify({ ...defaults, hasCat: 'yes' }), JSON.stringify({ ...defaults, mode: 'future' }), JSON.stringify({ ...defaults, y: 99 })]) assert.deepEqual(parseState(raw), defaults);
});
test('T06: light remains unknown across all preferences and species', () => {
  for (const plant of species) for (const style of ['airy', 'jungle'] as const) {
    assert.match(evaluate({ ...defaults, speciesId: plant.id, style, hasCat: true }).unknowns[0], /has not been verified/);
  }
});
test('geometry: tangent, near corner, inside, wall overflow and coordinate clamp', () => {
  const rect = { id: 'r', label: 'r', x: 1, y: 1, width: 1, height: 1 };
  assert.equal(circleRect(0.5, 1.5, 0.5, rect), false);
  assert.equal(circleRect(0.51, 1.5, 0.5, rect), true);
  assert.equal(circleRect(0.6, 0.6, 0.5, rect), false);
  assert.equal(circleRect(1.5, 1.5, 0.01, rect), true);
  assert.match(evaluate({ ...defaults, x: 0, y: 3 }).hardConflicts.join(' '), /beyond the room/);
  assert.deepEqual(moveTo(-3, 10), { x: 0, y: room.height });
});
