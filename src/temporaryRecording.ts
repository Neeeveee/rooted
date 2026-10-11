// TEMPORARY recording deployment. Remove this module and its main.tsx adapter after recording.
// Separate storage ensures rollback restores normal user data without deleting anything.
import { appKey, freshStore, adopt } from './appModel.ts';
import type { StoragePort } from './appModel.ts';
export const recordingKey = 'rooted-recording-temporary-v1';
export function recordingSeed() {
  const base = freshStore();
  base.profile = {style:'airy',careTime:'moderate',experience:'beginner',hasCat:true,onboardingDone:true,pets:'cat',spacePreference:'compact',formPreference:'soft',routine:'home',likedSpecies:[],passedSpecies:[]};
  base.home = {...base.home,ready:true,name:'My bedroom'};
  base.preview = {...base.preview,speciesId:'spider',style:'airy',hasCat:true,mode:'current',x:2.48,y:2.87};
  return adopt({...base,preview:{...base.preview,x:2.76,y:1.25}},'Window companion','2026-10-10T20:00:00.000Z','00000000-0000-4000-8000-000000000001');
}
export function recordingStorage(storage:StoragePort):StoragePort {
  return {
    getItem(key) {
      if(key!==appKey)return null;
      const saved=storage.getItem(recordingKey);
      if(saved!==null)return saved;
      const seed=JSON.stringify(recordingSeed());
      storage.setItem(recordingKey,seed);
      return seed;
    },
    setItem(key,value) {if(key===appKey)storage.setItem(recordingKey,value);}
  };
}
