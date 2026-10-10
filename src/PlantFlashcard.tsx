import { useState } from 'react';
import { PlantArt } from './PlantArt';
import type { Species } from './model';
import type { Profile } from './appModel';

// The choice saves immediately; the departing card is a non-interactive visual copy.
export function PlantFlashcard({plant,profile,index,onRate}:{plant:Species;profile:Profile;index:number;onRate:(liked:boolean)=>void}) {
  const [outgoing,setOutgoing] = useState<{plant:Species;index:number;liked:boolean}|null>(null);
  function choose(liked:boolean){
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)setOutgoing({plant,index,liked});
    onRate(liked);
  }
  return <div className="flashcard-deck" aria-label="Plant preference cards">
    <Card key={plant.id} plant={plant} profile={profile} index={index} onRate={choose} className="card-arrive"/>
    {outgoing&&<div className={`card-depart ${outgoing.liked?'to-right':'to-left'}`} aria-hidden="true" inert onAnimationEnd={()=>setOutgoing(null)}><Card plant={outgoing.plant} profile={profile} index={outgoing.index} onRate={()=>{}}/><span className="card-choice-stamp">{outgoing.liked?'Liked':'Passed'}</span></div>}
  </div>;
}
function Card({plant,profile,index,onRate,className=''}:{plant:Species;profile:Profile;index:number;onRate:(liked:boolean)=>void;className?:string}){
  const [flipped,setFlipped] = useState(false);
  return <article className={`plant-flashcard ${className} ${flipped?'card-flipped':''}`}>
    <div className="flashcard-art"><div className="flashcard-face flashcard-front" aria-hidden={flipped}><PlantArt id={plant.id}/></div><div className="flashcard-face flashcard-back" aria-hidden={!flipped}><strong>Room to grow.</strong><p>Illustrative spread<br/>{plant.current}–{plant.mature} m</p><p>Actual size varies. Preview placement after setting up your home.</p></div><span>{index+1} / 6</span></div>
    <div><h3>{plant.name}</h3><i>{plant.scientificName}</i><p>{plant.form}</p><p className={plant.catSafety==='toxic'?'warning-text':'fine-print'}>{plant.catSafety==='toxic'?'Toxic to cats':'Listed as non-toxic to cats'} · <a href={plant.source} target="_blank" rel="noreferrer">ASPCA ↗</a></p><p className="fine-print">Dog and other pet suitability unverified.</p><button className="text-button card-flip-button" aria-pressed={flipped} onClick={()=>setFlipped(!flipped)}>{flipped?'Show plant ↶':'Turn card ↷'}</button>{flipped&&<p className="fine-print"><a href={plant.careSource} target="_blank" rel="noreferrer">Read care source ↗</a></p>}<div className="button-row"><button className="secondary" aria-pressed={profile.passedSpecies?.includes(plant.id)??false} onClick={()=>onRate(false)}>Not my style</button><button className="primary" aria-pressed={profile.likedSpecies?.includes(plant.id)??false} onClick={()=>onRate(true)}>I like this</button></div></div>
  </article>;
}
