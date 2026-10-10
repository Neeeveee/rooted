// Original inline botanical silhouettes. Artwork is illustrative; the ring is the measured footprint.
export function PlantArt({ id, top = false }: { id: string; top?: boolean }) {
  if(id==='custom') return top ? <g><circle r="15" fill="#F0F2EC" stroke="#697783" strokeDasharray="3 3"/><text textAnchor="middle" y="5" fill="#697783" fontSize="18">?</text></g> : <svg className="plant-art" viewBox="0 0 80 100" role="img" aria-label="Custom plant, species unverified"><circle cx="40" cy="45" r="25" fill="#F0F2EC" stroke="#697783" strokeDasharray="3 3"/><text x="40" y="54" textAnchor="middle" fill="#697783" fontSize="28">?</text></svg>;
  if (['palm', 'castiron', 'peperomia'].includes(id)) return <AdditionalPlant id={id} top={top} />;
  if (top) return <g>
    <circle r="10" fill="#B3A18C" stroke="#766C59" strokeWidth="1" />
    {id === 'monstera' ? [0, 65, 135, 205, 275].map((angle, i) => <g key={angle} transform={`rotate(${angle})`}>
      <path d="M0 4 Q-4 -8 -2 -23" fill="none" stroke="#49654E" strokeWidth="1.5" />
      <path d="M-2 -8 C-24 -7 -26 -27 -12 -30 Q-4 -33 -2 -24 Q7 -37 18 -27 C27 -16 15 -5 -2 -8Z" fill={i % 2 ? '#49654E' : '#304B35'} />
      <path d="M-2 -10L-2 -25M-3 -16L-15 -22M0 -17L11 -23" stroke="#8BA889" strokeWidth="1" fill="none" />
    </g>) : id === 'snake' ? [0, 50, 110, 170, 230, 290].map((angle, i) => <path key={angle} transform={`rotate(${angle})`} d="M0 5 Q-11 -16 0 -33 Q9 -11 0 5Z" fill={i % 2 ? '#5B7452' : '#304B35'} stroke="#8BA889" strokeWidth="1" />) : Array.from({ length: 12 }, (_, i) => <path key={i} transform={`rotate(${i * 30})`} d="M0 3 Q-15 -27 4 -36 Q-5 -17 0 3" fill={i % 2 ? '#8BA889' : '#3F6046'} />)}
  </g>;
  return <svg viewBox="0 0 90 112" aria-hidden="true" className="plant-art">
    <ellipse cx="46" cy="103" rx="24" ry="4" fill="#253528" opacity=".07" />
    <path d="M31 80H61L57 101Q46 107 35 101Z" fill="#DAD7CD" stroke="#B8B8AA" strokeWidth=".8" />
    <ellipse cx="46" cy="81" rx="15" ry="4" fill="#A59D87" />
    {id === 'monstera' ? <g>
      <path d="M46 83Q44 39 26 25M46 78Q55 37 68 22M46 82Q40 61 20 52M46 70Q64 62 70 43" fill="none" stroke="#49654E" strokeWidth="2" />
      {[{ x: 26, y: 28, r: -30 }, { x: 65, y: 28, r: 30 }, { x: 23, y: 53, r: -58 }, { x: 66, y: 51, r: 55 }].map((p, i) => <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.r})`}>
        <path d="M0 17C-25 8 -22 -17 -9 -17Q-2 -17 0 -9Q8 -23 17 -12C29 3 12 13 0 17Z" fill={i % 2 ? '#49654E' : '#304B35'} />
        <path d="M0 14V-10M-1 6L-12 -2M0 -1L-11 -9M2 7L14 -1M2 0L12 -9" stroke="#A1B295" strokeWidth="1" fill="none" />
      </g>)}
    </g> : id === 'snake' ? <g>{[-23, -11, 0, 13, 24].map((x, i) => <g key={x}><path d={`M46 83Q${30 + x} 56 ${44 + x} ${i % 2 ? 11 : 22}Q${62 + x} 53 46 83`} fill={i % 2 ? '#49654E' : '#304B35'} stroke="#9AAC76" strokeWidth="2" /><path d={`M46 80L${44 + x} ${i % 2 ? 15 : 25}`} stroke="#8BA889" strokeWidth=".8" /></g>)}</g> : <g>{[-34, -24, -15, -6, 8, 18, 28, 37].map((x, i) => <path key={x} d={`M46 82Q${44 + x / 2} ${i % 2 ? 9 : 21} ${46 + x} ${i % 2 ? 68 : 82}Q${43 + x / 2} ${i % 2 ? 29 : 35} 46 82`} fill={i % 2 ? '#49654E' : '#8BA889'} />)}</g>}
  </svg>;
}

function AdditionalPlant({ id, top }: { id: string; top: boolean }) {
  const leaves = id === 'palm' ? [0, 60, 120, 180, 240, 300].map(angle => <g key={angle} transform={`rotate(${angle})`}><path d="M0 4V-34" stroke="#49654E" strokeWidth="1.4" />{[10, 17, 24, 30].map(y => <path key={y} d={`M0 -${y}Q-13 -${y + 9} -15 -${y + 2}Q-6 -${y - 1} 0 -${y}Q13 -${y + 9} 15 -${y + 2}Q6 -${y - 1} 0 -${y}`} fill="#49654E" />)}</g>) : [0, 72, 144, 216, 288].map((angle, i) => <g key={angle} transform={`rotate(${angle})`}><path d={id === 'castiron' ? 'M0 5Q-18 -25 0 -38Q16 -18 0 5Z' : 'M0 3C-19 -1 -21 -27 -7 -29C9 -33 17 -7 0 3Z'} fill={i % 2 ? '#49654E' : '#304B35'} stroke="#8BA889" strokeWidth=".7" /><path d="M0 1L0 -27" stroke="#8BA889" strokeWidth=".8" /></g>);
  if (top) return <g><circle r="9" fill="#B3A18C" />{leaves}</g>;
  return <svg viewBox="0 0 90 112" className="plant-art" aria-hidden="true"><ellipse cx="46" cy="103" rx="24" ry="4" fill="#253528" opacity=".07" /><path d="M31 80H61L57 101Q46 107 35 101Z" fill="#DAD7CD" stroke="#B8B8AA" strokeWidth=".8" /><ellipse cx="46" cy="81" rx="15" ry="4" fill="#A59D87" /><path d="M46 83V35" stroke="#49654E" strokeWidth="2" /><g transform={`translate(46 ${id === 'palm' ? 45 : 50}) scale(.85)`}>{leaves}</g></svg>;
}
