import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Preview } from './Preview';
import { Onboarding, HomeSetup, Discover } from './Journey';
import { HomeDashboard } from './HomeDashboard';
import { adopt, adoptCustom, changeHome, editPlant, freshStore, loadStore, saveStore, recommend } from './appModel';
import type { Store, OwnedPlant, Home } from './appModel';
import { PlantArt } from './PlantArt';
import './styles.css';

import { landingStage, afterHomeSave, petsWithCat } from './journeyState';
import type { Stage } from './journeyState';
function App() {
  const [initial] = useState(() => { try { return loadStore(localStorage); } catch { return { store: freshStore(), warning: 'Storage is unavailable. Session-only mode.' }; } });
  const [store, setStore] = useState(initial.store);
  const [warning, setWarning] = useState(initial.warning);
  const [stage, setStage] = useState<Stage>(landingStage(initial.store));
  const [freshQuiz,setFreshQuiz] = useState(false);
  const [quizSession,setQuizSession] = useState(0);
  const [adoptionRequested,setAdoptionRequested] = useState(false);
  useEffect(()=>{window.history.replaceState({...window.history.state,rootedStage:landingStage(initial.store)},'');const back=(e:PopStateEvent)=>{const next=e.state?.rootedStage;if(['welcome','quiz','setup','discover','preview','home'].includes(next)){setStage(next);setNotice('');setAdoptionRequested(false);window.scrollTo(0,0);}};window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back);},[]);
  const [guided,setGuided] = useState(false);
  const [returnTo, setReturnTo] = useState<Stage>('home');
  const [selectedId, setSelectedId] = useState(initial.store.ownedPlants[0]?.id ?? '');
  const [removed, setRemoved] = useState<OwnedPlant | null>(null);
  const [notice, setNotice] = useState('');
  function persist(next: Store) {
    try { return saveStore(localStorage, next); } catch { return 'Storage is unavailable. Session-only changes; keep this tab open.'; }
  }
  function commit(next: Store) { setStore(next); setWarning(persist(next)); }
  function navigate(next: Stage) { if(next!==stage)window.history.pushState({rootedStage:next},''); setStage(next); setNotice(''); window.scrollTo(0, 0); }
  function editPreferences() { if(stage==='quiz')return; setFreshQuiz(false);setQuizSession(n=>n+1); setGuided(false); setReturnTo(stage); navigate('quiz'); }
  function setup() { setGuided(false); setReturnTo(stage); navigate('setup'); }
  function saveHome(home: Home) {
    let next = changeHome(store, home);
    if(guided||!store.home.ready)next={...next,preview:{...next.preview,speciesId:recommend(next.profile,home)[0].plant.id,mode:'current'}};
    const error = persist(next);
    if (error && home.backgroundImageDataUrl) { setWarning(error); return false; }
    setStore(next); setWarning(error);
    navigate(guided?'preview':afterHomeSave(store.home.ready,returnTo)); setGuided(false);
    return true;
  }
  function confirmAdoption(nickname: string) {
    setAdoptionRequested(false);
    const next = adopt(store, nickname);
    commit(next); setSelectedId(next.ownedPlants.at(-1)!.id); setRemoved(null);
    navigate('home'); setNotice(`${next.ownedPlants.at(-1)!.nickname} is now part of your home.`);
  }
  return <>
    <header className="app-header"><div className="identity"><button className="wordmark wordmark-home" aria-label="Rooted · Start" onClick={() => navigate('welcome')}>rooted<span className="wordmark-dot">.</span></button><span className="tagline">Plants in their place.</span></div>{store.home.ready && <nav className="app-nav" aria-label="Main navigation"><button aria-current={stage === 'preview' ? 'page' : undefined} onClick={() => {setGuided(false);navigate('preview');}}>Plant workspace</button><button aria-current={stage === 'home' ? 'page' : undefined} onClick={() => navigate('home')}>My plants</button><button aria-current={stage === 'discover' ? 'page' : undefined} onClick={() => navigate('discover')}>Find plants</button></nav>}<div className="header-actions"><button className="reset" title="Start an empty quiz without deleting your home or plants" onClick={()=>{setFreshQuiz(true);setQuizSession(n=>n+1);setGuided(true);setReturnTo(stage==='quiz'?'preview':stage);navigate('quiz');}}>↻ Restart Quiz</button><span className="save-status">{warning ? 'Changes need attention' : 'Saved on this device'}</span>{store.profile.onboardingDone && stage!=='quiz' && <button className="reset" onClick={editPreferences}>Preferences</button>}</div></header>
    {stage !== 'welcome' && <nav className="journey-path" aria-label="Your journey"><button onClick={()=>navigate('welcome')}>Start</button><span aria-hidden="true">/</span><span aria-current="page">{{quiz:'Your preferences',setup:'Home setup',discover:'Discover plants',preview:'Plant workspace',home:'My plants'}[stage]}</span></nav>}
    {warning && <div className="storage-warning" role="alert"><p>{warning}</p><div className="button-row"><button className="secondary" onClick={() => setWarning(persist(store))}>Retry save</button>{store.home.backgroundImageDataUrl && <button className="secondary" onClick={() => commit({ ...store, home: { ...store.home, backgroundImageDataUrl: undefined } })}>Remove saved image & retry</button>}</div></div>}
    {notice && <div className="notice" role="status">{notice}</div>}
    {stage === 'welcome' && <main className="welcome start-page"><div><p className="eyebrow">Welcome to Rooted</p><h1>Your kind of green.<br/>A place to call home.</h1><p>Discover plants that suit you, find their place in your home, and welcome each one with a record of its own.</p><ol className="start-journey"><li><strong>A little about you</strong><span>Share your preferences and everyday lifestyle.</span></li><li><strong>Find your green</strong><span>Explore plant suggestions shaped by your answers.</span></li><li><strong>Find its place</strong><span>Preview placement in your home—or try Demo Home.</span></li><li><strong>Make it yours</strong><span>Give each adopted plant its own record, where its story begins.</span></li></ol><div className="button-row"><button className="primary" onClick={()=>{setFreshQuiz(false);setQuizSession(n=>n+1);setGuided(true);setReturnTo('welcome');navigate('quiz');}}>{!store.profile.onboardingDone&&store.profile.quizStep!==undefined?'Continue my setup':'Start'} →</button>{store.home.ready?<button className="secondary" onClick={()=>{setGuided(false);navigate('preview');}}>Open my plant workspace →</button>:<button className="text-button" onClick={()=>{setGuided(true);commit({...store,profile:{...store.profile,onboardingDone:true}});navigate('setup');}}>Skip quiz & set up my home</button>}</div><p className="fine-print">{store.home.ready?`${store.home.name} and ${store.ownedPlants.length} adopted plants are saved. Starting again keeps them.`:'No account. Your answers, home and plants stay in this browser.'}</p></div><div className="welcome-art"><PlantArt id="monstera"/><span>Small beginnings.<br/><i>Room to grow.</i></span></div></main>}
    {stage === 'quiz' && <Onboarding key={quizSession} profile={freshQuiz?freshStore().profile:store.profile} onBack={() => navigate(guided?'welcome':returnTo)} onDone={profile => { const next={...store,profile:{...profile,onboardingDone:true},preview:{...store.preview,style:profile.style,hasCat:profile.hasCat}}; const error=persist(next);if(error){setWarning(error);return;}setStore(next);setWarning('');navigate(guided?'setup':store.home.ready?returnTo:'setup'); }} />}
    {stage === 'setup' && <HomeSetup home={store.home} hasPlants={!!store.ownedPlants.length} onSave={saveHome} onBack={() => navigate(guided?'quiz':store.home.ready ? returnTo : 'quiz')} />}
    {stage === 'discover' && <Discover onAdd={speciesId=>{commit({...store,preview:{...store.preview,speciesId}});setAdoptionRequested(true);navigate('preview');}} onCustom={name => {const next=adoptCustom(store,name);commit(next);setSelectedId(next.ownedPlants.at(-1)!.id);navigate('home');setNotice(`${name} is now part of your home. Details remain unverified.`);}} profile={store.profile} home={store.home} onEdit={editPreferences} onPreview={speciesId => { setAdoptionRequested(false); commit({ ...store, preview: { ...store.preview, speciesId } }); navigate('preview'); }} />}
    {stage === 'preview' && <Preview initialAdoption={adoptionRequested} state={store.preview} home={store.home} ownedPlants={store.ownedPlants} onBack={() => navigate('discover')} onSetup={setup} onAdopt={confirmAdoption} update={patch => commit({ ...store, preview: { ...store.preview, ...patch }, profile: { ...store.profile, style: patch.style ?? store.profile.style, hasCat: patch.hasCat ?? store.profile.hasCat, pets: patch.hasCat===undefined?store.profile.pets:petsWithCat(store.profile,patch.hasCat) } })} />}
    {stage === 'home' && <><HomeDashboard store={store} selectedId={selectedId} onSelect={setSelectedId} onDiscover={() => navigate('discover')} onSetup={setup} onEdit={(id, patch) => commit(editPlant(store, id, patch))} onRemove={id => { setRemoved(store.ownedPlants.find(p => p.id === id)!); commit({ ...store, ownedPlants: store.ownedPlants.filter(p => p.id !== id) }); setSelectedId(''); }} />{removed && <div className="undo-bar" role="status"><span>{removed.nickname} removed from this home.</span><button className="secondary" onClick={() => { commit({ ...store, ownedPlants: [...store.ownedPlants, removed] }); setSelectedId(removed.id); setRemoved(null); }}>Undo removal</button><button className="text-button" onClick={() => setRemoved(null)}>Dismiss</button></div>}</>}
  </>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
