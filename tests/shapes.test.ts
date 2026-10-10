import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { regression } from '../scripts/overlay-regression.mjs';
import { regionHit, validShape, geometryWarnings, shapeBounds, svgPoints } from '../src/spatial.ts';
import { assessment, freshStore, parseStore, adopt } from '../src/appModel.ts';
import { importGeometry } from '../src/floorplanImport.ts';
import type { Region } from '../src/appModel.ts';
const poly:Region={id:'poly',label:'L room',kind:'room',x:0,y:0,width:1,height:1,confirmed:true,reviewed:true,shape:{type:'polygon',points:[[0,0],[1,0],[1,.4],[.4,.4],[.4,1],[0,1]]}};
test('offline original response, conversion and image are pinned; historical request identity is honestly unproven',async()=>{
 const r=await regression();const manifest=JSON.parse(await readFile(new URL('./fixtures/provenance.json',import.meta.url),'utf8'));
 for(const [path,hash] of Object.entries(manifest.sha256))assert.equal(createHash('sha256').update(await readFile(new URL('../'+path,import.meta.url))).digest('hex'),hash);
 assert.equal(manifest.historicalIdentityVerified,false);
 assert.equal(r.payload.regions.length,r.converted.geometry.regions.length);
 for(let i=0;i<r.payload.regions.length;i++)for(const k of ['x','y','width','height'])assert.equal(r.payload.regions[i][k]/1000,r.converted.geometry.regions[i][k]);
 assert.equal(r.svg,await readFile(new URL('./fixtures/overlay-regression.svg',import.meta.url),'utf8'));
 assert.equal(svgPoints({...poly,shape:undefined,x:.673,y:.247,width:.189,height:.16},849,1200).split(' ')[0],'571.3770000000001,296.4');
});
test('concave polygons avoid bounding-box false positives and require entire circular footprint inside room',()=>{
 assert.equal(regionHit(poly,[8,8],.2,10,10),false);
 assert.equal(regionHit(poly,[2,8],.2,10,10,true),true);
 assert.equal(regionHit(poly,[3.9,8],.2,10,10,true),false);
 assert.equal(regionHit(poly,[4.1,8],.2,10,10),true);
 const diagonal={...poly,kind:'wall' as const,shape:{type:'line' as const,points:[[0,0],[1,1]] as [[number,number],[number,number]],thickness:.01}};
 assert.equal(regionHit(diagonal,[5,5],.1,10,5),false);assert.equal(regionHit(diagonal,[5,2.5],.1,10,5),true);
});
test('invalid and self-intersecting polygons and malformed line thickness are rejected',()=>{
 assert.ok(validShape(poly));assert.equal(validShape({...poly,shape:{type:'polygon',points:[[0,0],[1,1],[0,1],[1,0]]}}),false);
 assert.equal(validShape({...poly,shape:{type:'line',points:[[0,0],[1,1]],thickness:.01}}),false);
 assert.equal(validShape({...poly,kind:'wall',shape:{type:'line',points:[[0,0],[1,1]],thickness:-1}}),false);
});
test('shape import, persistence and adoption remain independent; opening is informational, clearance collides',()=>{
 const room={...poly,id:'room',shape:{type:'polygon' as const,points:[[0,0],[1,0],[1,1],[0,1]] as [number,number][]}};
 const door:Region={...poly,id:'door',label:'Door',kind:'door',shape:{type:'line',points:[[.2,.1],[.2,.3]],thickness:.01},doorRole:'opening'};
 let store=freshStore();store.home={...store.home,mode:'uploaded',widthM:10,heightM:10,geometryVerified:true,calibration:{a:[0,0],b:[1,0],meters:10,aspect:1},regions:[room,door]};store.preview={...store.preview,x:2,y:2};store=adopt(adopt(store,'First',undefined,'one'),'Second',undefined,'two');
 assert.equal(assessment(store.preview,store.home).spaceStatus,'clear');
 assert.equal(assessment(store.preview,{...store.home,regions:[room,{...door,doorRole:'clearance'}]}).spaceStatus,'conflict');
 const parsed=parseStore(JSON.stringify(store));assert.ok(parsed);assert.deepEqual(parsed.ownedPlants,store.ownedPlants);
 assert.deepEqual(parsed.home.regions?.[1].shape,door.shape);
 const imported=importGeometry({version:1,coordinateSystem:'normalized-0-1',imageWidth:100,imageHeight:100,regions:[{...door,...shapeBounds(door.shape!.points)}]});assert.equal(imported.regions[0].confirmed,false);assert.deepEqual(imported.regions[0].shape,door.shape);
});
test('oversized and duplicate geometry is flagged and blocks new trust until explicitly reviewed',()=>{
 const a:Region={id:'a',label:'Large bed',kind:'furniture',x:.1,y:.1,width:.5,height:.5,confirmed:true,reviewed:false};const b={...a,id:'b'};
 assert.ok(geometryWarnings([a,b]).a.length>=2);
 const s=freshStore();const h={...s.home,mode:'uploaded' as const,widthM:10,heightM:10,calibration:{a:[0,0] as [number,number],b:[1,0] as [number,number],meters:10,aspect:1},regions:[a]};
 assert.equal(assessment({...s.preview,x:2,y:2},h).spaceStatus,'unknown');assert.equal(assessment({...s.preview,x:2,y:2},{...h,regions:[{...a,reviewed:true}]}).spaceStatus,'conflict');
});

test('wall through room interior flags both regions; non-overlapping regions stay unflagged',()=>{
 const room={...poly,shape:{type:'polygon' as const,points:[[.1,.1],[.9,.1],[.9,.9],[.1,.9]] as [number,number][]}};
 const wall:Region={id:'wall',label:'Wall',kind:'wall',confirmed:false,x:.5,y:.2,width:0,height:.6,shape:{type:'line',points:[[.5,.2],[.5,.8]],thickness:.005}};
 assert.ok(geometryWarnings([room,wall]).wall.some(s=>s.includes('interior')));assert.ok(geometryWarnings([room,wall]).poly.some(s=>s.includes('wall')));
 assert.equal(validShape({...poly,shape:{type:'polygon',points:[[0,0],[0,0],[1,0],[1,1]]}}),false);
});
