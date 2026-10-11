import test from 'node:test';
import assert from 'node:assert/strict';
import { recordingStorage, recordingKey } from '../src/temporaryRecording.ts';
import { appKey, freshStore, loadStore, saveStore, adopt, recommend } from '../src/appModel.ts';
test('temporary recording seeds once, saves independent adoptions, and leaves normal data untouched',()=>{
 const normal=JSON.stringify(freshStore());const map=new Map([[appKey,normal]]);
 const raw={getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);}};
 const temp=recordingStorage(raw);const initial=loadStore(temp);
 assert.equal(initial.warning,'');assert.equal(initial.store.home.ready,true);assert.equal(initial.store.profile.onboardingDone,true);
 assert.equal(initial.store.ownedPlants.length,1);assert.equal(initial.store.ownedPlants[0].nickname,'Window companion');
 assert.equal(recommend(initial.store.profile,initial.store.home)[0].plant.id,'spider');
 const next=adopt({...initial.store,preview:{...initial.store.preview,x:2.35,y:3}},'Reading companion');
 assert.equal(saveStore(temp,next),'');const refreshed=loadStore(recordingStorage(raw)).store;
 assert.equal(refreshed.ownedPlants.length,2);assert.notEqual(refreshed.ownedPlants[0].id,refreshed.ownedPlants[1].id);
 assert.equal(map.get(appKey),normal);assert.equal(loadStore(raw).store.ownedPlants.length,0);assert.ok(map.has(recordingKey));
});
test('temporary recording does not overwrite unreadable existing temporary data',()=>{
 let writes=0;const raw={getItem:()=>'{broken',setItem:()=>{writes++}};
 assert.ok(loadStore(recordingStorage(raw)).warning);assert.equal(writes,0);
});
