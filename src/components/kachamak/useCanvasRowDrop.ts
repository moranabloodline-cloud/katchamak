import {useCallback,useEffect,useRef,type RefObject} from 'react';
import type {HomeCell} from '@/lib/kachamak/homepage';

export function useCanvasRowDrop(scroller:RefObject<HTMLDivElement|null>) {
  const active=useRef<HTMLElement|null>(null);
  const frame=useRef(0);
  const caption=useRef('');
  const pointer=useRef({x:0,y:0});

  const highlight=(lane:HTMLElement|null)=>{
    if(active.current===lane)return;
    active.current?.removeAttribute('data-card-drop');
    lane?.setAttribute('data-card-drop',caption.current);
    active.current=lane;
  };
  const laneAt=(x:number,y:number)=>{
    const lane=document.elementFromPoint(x,y)?.closest<HTMLElement>('[data-home-cell]');
    return lane && scroller.current?.contains(lane)?lane:null;
  };
  const clear=useCallback(()=>{
    cancelAnimationFrame(frame.current);
    frame.current=0;
    active.current?.removeAttribute('data-card-drop');
    active.current=null;
  },[]);
  useEffect(()=>clear,[clear]);

  function scrollAtEdge(){
    frame.current=0;
    const el=scroller.current;
    if(!el)return;
    const {x,y}=pointer.current;
    const r=el.getBoundingClientRect();
    if(x<r.left||x>=r.right||y<r.top||y>=r.bottom)return;
    const edge=48;
    const step=y<r.top+edge?-Math.ceil((r.top+edge-y)/3):y>r.bottom-edge?Math.ceil((y-r.bottom+edge)/3):0;
    const top=el.scrollTop;
    if(step)el.scrollTop+=step;
    if(el.scrollTop!==top){
      highlight(laneAt(x,y));
      frame.current=requestAnimationFrame(scrollAtEdge);
    }
  }
  function track(x:number,y:number,title:string){
    caption.current=title;
    pointer.current={x,y};
    highlight(laneAt(x,y));
    if(!frame.current)frame.current=requestAnimationFrame(scrollAtEdge);
  }
  function target(x:number,y:number):HomeCell|undefined {
    const lane=laneAt(x,y);
    if(lane)return {rowId:lane.dataset.homeCell!,column:Number(lane.dataset.column)};
  }
  return {track,target,clear};
}
