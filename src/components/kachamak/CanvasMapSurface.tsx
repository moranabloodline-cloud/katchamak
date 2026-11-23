'use client';
import {useState,type MouseEvent} from 'react';
import {Orbit,Star,Globe2,Earth,Trees,TreePalm,TreeDeciduous,Waves,Mountain,Shell,Ship,Map as MapIcon,Crown,Castle,Flag,Landmark,House,Building2,Store,MapPin,Maximize2} from 'lucide-react';
import {atlasOf,type MapFeature,type MapTool,type PinKind} from '@/lib/kachamak/canvas-map';
import type {Point} from '@/lib/kachamak/canvas-board';
import type {HomeBlock} from '@/lib/kachamak/homepage';

export const pinIcons={Dimension:Orbit,Celestial:Star,Planet:Globe2,Continent:Earth,Forest:Trees,Island:TreePalm,Jungle:TreeDeciduous,Lake:Waves,Mountain,Ocean:Ship,Sea:Shell,Subcontinent:MapIcon,Empire:Crown,Kingdom:Castle,Duchy:Flag,County:Landmark,Settlement:House,District:Building2,Merchant:Store,Location:MapPin} satisfies Record<PinKind,typeof Orbit>;
export function featureLabel(f:MapFeature){return f.kind==='pin'?f.category:f.kind==='path'?'Path':'Region';}
const coordinates=(points:Point[])=>points.map(p=>(p.x*1000)+','+(p.y*1000)).join(' ');
type Props={block:HomeBlock;image:string;open?:()=>void;openLabel?:string;onPoint?:(p:Point)=>void;onFinish?:()=>void;undoPoint?:()=>void;onSelect?:(id:string)=>void;
  tool?:MapTool;points?:Point[];selected?:string;onAspect?:(ratio:number)=>void};
export function CanvasMapSurface({block,image,open,openLabel='Open map',onPoint,onFinish,undoPoint,onSelect,tool='inspect',points=[],selected,onAspect}:Props){
  const features=atlasOf(block).features;
  const tracing=tool==='path'||tool==='region';
  const [cursor,setCursor]=useState<Point|null>(null);
  function pointAt(e:MouseEvent<HTMLDivElement>){
    const r=e.currentTarget.getBoundingClientRect();
    return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};
  }
  function place(e:MouseEvent<HTMLDivElement>){
    if(!onPoint||tool==='inspect'||tracing&&e.detail>1)return;
    e.currentTarget.focus({preventScroll:true});
    const p=pointAt(e),r=e.currentTarget.getBoundingClientRect();
    if(tool==='region'&&points.length>=3&&Math.hypot((points[0].x-p.x)*r.width,(points[0].y-p.y)*r.height)<=8){
      onFinish?.();return;
    }
    onPoint(p);
  }
  const drawing=tool!=='inspect'&&!open;
  return <div className={'atlas-plate'+(open?' atlas-thumbnail':'')+(drawing?' atlas-target':'')} onClick={place} tabIndex={open?undefined:0}
    onDoubleClick={e=>{if(tracing){e.preventDefault();onFinish?.();}}}
    onContextMenu={e=>{if(tracing){e.preventDefault();e.stopPropagation();undoPoint?.();}}}
    onMouseMove={tracing&&points.length?e=>setCursor(pointAt(e)):undefined} onMouseLeave={()=>setCursor(null)}
    aria-label={open?undefined:'Map drawing surface'}>
    <img src={image} alt={block.title||'Map'} draggable={false} onLoad={e=>onAspect?.(e.currentTarget.naturalWidth/e.currentTarget.naturalHeight)}/>
    <svg className="atlas-overlay" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
      {features.filter(f=>f.kind!=='pin').map(f=>{
        const Shape=f.kind==='region'?'polygon':'polyline';
        return <Shape key={f.id} points={coordinates(f.points)} stroke={f.color} fill={f.kind==='region'?f.color:'none'} fillOpacity={.24}
          strokeWidth={selected===f.id?4:2.4} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/>;
      })}
      {tracing&&points.length>0&&cursor&&<polyline points={coordinates([points[points.length-1],cursor])} stroke="#ffd58a" opacity=".8" strokeWidth="2" strokeDasharray="3 4" fill="none" vectorEffect="non-scaling-stroke"/>}
      {points.length>1&&<polyline points={coordinates(tool==='region'&&points.length>2?[...points,points[0]]:points)} stroke="#ffd58a" strokeWidth="2.5" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" fill={tool==='region'?'#e1b65e':'none'} fillOpacity={.2}/>}
    </svg>
    {features.map(f=>{
      if(f.kind!=='pin')return null;
      const Icon=pinIcons[f.category],style={left:(f.point.x*100)+'%',top:(f.point.y*100)+'%'};
      return open||drawing&&tool!=='measure'?<span key={f.id} className="atlas-pin" data-active={selected===f.id||undefined} style={style} aria-hidden="true"><Icon/></span>:
        <button key={f.id} type="button" className="atlas-pin" data-feature-id={f.id} data-active={selected===f.id||undefined} style={style} title={f.name+' · '+f.category}
          aria-label={f.name+' · '+f.category} onClick={e=>{e.stopPropagation();if(tool==='measure')onPoint?.(f.point);else onSelect?.(f.id);}}><Icon/></button>;
    })}
    {points.map((p,i)=><i key={i} className="atlas-vertex" style={{left:p.x*100+'%',top:p.y*100+'%'}}/>)}
    {open&&<button type="button" className="atlas-open" aria-label={openLabel+': '+(block.title||'Map')} onClick={open}><span><Maximize2 size={13}/>{openLabel}</span></button>}
  </div>;
}
