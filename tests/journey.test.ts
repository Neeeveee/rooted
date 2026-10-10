import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshStore, parseStore, adoptCustom, assessment, recommend, switchHomeMode, adopt, editPlant } from '../src/appModel.ts';
import { landingStage, afterHomeSave, petsWithCat, reviewRegions, searchPlants, beginJourney, quizDraft } from '../src/journeyState.ts';

test('Start remains the entry while unfinished quiz progress and older profiles still load', () => {
  const store = freshStore();
  assert.equal(landingStage(store), 'welcome');
  store.profile = {...store.profile, quizStep: 2, pets: 'dog', careTime: 'low'};
  const loaded = parseStore(JSON.stringify(store))!;
  assert.equal(landingStage(loaded), 'welcome');
  assert.equal(loaded.profile.quizStep, 2);
  assert.equal(loaded.profile.pets, 'dog');
  assert.ok(parseStore(JSON.stringify(freshStore())));
  for (const quizStep of [-1,8,1.5]) assert.equal(parseStore(JSON.stringify({...store,profile:{...store.profile,quizStep}})), null);
});
test('editing a ready home returns to the originating journey stage', () => {
  assert.equal(afterHomeSave(false,'home'),'preview');
  for (const stage of ['home','discover','preview'] as const) assert.equal(afterHomeSave(true,stage),stage);
  assert.equal(afterHomeSave(true,'quiz'),'preview');
});
test('saving Demo Home retains uploaded plan and independent adopted instances', () => {
  let store = freshStore();
  store.home = {...store.home,mode:'uploaded',ready:true,backgroundImageDataUrl:'data:image/png;base64,aGVsbG8=',regions:[],geometryVerified:false};
  const original = store.home;
  store = adopt(adopt(store,'First','2026-10-09T00:00:00.000Z','a'),'Second','2026-10-09T00:00:00.000Z','b');
  store.home = switchHomeMode(store.home,'demo');
  const loaded = parseStore(JSON.stringify(store))!;
  assert.ok(loaded);
  assert.deepEqual(switchHomeMode(loaded.home,'uploaded').regions,original.regions);
  assert.equal(switchHomeMode(loaded.home,'uploaded').backgroundImageDataUrl,original.backgroundImageDataUrl);
  assert.equal(loaded.ownedPlants.length,2);
  assert.equal(loaded.ownedPlants[0].speciesId,loaded.ownedPlants[1].speciesId);
  assert.equal(editPlant(loaded,'a',{nickname:'Changed'}).ownedPlants[1].nickname,'Second');
});
test('cat feedback toggles preserve dog answers', () => {
  const profile = {...freshStore().profile,pets:'dog' as const};
  assert.equal(petsWithCat(profile,true),'both');
  assert.equal(petsWithCat({...profile,pets:'both'},false),'dog');
});
test('review filters affect visibility without removing saved geometry', () => {
  const regions = [{id:'f',label:'Desk',kind:'furniture' as const,x:.2,y:.2,width:.1,height:.1,confirmed:false},{id:'w',label:'Wall',kind:'wall' as const,x:.1,y:.1,width:.01,height:.8,confirmed:true}];
  assert.deepEqual(reviewRegions(regions,['furniture'],true).map(r=>r.id),['f']);
  assert.equal(reviewRegions(regions,['wall'],true).length,0);
  assert.equal(regions.length,2);
});

test('expanded preferences and plant cards persist without adopting a plant',()=>{
  const store=freshStore();
  store.profile={...store.profile,quizStep:7,spacePreference:'compact',formPreference:'soft',routine:'away',likedSpecies:['spider'],passedSpecies:['monstera'],plantCardIndex:2};
  const loaded=parseStore(JSON.stringify(store))!;
  assert.deepEqual(loaded.profile,store.profile);
  assert.equal(loaded.ownedPlants.length,0);
  assert.equal(landingStage(loaded),'welcome');
  assert.ok(recommend(loaded.profile,loaded.home)[0].reasons.some(r=>r.includes('cards')));
  assert.equal(recommend(loaded.profile,loaded.home)[0].plant.id,'spider');
});
test('plant-card likes never override the cat-safety tier',()=>{
  const store=freshStore();
  const picks=recommend({...store.profile,hasCat:true,likedSpecies:['monstera'],spacePreference:'statement',formPreference:'broad'},store.home);
  assert.equal(picks[0].plant.catSafety,'non-toxic');
});
test('catalog search matches common and botanical names with no fabricated results',()=>{
  const store=freshStore(), picks=recommend(store.profile,store.home);
  assert.equal(searchPlants(picks,'  CHLOROPHYTUM ')[0].plant.id,'spider');
  assert.equal(searchPlants(picks,'fiddle leaf fig').length,0);
  assert.equal(searchPlants(picks,'').length,picks.length);
});
test('custom adoptions persist independently and have no placement safety claims',()=>{
  const store=adoptCustom(adoptCustom(freshStore(),'Fiddle leaf fig','2026-10-10T00:00:00Z','c1'),'Fiddle leaf fig','2026-10-10T00:00:00Z','c2');
  const loaded=parseStore(JSON.stringify(store))!;
  assert.ok(loaded);
  assert.equal(loaded.ownedPlants.length,2);
  assert.equal(loaded.ownedPlants[0].customName,'Fiddle leaf fig');
  const moved=editPlant(loaded,'c1',{x:1,nickname:'My fig'});
  assert.equal(moved.ownedPlants[1].nickname,'Fiddle leaf fig');
  const result=assessment({...store.preview,speciesId:'custom'},store.home);
  assert.equal(result.spaceStatus,'unknown');
  assert.deepEqual(result.hardConflicts,[]);
  assert.match(result.unknowns[0],/unverified/);
  assert.throws(()=>adoptCustom(store,'   '));
  assert.throws(()=>adoptCustom(store,'Fig',undefined,'c1'));
});
test('invalid expanded profile data and unnamed custom species are rejected',()=>{
  const store=freshStore();
  for(const patch of [{formPreference:'invented'},{plantCardIndex:6},{likedSpecies:['made-up']},{likedSpecies:['spider','spider']}])assert.equal(parseStore(JSON.stringify({...store,profile:{...store.profile,...patch}})),null);
  const custom=adoptCustom(store,'Fig');
  delete custom.ownedPlants[0].customName;
  assert.equal(parseStore(JSON.stringify(custom)),null);
});

test('saved quiz returns to the workspace on refresh, while explicit Start remains available',()=>{
  const store=freshStore();store.profile.onboardingDone=true;store.home.ready=true;
  assert.equal(landingStage(store),'preview');
  assert.equal(afterHomeSave(false,'welcome'),'preview');
  assert.equal(afterHomeSave(true,'welcome'),'preview');
  assert.equal(afterHomeSave(true,'preview'),'preview');
});

test('Start resets completed quiz/card positions but resumes incomplete progress and retains taste',()=>{
  const profile={...freshStore().profile,onboardingDone:true,quizStep:7,plantCardIndex:5,likedSpecies:['spider']};
  const started=beginJourney(profile);
  assert.equal(started.quizStep,0);assert.equal(started.plantCardIndex,0);assert.equal(started.onboardingDone,false);
  assert.deepEqual(started.likedSpecies,['spider']);
  const resumed=beginJourney({...started,quizStep:7,plantCardIndex:3});
  assert.equal(resumed.quizStep,7);assert.equal(resumed.plantCardIndex,3);
});

test('quiz drafts ignore legacy unsaved answers and never mutate saved preferences before confirmation',()=>{
 const saved={...freshStore().profile,onboardingDone:true,careTime:'low' as const,likedSpecies:['spider'],quizStep:7};
 const draft=quizDraft(saved);draft.careTime='high';draft.likedSpecies!.push('snake');
 assert.equal(saved.careTime,'low');assert.deepEqual(saved.likedSpecies,['spider']);
 assert.equal(quizDraft(saved).careTime,'low');assert.equal(quizDraft(saved).quizStep,0);
 const legacy=quizDraft({...saved,onboardingDone:false});assert.equal(legacy.careTime,null);assert.deepEqual(legacy.likedSpecies,[]);
 const confirmed={...draft,onboardingDone:true};assert.equal(quizDraft(confirmed).careTime,'high');
});

test('saved quiz resumes home setup without repeating onboarding; completed home loads workspace and keeps records',()=>{
 const store=freshStore();assert.equal(landingStage(store),'welcome');
 store.profile.onboardingDone=true;store.profile.careTime='low';
 assert.equal(landingStage(store),'setup');
 store.home.ready=true;
 const restored=parseStore(JSON.stringify(store))!;
 assert.equal(landingStage(restored),'preview');assert.equal(restored.profile.careTime,'low');
 assert.deepEqual(restored.ownedPlants,store.ownedPlants);
});
