import type { Region } from './appModel.ts';
import { circleRect } from './model.ts';
export type Point = [number, number];
export type Shape = { type: 'polygon'; points: Point[] } | { type: 'line'; points: [Point, Point]; thickness: number };
export function vertices(r: Region): Point[] { return r.shape?.points ?? [[r.x,r.y],[r.x+r.width,r.y],[r.x+r.width,r.y+r.height],[r.x,r.y+r.height]]; }
export function shapeBounds(points: Point[]) { const xs=points.map(p=>p[0]), ys=points.map(p=>p[1]); return { x:Math.min(...xs), y:Math.min(...ys), width:Math.max(...xs)-Math.min(...xs), height:Math.max(...ys)-Math.min(...ys) }; }
const cross=(a:Point,b:Point,c:Point)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
export function distance(p:Point,a:Point,b:Point) { const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1))); return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy); }
export function inPolygon(p:Point,ps:Point[]) { let inside=false; for(let i=0,j=ps.length-1;i<ps.length;j=i++){ const a=ps[i],b=ps[j]; if(distance(p,a,b)<1e-10)return true; if((a[1]>p[1])!==(b[1]>p[1]) && p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside; } return inside; }
export function validShape(r: Region) {
 if(r.reviewed!==undefined && typeof r.reviewed!=='boolean')return false;
 if(r.doorRole!==undefined && (r.kind!=='door'||!['opening','clearance'].includes(r.doorRole)))return false;
 if(!r.shape)return [r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.width>0&&r.height>0&&r.x>=0&&r.y>=0&&r.x+r.width<=1.000001&&r.y+r.height<=1.000001;
 const s=r.shape; if(!['line','polygon'].includes(s.type)||!Array.isArray(s.points)||s.points.length>(s.type==='line'?2:64)||s.points.length<(s.type==='line'?2:3)||!s.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1)))return false;
 if(s.type==='line')return ['wall','window','door'].includes(r.kind)&&Number.isFinite(s.thickness)&&s.thickness>0&&s.thickness<=.05&&distance(s.points[0],s.points[1],s.points[1])>1e-8;
 const ps=s.points; if(ps.some((p,i)=>Math.hypot(p[0]-ps[(i+1)%ps.length][0],p[1]-ps[(i+1)%ps.length][1])<1e-8))return false; if(Math.abs(ps.reduce((a,p,i)=>a+p[0]*ps[(i+1)%ps.length][1]-ps[(i+1)%ps.length][0]*p[1],0))<1e-8)return false;
 for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){if(j===i+1||(i===0&&j===ps.length-1))continue;const a=ps[i],b=ps[(i+1)%ps.length],c=ps[j],d=ps[(j+1)%ps.length];if(cross(a,b,c)*cross(a,b,d)<=0&&cross(c,d,a)*cross(c,d,b)<=0&&Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<=Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))&&Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<=Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1])))return false;}
 return true;
}
export function regionHit(r:Region,p:Point,radius:number,width:number,height:number,contains=false) {
 if(!r.shape){ const q={id:r.id,label:r.label,x:r.x*width,y:r.y*height,width:r.width*width,height:r.height*height}; return contains?p[0]-radius>=q.x&&p[1]-radius>=q.y&&p[0]+radius<=q.x+q.width&&p[1]+radius<=q.y+q.height:circleRect(p[0],p[1],radius,q); }
 const ps=r.shape.points.map(([x,y])=>[x*width,y*height] as Point);
 if(r.shape.type==='line')return !contains&&distance(p,ps[0],ps[1])<=radius+r.shape.thickness*width/2;
 const edge=Math.min(...ps.map((a,i)=>distance(p,a,ps[(i+1)%ps.length]))),inside=inPolygon(p,ps);
 return contains?inside&&edge>=radius:inside||edge<=radius;
}
export function geometryWarnings(regions:Region[]): Record<string,string[]> {
 const out:Record<string,string[]>={};const add=(r:Region,s:string)=>{(out[r.id]??=[]).push(s);};
 for(const r of regions){const b=r.shape?shapeBounds(vertices(r)):r,area=b.width*b.height;
 if((r.kind==='furniture'&&area>.08)||(r.kind==='door'&&area>.04)||(r.kind==='room'&&area>.55))add(r,'Unusually large extent; check against image.');
 if((r.kind==='wall'||r.kind==='window')&&!r.shape&&Math.min(r.width,r.height)>.025)add(r,'Wall/window is unusually thick.');
 if(r.kind==='door'&&(r.doorRole==='opening'||(!r.doorRole&&Math.min(b.width,b.height)<.015)))add(r,'Opening alone does not establish door clearance. Add/review clearance.');
 if(r.kind==='wall')for(const room of regions.filter(q=>q.kind==='room')){const ps=vertices(room);const center:[number,number]=[b.x+b.width/2,b.y+b.height/2];if(inPolygon(center,ps)&&Math.min(...ps.map((a,i)=>distance(center,a,ps[(i+1)%ps.length])))>.015){add(r,`Wall passes through interior of ${room.label}; check room boundary.`);add(room,`Interior includes wall ${r.label}; check boundary.`);}}
 for(const q of regions){if(q.id<=r.id||q.kind!==r.kind||!['furniture','room','wall'].includes(r.kind))continue;const c=q.shape?shapeBounds(vertices(q)):q;const overlap=Math.max(0,Math.min(b.x+b.width,c.x+c.width)-Math.max(b.x,c.x))*Math.max(0,Math.min(b.y+b.height,c.y+c.height)-Math.max(b.y,c.y));if(overlap>0&&overlap/Math.max(1e-9,Math.min(area,c.width*c.height))>.65){add(r,`Large bounding overlap with ${q.label}; review (may be intentional).`);add(q,`Large bounding overlap with ${r.label}; review (may be intentional).`);}}
 }return out;
}
export function trusted(r:Region,regions:Region[]) { return r.confirmed&&(r.reviewed===true||(!r.shape&&r.reviewed===undefined)||!(geometryWarnings(regions)[r.id]?.length)); }
export function svgPoints(r:Region,width:number,height:number,ox=0,oy=0) {return vertices(r).map(([x,y])=>`${ox+x*width},${oy+y*height}`).join(' ');}
