import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { svgPoints } from '../src/spatial.ts';
const root=new URL('../',import.meta.url);
export async function regression(){
 const image=await readFile(new URL('public/fixtures/apartment-test.jpg',root));
 const rawBytes=await readFile(new URL('tests/fixtures/gemini-original.json',root));
 const raw=JSON.parse(rawBytes), converted=JSON.parse(await readFile(new URL('tests/fixtures/gemini-converted.json',root)));
 const payload=JSON.parse(raw.candidates[0].content.parts.filter(p=>p.text&&!p.thought).map(p=>p.text).join(''));
 const w=converted.geometry.imageWidth,h=converted.geometry.imageHeight;
 const overlays=converted.geometry.regions.map(r=>`<polygon points="${svgPoints(r,w,h)}" fill="none" stroke="#b96a5d" stroke-width="2"/>`).join('');
 return {payload,converted,imageHash:createHash('sha256').update(image).digest('hex'),responseHash:createHash('sha256').update(rawBytes).digest('hex'),svg:`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" xlink:href="data:image/jpeg;base64,${image.toString('base64')}"/>${overlays}</svg>`};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){ const r=await regression();await writeFile(new URL('tests/fixtures/overlay-regression.svg',root),r.svg);console.log('Offline overlay regenerated. No API request.'); }
