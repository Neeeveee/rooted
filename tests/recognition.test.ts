import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { recognize, createRecognitionMiddleware, MODEL } from '../server/recognition.mjs';
import { assessment, freshStore, parseStore } from '../src/appModel.ts';
import { applyGeometryImport } from '../src/floorplanImport.ts';
const image = 'data:image/jpeg;base64,' + readFileSync(new URL('../public/fixtures/apartment-test.jpg', import.meta.url)).toString('base64');
const input = { image, width: 849, height: 1200 };
const region = { id: 'bed', label: 'Bed', kind: 'furniture', x: 600, y: 200, width: 100, height: 100, confirmed: true };
const success = () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ coordinateSystem: 'normalized-0-1000', regions: [region] }) }] } }] });
test('Gemini receives image and JSON instructions with key only in server header; all results require verification', async () => {
  let calls = 0;
  const result = await recognize(input, { apiKey: 'test-secret', fetcher: async (url, options) => {
    calls++; assert.equal(url, `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`);
    assert.equal(options.headers['x-goog-api-key'], 'test-secret');
    assert.ok(!options.body.includes('test-secret'));
    const body = JSON.parse(options.body);
    assert.equal(body.contents[0].parts[0].inlineData.mimeType, 'image/jpeg');
    assert.equal(body.generationConfig.responseMimeType, 'application/json'); return success();
  } });
  assert.equal(calls, 1); assert.equal(result.metadata.origin, 'gemini');
  assert.equal(result.geometry.regions[0].confirmed, false);
  assert.equal(result.geometry.regions[0].x, .6);
  assert.ok(!JSON.stringify(result).includes('test-secret'));
  const home = applyGeometryImport(freshStore().home, { regions: result.geometry.regions, metadata: result.metadata }, { width: 849, height: 1200 });
  const s = { ...freshStore(), home };
  assert.equal(assessment(s.preview, home).spaceStatus, 'unknown');
  assert.equal(parseStore(JSON.stringify(s))?.home.geometryImport?.origin, 'gemini');
});
test('missing configuration and invalid images never call Google', async () => {
  let calls = 0; const fetcher = async () => { calls++; return success(); };
  await assert.rejects(recognize(input, { fetcher }), /not configured/);
  await assert.rejects(recognize({ ...input, image: 'https://example.com/plan.jpg' }, { apiKey: 'secret', fetcher }), /image/);
  await assert.rejects(recognize({ ...input, width: -1 }, { apiKey: 'secret', fetcher }), /dimensions/);
  assert.equal(calls, 0);
});
test('upstream failures are redacted and never retried or switched to paid models', async () => {
  for (const status of [429, 403, 500]) {
    let calls = 0;
    await assert.rejects(recognize(input, { apiKey: 'secret', fetcher: async () => { calls++; return new Response('secret credentials in upstream message', { status }); } }), e => !e.message.includes('secret') && e.status === (status === 429 ? 429 : 502));
    assert.equal(calls, 1);
  }
  await assert.rejects(recognize(input, { apiKey: 'secret', fetcher: async () => { throw new Error('secret'); } }), e => e.status === 504 && !e.message.includes('secret'));
});
test('blocked, truncated or invalid geometry cannot replace current plan', async () => {
  for (const response of [Response.json({ candidates: [{ finishReason: 'MAX_TOKENS' }] }), Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{bad' }] } }] }), Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"regions":[]}' }] } }] })]) {
    await assert.rejects(recognize(input, { apiKey: 'test', fetcher: async () => response }), /no usable geometry/);
  }
});
async function request(middleware, { origin = 'http://localhost:5173', method = 'POST', contentType = 'application/json', body = input } = {}) {
  const req = Readable.from([Buffer.from(JSON.stringify(body))]);
  Object.assign(req, { url: '/api/floorplan/recognize', method, headers: { origin, host: 'localhost:5173', 'content-type': contentType } });
  let status = 0, result;
  const res = { writeHead(code) { status = code; }, end(value) { result = JSON.parse(value); } };
  await middleware(req, res, () => {}); return { status, result };
}
test('API rejects cross-origin/malformed requests and throttles repeated recognition', async () => {
  let calls = 0;
  const middleware = createRecognitionMiddleware({ apiKey: 'test', fetcher: async () => { calls++; return success(); } });
  assert.equal((await request(middleware, { origin: 'https://attacker.example' })).status, 403);
  assert.equal((await request(middleware, { origin: 'invalid' })).status, 403);
  assert.equal((await request(middleware, { method: 'GET' })).status, 405);
  assert.equal((await request(middleware, { contentType: 'text/plain' })).status, 415);
  assert.equal((await request(middleware)).status, 200);
  assert.equal((await request(middleware)).status, 429);
  assert.equal(calls, 1);
});
