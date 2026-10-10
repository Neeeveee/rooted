import { freshStore } from './appModel.ts';
import { trusted } from './spatial.ts';
import type { Store, Profile, Region } from './appModel.ts';
export type Stage = 'welcome' | 'quiz' | 'setup' | 'discover' | 'preview' | 'home';
export function landingStage(store:Store):Stage {
  if (!store.profile.onboardingDone) return 'welcome';
  return store.home.ready ? 'preview' : 'setup';
}
export function afterHomeSave(wasReady:boolean,returnTo:Stage):Stage { return wasReady && ['home','discover','preview'].includes(returnTo) ? returnTo : 'preview'; }
export function petsWithCat(profile:Profile,hasCat:boolean):Profile['pets'] { return profile.pets==='dog'||profile.pets==='both' ? hasCat?'both':'dog' : hasCat?'cat':profile.pets==='other'?'other':'none'; }

export function reviewRegions(regions:Region[], kinds:Region['kind'][], onlyUnconfirmed:boolean):Region[] {return regions.filter(r=>kinds.includes(r.kind)&&(!onlyUnconfirmed||!trusted(r,regions)));}

export function searchPlants<T extends {plant:{name:string;scientificName:string}}>(plants:T[],query:string):T[]{const q=query.trim().toLocaleLowerCase();return plants.filter(({plant})=>`${plant.name} ${plant.scientificName}`.toLocaleLowerCase().includes(q));}

export function beginJourney(profile:Profile):Profile {return {...profile,onboardingDone:false,quizStep:profile.onboardingDone?0:profile.quizStep??0,plantCardIndex:profile.onboardingDone?0:profile.plantCardIndex??0};}

export function quizDraft(saved:Profile):Profile {
 const source=saved.onboardingDone?saved:freshStore().profile;
 return {...source,quizStep:0,plantCardIndex:0,likedSpecies:[...(source.likedSpecies??[])],passedSpecies:[...(source.passedSpecies??[])]};
}
