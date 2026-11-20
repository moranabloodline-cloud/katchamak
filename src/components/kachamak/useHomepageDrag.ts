import {useEffect, useRef, useState, type DragEvent} from 'react';
import type {HomePlacement} from '@/lib/kachamak/homepage';

type DropHint = HomePlacement & { axis: 'row' | 'column' };

function placementAt(event: DragEvent<HTMLDivElement>): DropHint | null {
  const grid = event.currentTarget;
  const x = event.clientX, y = event.clientY;
  let target = (event.target as Element).closest<HTMLElement>('[data-home-block]');
  if (!target || !grid.contains(target)) {
    // Empty cells and gutters belong to the nearest card in the pointed-at row.
    let bestRow = Infinity, bestColumn = Infinity;
    for (const card of grid.querySelectorAll<HTMLElement>('[data-home-block]')) {
      const rect = card.getBoundingClientRect();
      const row = Math.max(rect.top - y, y - rect.bottom, 0);
      const column = Math.max(rect.left - x, x - rect.right, 0);
      if (row < bestRow || (row === bestRow && column < bestColumn)) {
        target = card;
        bestRow = row;
        bestColumn = column;
      }
    }
  }
  if (!target?.dataset.homeBlock) return null;
  const rect = target.getBoundingClientRect();
  const fullRow = rect.width >= grid.clientWidth - 1;
  const before = fullRow ? y < rect.top + rect.height / 2 : x < rect.left + rect.width / 2;
  return {targetId:target.dataset.homeBlock, side:before?'before':'after', axis:fullRow?'row':'column'};
}

export function useHomepageDrag(locked:boolean, place:(id:string, position:HomePlacement)=>void) {
  const source = useRef<string|null>(null);
  const [dragging,setDragging] = useState<string|null>(null);
  const [hint,setHint] = useState<DropHint|null>(null);
  function finish() {
    source.current = null;
    setDragging(null);
    setHint(null);
  }
  useEffect(()=>{if (locked) finish();},[locked]);

  function start(event:DragEvent<HTMLButtonElement>, id:string) {
    if (locked) { event.preventDefault(); return; }
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-kachamak-home-block', id);
    source.current = id;
    setDragging(id);
  }
  function over(event:DragEvent<HTMLDivElement>) {
    if (locked || !source.current) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const position = placementAt(event);
    const next = position?.targetId === source.current ? null : position;
    setHint(prev=>prev?.targetId===next?.targetId && prev?.side===next?.side && prev?.axis===next?.axis ? prev : next);
  }
  function drop(event:DragEvent<HTMLDivElement>) {
    if (locked || !source.current) return;
    event.preventDefault();
    const position = placementAt(event);
    if (position && source.current !== position.targetId) place(source.current,position);
    finish();
  }
  function leave(event:DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node|null)) setHint(null);
  }
  return {dragging,hint,start,finish,gridEvents:{onDragOver:over,onDrop:drop,onDragLeave:leave}};
}
