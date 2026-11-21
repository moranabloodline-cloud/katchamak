import {useCallback,useEffect,useRef,useState,type DragEvent,type RefObject} from 'react';
import {CARD_WIDTH,COLUMN_WIDTH,type CanvasTool,type Point} from '@/lib/kachamak/canvas-board';
import type {HomeCell} from '@/lib/kachamak/homepage';

export type PaletteItem = Exclude<CanvasTool,'line'> | 'layout';
export type CanvasPlacement = {at:Point} | {cell:HomeCell;before?:string};
type Preview = Point & {width:number;cell:boolean};
type Source = {type:'tool';kind:PaletteItem;button:HTMLButtonElement} | {type:'cards';ids:string[];from:HomeCell};
const transferType='application/x-kachamak-canvas-tool';

// Resolve against the rendered cell so wrapping columns and scaled cards share the same hit test.
function targetAt(target:Element,y:number,source:Source) {
  const lane=target.closest<HTMLElement>('[data-home-cell]');
  if(!lane)return source.type==='cards'||target.closest('[data-world-row]')?null:{};
  if(source.type==='tool'&&source.kind==='column')return null;
  const cards=Array.from(lane.querySelectorAll<HTMLElement>(':scope > [data-home-block]')).filter(card=>source.type!=='cards'||!source.ids.includes(card.dataset.homeBlock!));
  const before=cards.find(card=>{
    const rect=card.getBoundingClientRect();
    return y<rect.top+rect.height/2;
  });
  const bounds=lane.getBoundingClientRect();
  const lineY=before?.getBoundingClientRect().top ?? cards.at(-1)?.getBoundingClientRect().bottom ?? bounds.top;
  return {cell:{rowId:lane.dataset.homeCell!,column:Number(lane.dataset.column)},before:before?.dataset.homeBlock,
    line:{x:bounds.left,y:lineY,width:bounds.width}};
}

export function useCanvasToolDrop(surface:RefObject<HTMLDivElement|null>,locked:boolean,zoom:number,
  local:(x:number,y:number)=>Point,boardPoint:(point:Point)=>Point,
  place:(kind:PaletteItem,target:CanvasPlacement)=>void,
  move:(ids:string[],from:HomeCell,cell:HomeCell,before?:string)=>void) {
  const source=useRef<Source|null>(null);
  const [preview,setPreview]=useState<Preview|null>(null);
  const clear=useCallback(()=>{
    if(source.current?.type==='tool')source.current.button.removeAttribute('data-tool-dragging');
    source.current=null;
    setPreview(null);
  },[]);
  useEffect(()=>clear,[locked,clear]);

  function start(event:DragEvent<HTMLButtonElement>,kind:PaletteItem){
    if(locked){event.preventDefault();return;}
    const button=event.currentTarget;
    source.current={type:'tool',button,kind};
    event.dataTransfer.setData(transferType,kind);
    event.dataTransfer.effectAllowed='copy';
    // Keep the source mounted. On a small screen the floating panel yields the drop area.
    requestAnimationFrame(()=>{if(source.current?.type==='tool'&&source.current.button===button)button.dataset.toolDragging='true';});
  }
  function startCards(event:DragEvent,ids:string[],from:HomeCell){
    if(locked||!ids.length){event.preventDefault();return;}
    source.current={type:'cards',ids,from};
    event.dataTransfer.clearData();
    event.dataTransfer.setData(transferType,'cards');
    event.dataTransfer.effectAllowed='move';
  }
  function destination(event:DragEvent<HTMLDivElement>){
    const active=source.current, el=event.target;
    if(!active || locked || !event.dataTransfer.types.includes(transferType) ||
       !(el instanceof Element) || !surface.current?.contains(el))return;
    return targetAt(el,event.clientY,active);
  }
  function over(event:DragEvent<HTMLDivElement>){
    const target=destination(event);
    if(target===undefined)return;
    event.preventDefault();
    event.dataTransfer.dropEffect=target?(source.current?.type==='cards'?'move':'copy'):'none';
    if(!target){setPreview(null);return;}
    if(target.line){
      const {x,y,width}=target.line, left=local(x,y);
      setPreview({...left,width:local(x+width,y).x-left.x,cell:true});
    }else{
      setPreview({...local(event.clientX,event.clientY),width:(source.current?.type==='tool'&&source.current.kind==='column'?COLUMN_WIDTH:CARD_WIDTH)*zoom,cell:false});
    }
  }
  function drop(event:DragEvent<HTMLDivElement>){
    const target=destination(event),active=source.current;
    if(target===undefined||!active)return;
    event.preventDefault();
    const own=event.dataTransfer.getData(transferType)===(active.type==='tool'?active.kind:'cards');
    clear();
    if(!own||!target)return;
    if(active.type==='cards'){
      if(target.cell)move(active.ids,active.from,target.cell,target.before);
      return;
    }
    place(active.kind,target.cell?{cell:target.cell,before:target.before}:{at:boardPoint(local(event.clientX,event.clientY))});
  }
  function leave(event:DragEvent<HTMLDivElement>){
    if(!event.currentTarget.contains(event.relatedTarget as Node|null))setPreview(null);
  }
  return {start,startCards,clear,preview,events:{onDragOver:over,onDrop:drop,onDragLeave:leave}};
}
