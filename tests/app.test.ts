import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adopt, appKey, assessment, changeHome, demoHome, editPlant, freshStore, loadStore, parseStore, recommend, saveStore, uid } from '../src/appModel.ts';
import { defaults, storageKey } from '../src/model.ts';

function memory(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}
test('onboarding answers and home configuration survive versioned storage', () => {
  const store = freshStore();
  store.profile = { style: 'jungle', careTime: 'high', experience: 'experienced', hasCat: true, onboardingDone: true };
  store.home = { ...demoHome, ready: true, light: 'low', lightLocation: 'North corner' };
  const storage = memory();
  assert.equal(saveStore(storage, store), '');
  const loaded = loadStore(storage).store;
  assert.deepEqual(loaded.profile, store.profile);
  assert.deepEqual(loaded.home, store.home);
  assert.equal(loaded.preview.style, 'jungle');
  assert.equal(loaded.preview.hasCat, true);
  assert.equal(loaded.ownedPlants.length, 0);
});
test('legacy migration carries preferences and preview without auto-adoption or erasure', () => {
  const legacy = JSON.stringify({ ...defaults, speciesId: 'spider', style: 'jungle', hasCat: true });
  const storage = memory({ [storageKey]: legacy });
  const store = loadStore(storage).store;
  assert.equal(store.preview.speciesId, 'spider');
  assert.equal(store.profile.hasCat, true);
  assert.equal(store.profile.onboardingDone, false);
  assert.equal(store.ownedPlants.length, 0);
  assert.equal(storage.getItem(storageKey), legacy);
  saveStore(storage, store);
  storage.setItem(storageKey, JSON.stringify(defaults));
  assert.equal(loadStore(storage).store.preview.speciesId, 'spider');
});
test('corrupt or invalid v2 storage is safe and does not silently re-migrate or overwrite', () => {
  const bad = ['{', 'null', '[]', JSON.stringify({ version: 3 }), JSON.stringify({ ...freshStore(), ownedPlants: [{ id: 'bad' }] }), JSON.stringify({ ...freshStore(), home: { ...demoHome, widthM: -3 } })];
  for (const raw of bad) {
    const storage = memory({ [appKey]: raw, [storageKey]: JSON.stringify({ ...defaults, hasCat: true }) });
    assert.equal(loadStore(storage).store.profile.hasCat, false);
    assert.ok(loadStore(storage).warning);
    assert.equal(storage.getItem(appKey), raw);
  }
});
test('quota and unavailable storage report failure without replacing previous saved data', () => {
  const stored = JSON.stringify(freshStore());
  const full = { getItem: () => stored, setItem: () => { throw new Error('QuotaExceededError'); } };
  assert.match(saveStore(full, adopt(freshStore(), 'Fern')), /Not saved/);
  assert.equal(full.getItem(), stored);
  const unavailable = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => { throw new Error('SecurityError'); } };
  assert.match(loadStore(unavailable).warning, /unavailable/);
});
test('recommendations are deterministic, explain style, care, experience and home inputs', () => {
  const s = freshStore();
  const ids = (r: ReturnType<typeof recommend>) => r.map(r => r.plant.id);
  const base = recommend(s.profile, s.home);
  assert.deepEqual(base, recommend(s.profile, s.home));
  const jungle = recommend({ ...s.profile, style: 'jungle', careTime: 'moderate', experience: 'experienced' }, s.home);
  assert.notDeepEqual(ids(base), ids(jungle));
  assert.equal(jungle[0].plant.id, 'monstera');
  const easy = recommend({ ...s.profile, careTime: 'low', experience: 'beginner' }, { ...s.home, light: 'low' });
  assert.ok(easy[0].reasons.some(r => r.includes('care time')));
  assert.ok(easy[0].reasons.some(r => r.includes('first plant')));
  assert.ok(easy[0].reasons.some(r => r.includes('lower light')));
  const unknown = recommend(s.profile, { ...s.home, widthM: undefined, heightM: undefined });
  assert.ok(unknown.every(r => !r.reasons.some(reason => reason.includes('room bounds') || reason.includes('lower light'))));
});
test('cat safety is a separate ranking tier and toxic plants remain browsable', () => {
  const s = freshStore();
  const picks = recommend({ ...s.profile, hasCat: true, style: 'jungle', careTime: 'high' }, s.home);
  assert.equal(picks.length, 6);
  assert.equal(picks[0].plant.catSafety, 'non-toxic');
  assert.deepEqual(picks.slice(-2).map(r => r.plant.catSafety), ['toxic', 'toxic']);
  assert.ok(picks.some(r => r.plant.id === 'monstera'));
});
test('adoption is explicit, independent, dated, and does not consume or mutate preview', () => {
  const original = freshStore();
  const first = adopt(original, 'Moss', '2026-10-09T10:00:00.000Z', 'first');
  const second = adopt(first, 'Moss II', '2026-10-10T10:00:00.000Z', 'second');
  assert.equal(original.ownedPlants.length, 0);
  assert.equal(second.ownedPlants.length, 2);
  assert.deepEqual(second.preview, original.preview);
  assert.equal(second.ownedPlants[0].speciesId, second.ownedPlants[1].speciesId);
  assert.notEqual(second.ownedPlants[0].id, second.ownedPlants[1].id);
  assert.notEqual(second.ownedPlants[0].events, second.ownedPlants[1].events);
  assert.deepEqual(second.ownedPlants[0].events, []);
  assert.equal(second.ownedPlants[0].status, 'active');
  assert.throws(() => adopt(second, 'Duplicate', undefined, 'first'));
  assert.equal(new Set(Array.from({ length: 100 }, uid)).size, 100);
});
test('two identical species move and rename independently and survive refresh', () => {
  const s = adopt(adopt(freshStore(), 'One', undefined, 'one'), 'Two', undefined, 'two');
  const edited = editPlant(s, 'two', { x: 3, y: 2, nickname: 'Second' });
  assert.deepEqual(edited.ownedPlants[0], s.ownedPlants[0]);
  assert.equal(edited.ownedPlants[1].x, 3);
  assert.equal(edited.ownedPlants[1].nickname, 'Second');
  assert.deepEqual(edited.preview, s.preview);
  assert.deepEqual(parseStore(JSON.stringify(edited))?.ownedPlants, edited.ownedPlants);
  const without = { ...edited, ownedPlants: edited.ownedPlants.filter(p => p.id !== 'two') };
  assert.equal(without.ownedPlants[0].id, 'one');
  assert.deepEqual([...without.ownedPlants, edited.ownedPlants[1]], edited.ownedPlants);
});
test('uploaded backgrounds never imply demo furniture checks or measured light', () => {
  const uploaded = { ...demoHome, mode: 'uploaded' as const, widthM: undefined, heightM: undefined };
  const result = assessment({ ...defaults, x: 1, y: 1 }, uploaded);
  assert.deepEqual(result.hardConflicts, []);
  assert.deepEqual(result.overlapIds, []);
  assert.ok(result.unknowns.some(n => n.includes('not assessed')));
  assert.match(assessment(defaults, { ...uploaded, light: 'bright', lightLocation: 'Desk' }).unknowns[0], /self-reported/);
  assert.equal(assessment({ ...defaults, x: 0, y: 0 }, { ...uploaded, widthM: 5, heightM: 5 }).spaceStatus, 'unknown');
});
test('changing home bounds preserves relative locations and unmeasured mode persists', () => {
  const s = adopt(freshStore(), 'One');
  const changed = changeHome(s, { ...demoHome, mode: 'uploaded', widthM: 8, heightM: 7.2, ready: true });
  assert.equal(changed.ownedPlants[0].x, s.ownedPlants[0].x * 2);
  assert.equal(changed.preview.y, s.preview.y * 2);
  assert.ok(parseStore(JSON.stringify(changed)));
  const unmeasured = changeHome(changed, { ...changed.home, widthM: undefined, heightM: undefined });
  assert.ok(parseStore(JSON.stringify(unmeasured)));
});
test('invalid images, duplicate IDs and bad adoption dates are rejected', () => {
  const s = adopt(freshStore(), 'One');
  assert.equal(parseStore(JSON.stringify({ ...s, ownedPlants: [...s.ownedPlants, s.ownedPlants[0]] })), null);
  assert.equal(parseStore(JSON.stringify({ ...s, ownedPlants: [{ ...s.ownedPlants[0], adoptedAt: 'bad' }] })), null);
  assert.equal(parseStore(JSON.stringify({ ...s, home: { ...s.home, backgroundImageDataUrl: 'https://external.example/track.png' } })), null);
});
