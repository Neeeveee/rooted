import type { Region } from './appModel';
import { svgPoints } from './spatial';
import type { SVGProps } from 'react';
export function RegionShape({ region:r, width, height, x=0,y=0,...props }: {region:Region;width:number;height:number;x?:number;y?:number}&SVGProps<SVGElement>) {
 if(r.shape?.type==='line')return <polyline {...props as SVGProps<SVGPolylineElement>} points={svgPoints(r,width,height,x,y)} strokeLinecap="round" style={{...props.style,fill:'none',strokeWidth:r.shape.thickness*width,vectorEffect:'none'}} />;
 if(r.shape?.type==='polygon')return <polygon {...props as SVGProps<SVGPolygonElement>} points={svgPoints(r,width,height,x,y)} />;
 return <rect {...props as SVGProps<SVGRectElement>} x={x+r.x*width} y={y+r.y*height} width={r.width*width} height={r.height*height}/>;
}
