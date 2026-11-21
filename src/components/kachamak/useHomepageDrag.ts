import {useEffect, useRef, useState, type DragEvent} from 'react';
import {sameCell,type HomeCell,type HomePlacement} from '@/lib/kachamak/homepage';

type DropHint = HomePlacement & { axis: 'row' | 'column'; cell?:HomeCell };

function placementAt(event:DragEvent<HTMLDivElement>,rowId:string):DropHint|null {
  const target=event.target as Element;
  const lane=target.closest<HTMLElement>('[data-home-cell]');
  if(!lane || lane.dataset.homeCell!==rowId || !event.currentTarget.contains(lane))return null;
  const card=target.closest<HTMLElement>('[data-home-block]');
  if(card && lane.contains(card)){
    const bounds=card.getBoundingClientRect();
    return {targetId:card.dataset.homeBlock!,side:event.clientY<bounds.top+bounds.height/2?'before':'after',axis:'row'};
  }
  return {targetId:rowId,side:'after',axis:'row',cell:{rowId,column:Number(lane.dataset.column)}};
}

export function useHomepageDrag(locked:boolean, place:(id:string, position:DropHint)=>void) {
  const source = useRef<string|null>(null);
  const sourceRow=useRef('');
  const [dragging,setDragging] = useState<string|null>(null);
  const [hint,setHint] = useState<DropHint|null>(null);
  function finish() {
    source.current = null;
    setDragging(null);
    setHint(null);
  }
  useEffect(()=>{if (locked) finish();},[locked]);

  function start(event:DragEvent<HTMLButtonElement>, id:string) {
    const lane=event.currentTarget.closest<HTMLElement>('[data-home-cell]');
    if (locked || !lane?.dataset.homeCell) { event.preventDefault(); return; }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-kachamak-home-block', id);
    source.current = id;
    sourceRow.current=lane.dataset.homeCell;
    setDragging(id);
  }
  function over(event:DragEvent<HTMLDivElement>) {
    if (locked || !source.current) return;
    event.preventDefault();
    const position = placementAt(event,sourceRow.current);
    event.dataTransfer.dropEffect=position?'move':'none';
    const next = position?.targetId === source.current ? null : position;
    setHint(prev=>prev?.targetId===next?.targetId && prev?.side===next?.side && prev?.axis===next?.axis && sameCell(prev?.cell,next?.cell) ? prev : next);
  }
  function drop(event:DragEvent<HTMLDivElement>) {
    if (locked || !source.current) return;
    event.preventDefault();
    const position = placementAt(event,sourceRow.current);
    if (position && source.current !== position.targetId) place(source.current,position);
    finish();
  }
  function leave(event:DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node|null)) setHint(null);
  }
  return {dragging,hint,start,finish,gridEvents:{onDragOver:over,onDrop:drop,onDragLeave:leave}};
}
