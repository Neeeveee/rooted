import { trusted } from './spatial.ts';
import type { Store, Profile, Region } from './appModel.ts';
export type Stage = 'welcome' | 'quiz' | 'setup' | 'discover' | 'preview' | 'home';
export function landingStage(_store:Store):Stage { return 'welcome'; }
export function afterHomeSave(wasReady:boolean,returnTo:Stage):Stage { return wasReady && ['home','discover','preview'].includes(returnTo) ? returnTo : 'preview'; }
export function petsWithCat(profile:Profile,hasCat:boolean):Profile['pets'] { return profile.pets==='dog'||profile.pets==='both' ? hasCat?'both':'dog' : hasCat?'cat':profile.pets==='other'?'other':'none'; }

export function reviewRegions(regions:Region[], kinds:Region['kind'][], onlyUnconfirmed:boolean):Region[] {return regions.filter(r=>kinds.includes(r.kind)&&(!onlyUnconfirmed||!trusted(r,regions)));}

export function searchPlants<T extends {plant:{name:string;scientificName:string}}>(plants:T[],query:string):T[]{const q=query.trim().toLocaleLowerCase();return plants.filter(({plant})=>`${plant.name} ${plant.scientificName}`.toLocaleLowerCase().includes(q));}

export function beginJourney(profile:Profile):Profile {return {...profile,onboardingDone:false,quizStep:profile.onboardingDone?0:profile.quizStep??0,plantCardIndex:profile.onboardingDone?0:profile.plantCardIndex??0};}
