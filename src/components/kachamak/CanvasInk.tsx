'use client';
import {useRef,useState,type PointerEvent} from 'react';
import type {Stroke} from '@/lib/kachamak/canvas-board';
export function InkPaths({strokes,color}:{strokes:Stroke[];color:string}){
  return <g fill="none" stroke={color} strokeWidth={2.8} strokeLinejoin="round" strokeLinecap="round">{strokes.map((s,i)=><polyline key={i} points={s.length===1?[s[0],s[0]].join(' '):s.join(' ')}/>)}</g>;
}
export function CanvasInk({value,color,onChange}:{value:Stroke[];color:string;onChange:(next:Stroke[])=>void}){
  const drawing=useRef<Stroke|null>(null),[preview,setPreview]=useState<Stroke>([]);
  function point(e:PointerEvent<SVGSVGElement>):[number,number]{
    const r=e.currentTarget.getBoundingClientRect();
    return [Math.round(320*Math.max(0,Math.min(1,(e.clientX-r.x)/r.width))),Math.round(180*Math.max(0,Math.min(1,(e.clientY-r.y)/r.height)))];
  }
  function cancel(){drawing.current=null;setPreview([]);}
  return <div><svg aria-label="Sketch pad" viewBox="0 0 320 180" className="cv-sketchpad" onPointerDown={e=>{
    if(!e.isPrimary||e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);drawing.current=[point(e)];setPreview([...drawing.current]);
  }} onPointerMove={e=>{if(drawing.current&&e.isPrimary){drawing.current.push(point(e));setPreview([...drawing.current]);}}}
  onPointerUp={e=>{if(drawing.current&&e.isPrimary){onChange([...value,drawing.current]);cancel();}}} onPointerCancel={cancel}>
    <InkPaths strokes={preview.length?[...value,preview]:value} color={color}/></svg>
    <button type="button" className="cv-text-btn" disabled={!value.length} onClick={()=>onChange(value.slice(0,-1))}>Undo stroke</button></div>;
}
