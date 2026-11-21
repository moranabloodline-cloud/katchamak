'use client';

import {useEffect,useId,useLayoutEffect,useMemo,useRef,useState,type ReactNode,type PointerEvent as PEvent} from 'react';
import {Check,Focus,Grid2X2,Grid2X2X,Hand,Layers,ListTree,LockKeyhole,Minus,MousePointer2,Pencil,Plus,Trash2,UnlockKeyhole} from 'lucide-react';
import {boardLayers,frameBetween,framedItems,selectionRoots,type SelectionCommand} from '@/lib/kachamak/canvas-selection';
import {useKachamak} from '@/lib/kachamak/store';
import {CanvasSelectionTools} from './CanvasSelectionTools';
import {boardRects,CARD_WIDTH,COLUMN_WIDTH,type Point,type BoardRect,type CanvasTool,type Stroke} from '@/lib/kachamak/canvas-board';
import type {HomeBlock,HomeChange,HomePageEntry,HomeTarget} from '@/lib/kachamak/homepage';
import type {NoteNode,Novel} from '@/lib/kachamak/types';
import {registerZoomReset,saveZoomSetting,useZoomSetting} from '@/lib/kachamak/workspace-zoom';
import {CanvasItemEditor,newCanvasBlock} from './CanvasItemEditor';
import {CanvasItemFace} from './CanvasItemFace';
import {CanvasTools,toolsByKind} from './CanvasTools';
import {InkPaths} from './CanvasInk';

type Gesture={kind:'pan'|'move'|'ink'|'frame';base?:string[]; group?:string[];start:Point;origin:Point;id?:string;points?:Stroke};
type Props={novel:Novel;page:HomePageEntry;byId:Map<string,NoteNode>;change:(a:HomeChange)=>boolean;
  fixedRows:ReactNode;layoutActions:ReactNode;editClassic:(b:HomeBlock)=>void;renderClassic:(b:HomeBlock)=>ReactNode;addClassic:(at:Point)=>void;
  open:(t:HomeTarget)=>void;describe:(t:HomeTarget)=>string;showTree?:()=>void};
const inside=(p:Point,r:BoardRect)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
function initialPan(key:string):Point{
  try{const p=JSON.parse(sessionStorage.getItem(key)??'null');if(Number.isFinite(p?.x)&&Number.isFinite(p?.y))return p;}catch{}
  return {x:32,y:36};
}
export function CanvasBoard({novel,page,byId,change,open,describe,showTree,fixedRows,layoutActions,editClassic,renderClassic,addClassic}:Props){
  const surface=useRef<HTMLDivElement>(null),world=useRef<HTMLDivElement>(null);
  const scroller=useRef<HTMLDivElement>(null),freeArea=useRef<HTMLDivElement>(null);
  const positionKey='kachamak-board:'+novel.id+':'+page.id;
  const [pan,setPan]=useState<Point>(()=>initialPan(positionKey));
  const showGrid=useZoomSetting(positionKey,'grid')!=='hidden';
  const storedZoom=Number(useZoomSetting(positionKey,'zoom'));
  const zoom=storedZoom>=0.02&&storedZoom<=3?storedZoom:1;
  const setZoom=(level:number)=>saveZoomSetting(positionKey,'zoom',String(Math.min(3,Math.max(.02,Math.round(level*100)/100))));
  const zoomRef=useRef(zoom);zoomRef.current=zoom;
  const [heights,setHeights]=useState(new Map<string,number>());
  const [tool,setTool]=useState<'select'|'pan'|'line'|'draw'>('select');
  const [inkColor,setInkColor]=useState('#dfac74');
  const [selection,setSelection]=useState<string[]>([]),[from,setFrom]=useState<string|null>(null);
  const [framed,setFramed]=useState(false);
  const setSelected=(id:string|null)=>{setFramed(false);setSelection(id?[id]:[]);};
  const [marquee,setMarquee]=useState<BoardRect|null>(null);
  const convertSelection=useKachamak(s=>s.convertBoardSelection);
  const [editor,setEditor]=useState<{initial:HomeBlock;original?:HomeBlock}|null>(null);
  const [status,setStatus]=useState('');
  const gesture=useRef<Gesture|null>(null);
  const [move,setMove]=useState<{id:string;at:Point;over?:string;group?:Set<string>}|null>(null);
  const [liveInk,setLiveInk]=useState<Stroke>([]);
  const lastPointer=useRef<Point|null>(null),previousZoom=useRef(zoom);
  const rects=useMemo(()=>boardRects(page.blocks,heights),[page.blocks,heights]);
  const blocks=useMemo(()=>new Map(page.blocks.map(b=>[b.id,b])),[page.blocks]);
  const items=useMemo(()=>selectionRoots(page.blocks,new Set(selection)),[page.blocks,selection]);
  const selected=items.length===1?items[0].id:selection.length===1?selection[0]:undefined;
  const focused=selected?blocks.get(selected):undefined;
  const edgePrefix=useId();
  const columnEdges=useMemo(()=>{
    const inside=new Map<string,string[]>();
    for(const b of page.blocks){
      if(!b.edge)continue;
      for(const col of new Set([blocks.get(b.edge.from)?.columnId,blocks.get(b.edge.to)?.columnId])){
        if(!col)continue;
        const edges=inside.get(col)??[];edges.push(b.id);inside.set(col,edges);
      }
    }
    return inside;
  },[page.blocks,blocks]);
  const layers=useMemo(()=>boardLayers(page.blocks),[page.blocks]);
  const highlighted=useMemo(()=>{
    if(!marquee)return new Set(selection);
    return new Set([...(gesture.current?.base??[]),...framedItems(page.blocks,rects,marquee)]);
  },[selection,marquee,rects,page.blocks]);
  const fixed=(b:HomeBlock)=>!!(b.positionLocked || b.columnId&&blocks.get(b.columnId)?.positionLocked);
  const batch=(command:SelectionCommand)=>save({type:'boardSelection',ids:items.map(b=>b.id),command,heights:[...heights]});
  const save=(action:HomeChange)=>{const ok=change(action);if(!ok)setStatus('The board changed. Select the item again.');return ok;};
  useEffect(()=>{try{sessionStorage.setItem(positionKey,JSON.stringify(pan));}catch{}},[pan,positionKey]);
  useEffect(()=>{if(page.locked){setEditor(null);setFrom(null);setTool('select');setMove(null);setSelected(null);setMarquee(null);setLiveInk([]);gesture.current=null;}},[page.locked]);
  useLayoutEffect(()=>{
    if(previousZoom.current===zoom)return;
    const s=surface.current;if(!s)return;
    const ratio=zoom/previousZoom.current;previousZoom.current=zoom;
    const pivot=lastPointer.current??{x:s.clientWidth/2,y:s.clientHeight/2};
    setPan(p=>({x:pivot.x-(pivot.x-p.x)*ratio,y:pivot.y-(pivot.y-p.y)*ratio}));
  },[zoom]);
  useLayoutEffect(()=>{
    if(!world.current || typeof ResizeObserver==='undefined')return;
    const observer=new ResizeObserver(entries=>setHeights(prev=>{
      let next=prev;
      for(const {target} of entries){
        const el=target as HTMLElement,id=el.dataset.boardCard!,h=el.offsetHeight;
        if(h && prev.get(id)!==h){if(next===prev)next=new Map(prev);next.set(id,h);}
      }
      return next;
    }));
    world.current.querySelectorAll('[data-board-card]:not([data-board-column])').forEach(el=>observer.observe(el));
    return ()=>observer.disconnect();
  },[page.blocks]);
  useEffect(()=>{
    const el=surface.current;if(!el)return;
    const reset=registerZoomReset(el,()=>{lastPointer.current=null;setZoom(1);});
    const wheel=(e:WheelEvent)=>{
      const scroll=scroller.current;
      if(!e.ctrlKey&&!e.shiftKey&&scroll&&Math.abs(e.deltaY)>Math.abs(e.deltaX) &&
        (e.deltaY<0&&scroll.scrollTop>1 || e.deltaY>0&&scroll.scrollTop+scroll.clientHeight<scroll.scrollHeight-1))return;
      e.preventDefault();e.stopPropagation();
      const factor=e.deltaMode===1?16:e.deltaMode===2?el.clientHeight:1;
      if(e.ctrlKey){
        const r=el.getBoundingClientRect();lastPointer.current={x:e.clientX-r.x,y:e.clientY-r.y};
        setZoom(zoomRef.current*Math.exp(-Math.max(-400,Math.min(400,e.deltaY*factor))*.002));
      }else setPan(p=>({x:p.x-(e.deltaX+(e.shiftKey?e.deltaY:0))*factor,y:p.y-(e.shiftKey?0:e.deltaY)*factor}));
    };
    el.addEventListener('wheel',wheel,{passive:false});
    return ()=>{reset();el.removeEventListener('wheel',wheel);};
  },[positionKey]);
  const local=(x:number,y:number)=>{const r=surface.current!.getBoundingClientRect();return {x:x-r.left,y:y-r.top};};
  const boardPoint=(p:Point)=>({x:(p.x-pan.x)/zoom,y:(p.y-pan.y)/zoom});
  function visualRect(id:string){
    const r=rects.get(id)!;
    if(!move)return r;
    if(move.group?.has(id)||move.group?.has(blocks.get(id)?.columnId??'')){
      const start=rects.get(move.id)!;return {...r,x:r.x+move.at.x-start.x,y:r.y+move.at.y-start.y};
    }
    if(id===move.id)return {...r,...move.at};
    if(blocks.get(id)?.columnId===move.id){const start=rects.get(move.id)!;return {...r,x:r.x+move.at.x-start.x,y:r.y+move.at.y-start.y};}
    return r;
  }
  function columnAt(p:Point,id:string){
    if(blocks.get(id)?.layout==='column')return undefined;
    return page.blocks.filter(b=>b.layout==='column'&&!b.positionLocked&&inside(p,rects.get(b.id)!))
      .sort((a,b)=>layers.get(b.id)!-layers.get(a.id)!)[0]?.id;
  }
  function nextPosition(kind:CanvasTool):Point{
    const el=surface.current!,start=boardPoint({x:28,y:28});
    const width=kind==='column'?COLUMN_WIDTH:CARD_WIDTH,step=COLUMN_WIDTH+24;
    const lanes=Math.max(1,1+Math.floor((el.clientWidth/zoom-56-width)/step));
    let best:Point|null=null;
    for(let lane=0;lane<lanes;lane++){
      const x=Math.round(start.x+lane*step);
      let y=Math.round(start.y);
      // Leave room below each new item for its real text, image or table height.
      for(const r of rects.values())if(x+width>r.x-14 && x<r.x+r.w+14)y=Math.max(y,r.y+r.h+20);
      if(!best || y<best.y)best={x,y};
    }
    return best!;
  }
  function pick(kind:CanvasTool){
    if(page.locked)return;
    if(fixedRows)freeArea.current?.scrollIntoView({block:'nearest'});
    setFrom(null);setStatus('');
    if(kind==='line'||kind==='draw'){setTool(current=>current===kind?'select':kind);return;}
    setTool('select');
    const initial={...newCanvasBlock(kind),at:nextPosition(kind)};
    if(kind!=='column'&&focused?.layout==='column')Object.assign(initial,{columnId:focused.id});
    setEditor({initial});
  }
  function finishLink(id:string){
    if(!from){setFrom(id);return;}
    if(from===id){setFrom(null);return;}
    const line:HomeBlock={...newCanvasBlock('line'),edge:{from,to:id}};
    if(save({type:'add',block:line})){setSelected(line.id);setTool('select');setFrom(null);}
  }
  function remove(){
    if(!focused || page.locked)return;
    if(!window.confirm('Remove this '+(focused.layout==='column'?'column? Its cards will stay on the board.':'item and its connections?')))return;
    const positions=Object.fromEntries([...rects].map(([id,r])=>[id,{x:r.x,y:r.y}]));
    if(save({type:'removeBoardItem',original:focused,positions}))setSelected(null);
  }
  function fit(){
    const s=surface.current;if(!s||!rects.size)return;
    const rs=[...rects.values()],left=Math.min(...rs.map(r=>r.x)),right=Math.max(...rs.map(r=>r.x+r.w)),top=Math.min(...rs.map(r=>r.y)),bottom=Math.max(...rs.map(r=>r.y+r.h));
    const level=Math.min(2,Math.max(.02,Math.floor(100*Math.min((s.clientWidth-48)/(right-left),(s.clientHeight-48)/(bottom-top)))/100));
    previousZoom.current=level;setZoom(level);setPan({x:(s.clientWidth-(right-left)*level)/2-left*level,y:(s.clientHeight-(bottom-top)*level)/2-top*level});
  }
  function startGesture(e:PEvent<HTMLDivElement>){
    if(!e.isPrimary||e.button!==0&&e.button!==1)return;
    const target=e.target as Element,card=target.closest<HTMLElement>('[data-board-card]'),id=card?.dataset.boardCard;
    const start=local(e.clientX,e.clientY),p=boardPoint(start);
    if(e.button===1 || tool==='pan'){gesture.current={kind:'pan',start,origin:pan};}
    else if(!page.locked&&tool==='draw'){gesture.current={kind:'ink',start,origin:p,points:[[p.x,p.y]]};setLiveInk([[p.x,p.y]]);}
    else if(!page.locked&&tool==='line'&&id){finishLink(id);e.preventDefault();return;}
    else if(target.closest('button,a,input,audio,iframe,video,select,[data-board-edge],[data-board-edge-copy]'))return;
    else if(id&&!page.locked){
      if(e.shiftKey||e.ctrlKey||e.metaKey){
        setSelection(prior=>prior.includes(id)?prior.filter(key=>key!==id):[...prior,id]);
        e.preventDefault();return;
      }
      const member=items.find(b=>b.id===id || b.id===blocks.get(id)?.columnId);
      const group=items.length>1 && member?items:undefined;
      const anchor=group?member!.id:id;
      if(!group)setSelected(id);
      if((group??[blocks.get(id)!]).some(fixed)){e.preventDefault();return;}
      gesture.current={kind:'move',start,origin:rects.get(anchor)!,id:anchor,group:group?.map(b=>b.id)};
    }else if(!page.locked&&tool==='select'){
      const base=e.shiftKey||e.ctrlKey||e.metaKey?selection:[];
      gesture.current={kind:'frame',start,origin:p,base};
    }else {setSelected(null);gesture.current={kind:'pan',start,origin:pan};}
    surface.current!.setPointerCapture(e.pointerId);e.preventDefault();
  }
  function track(e:PEvent<HTMLDivElement>){
    const point=local(e.clientX,e.clientY);lastPointer.current=point;
    const g=gesture.current;if(!g||!e.isPrimary)return;
    const dx=point.x-g.start.x,dy=point.y-g.start.y,p=boardPoint(point);
    if(g.kind==='frame' && (marquee||Math.abs(dx)+Math.abs(dy)>3))setMarquee(frameBetween(g.origin,p));
    if(g.kind==='pan')setPan({x:g.origin.x+dx,y:g.origin.y+dy});
    if(g.kind==='ink'){g.points!.push([p.x,p.y]);setLiveInk([...g.points!]);}
    if(g.kind==='move'&&(Math.abs(dx)+Math.abs(dy)>3 || move))setMove({id:g.id!,at:{x:g.origin.x+dx/zoom,y:g.origin.y+dy/zoom},over:g.group?undefined:columnAt(p,g.id!),group:g.group?new Set(g.group):undefined});
  }
  function endGesture(e:PEvent<HTMLDivElement>){
    const g=gesture.current;if(!g||!e.isPrimary)return;
    const point=local(e.clientX,e.clientY),p=boardPoint(point);
    const dragged=Math.abs(point.x-g.start.x)+Math.abs(point.y-g.start.y)>3;
    if(g.kind==='frame'){
      setFramed(dragged);
      const hits=dragged?framedItems(page.blocks,rects,frameBetween(g.origin,p)):[];
      setSelection(selectionRoots(page.blocks,new Set([...(g.base??[]),...hits])).map(b=>b.id));
    }
    if(g.kind==='move'&&(move||dragged)&&g.group){
      save({type:'boardSelection',ids:g.group,heights:[...heights],command:{kind:'translate',delta:{x:(point.x-g.start.x)/zoom,y:(point.y-g.start.y)/zoom}}});
    }else if(g.kind==='move'&&(move||dragged)){
      const col=columnAt(p,g.id!),before=col?page.blocks.find(b=>b.columnId===col&&b.id!==g.id&&p.y<rects.get(b.id)!.y+rects.get(b.id)!.h/2)?.id:undefined;
      save({type:'boardMove',id:g.id!,at:{x:Math.round(g.origin.x+(point.x-g.start.x)/zoom),y:Math.round(g.origin.y+(point.y-g.start.y)/zoom)},columnId:col,before});
    }
    if(g.kind==='ink'&&g.points?.length){
      const points=g.points;
      let x=Infinity,y=Infinity,right=-Infinity,bottom=-Infinity;
      for(const [px,py] of points){x=Math.min(x,px-4);right=Math.max(right,px+4);y=Math.min(y,py-4);bottom=Math.max(bottom,py+4);}
      const w=right-x,h=bottom-y;
      const b={...newCanvasBlock('draw'),at:{x,y},extent:{w,h},color:inkColor,ink:[points.map(([px,py])=>[Math.round((px-x)*320/w),Math.round((py-y)*180/h)] as [number,number])]};
      save({type:'add',block:b});
    }
    cancelGesture();
  }
  function cancelGesture(){gesture.current=null;setMove(null);setLiveInk([]);setMarquee(null);}
  const editBlock=(b:HomeBlock)=>{
    if(!(b.layout in toolsByKind) || b.layout==='image'&&(b.imageFrame||b.imageCutout))editClassic(b);
    else setEditor({initial:b,original:b});
  };
  const editFocused=()=>{if(focused&&focused.layout!=='line')editBlock(focused);};
  const resetTool=()=>{setTool('select');setFrom(null);cancelGesture();};
  const btn=(label:string,Icon:typeof Plus,fn:()=>void,pressed?:boolean)=><button type="button" title={label} aria-label={label} aria-pressed={pressed} className="cv-icon" onClick={fn}><Icon size={16}/></button>;
  return <section className="cv-board-shell col-span-full row-start-2" aria-label="Canvas board" aria-description={page.title}>
    <div className="cv-board-main"><header className="cv-board-head"><button type="button" className="md:hidden" aria-label="Show canvas tree" onClick={showTree}><ListTree size={16}/></button><Layers size={16}/><h2>{page.title}</h2>
      {focused&&!page.locked&&tool==='select'&&<div className="cv-selection-tools">{focused.positionLocked&&btn('Unlock position',UnlockKeyhole,()=>batch({kind:'lock',locked:false}))}{focused.layout!=='line'&&btn('Edit selected item',Pencil,editFocused)}{btn('Remove selected item',Trash2,remove)}</div>}
      {!page.locked&&layoutActions}
      {btn(page.locked?'Unlock canvas':'Lock canvas',page.locked?LockKeyhole:UnlockKeyhole,()=>save({type:'lock',locked:!page.locked}))}</header>
    <div ref={scroller} className="cv-layout-scroll">
    {fixedRows}
    <div ref={freeArea} className={'cv-free-area'+(fixedRows?' cv-below-rows':'')} hidden={!!fixedRows&&page.locked&&!page.blocks.length}>
    {fixedRows&&<h3 className="cv-free-label"><MousePointer2 size={13}/>Free canvas</h3>}
    <div ref={surface} tabIndex={0} aria-label="Board surface" className={'cv-surface cv-mode-'+tool} style={{backgroundImage:showGrid?undefined:'none',backgroundSize:24*zoom+'px '+24*zoom+'px',backgroundPosition:pan.x+'px '+pan.y+'px'}}
      onPointerDown={startGesture} onPointerMove={track} onPointerUp={endGesture} onPointerCancel={cancelGesture} onLostPointerCapture={cancelGesture}
      onKeyDown={e=>{if(e.key==='Escape'){resetTool();setSelected(null);}if(e.target===surface.current&&e.key==='Delete')remove();}}>
      <div ref={world} className="cv-world" style={{transform:'translate('+pan.x+'px,'+pan.y+'px) scale('+zoom+')'}}>
        <svg className="cv-lines" aria-label="Connections" style={{zIndex:0}}>{page.blocks.filter(b=>b.layout==='line').map(b=>{
          const a=visualRect(b.edge!.from),z=visualRect(b.edge!.to);
          const vertical=Math.abs(z.x+z.w/2-a.x-a.w/2)<Math.min(a.w,z.w)*0.65;
          const forward=vertical?z.y+z.h/2>=a.y+a.h/2:z.x+z.w/2>=a.x+a.w/2;
          const x=a.x+(vertical?a.w/2:forward?a.w:0),x2=z.x+(vertical?z.w/2:forward?0:z.w);
          const y=a.y+(vertical?(forward?a.h:0):a.h/2),y2=z.y+(vertical?(forward?0:z.h):z.h/2);
          const bend=Math.max(5,Math.abs(vertical?y2-y:x2-x)*.45)*(forward?1:-1);
          const dx=vertical?0:bend,dy=vertical?bend:0;
          const d='M '+x+' '+y+' C '+(x+dx)+' '+(y+dy)+' '+(x2-dx)+' '+(y2-dy)+' '+x2+' '+y2;
          return <g key={b.id} id={edgePrefix+b.id} data-board-edge={b.id}><path d={d} fill="none" stroke={selected===b.id?'#f2ce80':'#a98854'} strokeWidth={2}/>{!page.locked&&<path d={d} fill="none" stroke="transparent" strokeWidth={18} style={{pointerEvents:'stroke',cursor:'pointer'}} role="button" tabIndex={0} aria-label="Select connection" onClick={()=>setSelected(b.id)} onKeyDown={e=>{if(e.key==='Enter')setSelected(b.id);}}/>}<circle cx={x2} cy={y2} r={3} fill="#dbb879"/></g>;
        })}</svg>
        {page.blocks.filter(b=>b.layout!=='line').map(b=>{
          const r=visualRect(b.id),column=b.layout==='column',kind=b.layout as CanvasTool,{icon:Icon,name,color}=toolsByKind[kind]??{icon:Layers,name:b.layout[0].toUpperCase()+b.layout.slice(1),color:'#c7ae83'};
          const looseInk=kind==='draw'&&!!b.extent;
          return <article data-board-card={b.id} data-board-column={column?'':undefined} aria-label={b.title||name} key={b.id} tabIndex={0}
            onKeyDown={e=>{if(e.target!==e.currentTarget||page.locked)return;
              if(e.key===' '&&(e.ctrlKey||e.metaKey||e.shiftKey)){e.preventDefault();setSelection(prior=>prior.includes(b.id)?prior.filter(id=>id!==b.id):[...prior,b.id]);return;}
              if(e.key==='Enter'){if(tool==='line')finishLink(b.id);else editBlock(b);}
              if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
                e.preventDefault();const delta={x:e.key==='ArrowRight'?16:e.key==='ArrowLeft'?-16:0,y:e.key==='ArrowDown'?16:e.key==='ArrowUp'?-16:0};
                if(items.length>1&&highlighted.has(b.id)){if(!items.some(fixed))batch({kind:'translate',delta});}
                else if(!fixed(b)&&!b.columnId)save({type:'boardMove',id:b.id,at:{x:r.x+delta.x,y:r.y+delta.y}});
              }}}
            onFocus={e=>{if(!page.locked&&e.target===e.currentTarget&&e.currentTarget.matches(':focus-visible')&&!highlighted.has(b.id))setSelected(b.id);}}
            className={'cv-card'+(column?' cv-column':'')+(looseInk?' cv-free-ink':'')+(tool==='line'?' cv-connectable':'')}
            data-selected={!page.locked&&(highlighted.has(b.id)||from===b.id)||undefined} data-drop={move?.over===b.id||undefined}
            style={{left:r.x,top:r.y,width:r.w,height:column?r.h:undefined,zIndex:move?.id===b.id&&!column&&!move.group?layers.size*2+3:(layers.get(b.columnId??b.id)??1)+(b.columnId?1:0),'--cv-accent':b.color??color} as React.CSSProperties}>
            {column&&columnEdges.has(b.id)&&<svg className="cv-column-lines" aria-hidden="true">
              <g transform={'translate('+(-r.x)+' '+(-r.y)+')'}>{columnEdges.get(b.id)!.map(id=>
                <use key={id} href={'#'+edgePrefix+id} data-board-edge-copy={id} onClick={()=>{if(!page.locked)setSelected(id);}}/>)}</g>
            </svg>}
            {!looseInk&&<div className="cv-card-cap"><Icon size={13}/>{column?<strong>{b.title||'Column'}</strong>:<span>{name}</span>}{b.positionLocked&&<LockKeyhole size={11} aria-label="Position locked"/>}{column&&<small>{page.blocks.filter(x=>x.columnId===b.id).length}</small>}
              {!page.locked&&<button aria-label={'Edit '+(b.title||name)} type="button" onClick={()=>editBlock(b)}><Pencil size={13}/></button>}</div>}
            {column?(!page.locked&&<button type="button" className="cv-column-add" aria-label={'Add note to '+b.title} onClick={()=>{setTool('select');setEditor({initial:{...newCanvasBlock('note'),at:{x:r.x+14,y:r.y+56},columnId:b.id}});}}><Plus size={13}/> Note</button>):
            !(kind in toolsByKind)?renderClassic(b):<CanvasItemFace block={b} novel={novel} locked={page.locked} source={b.target?.kind==='note'?byId.get(b.target.id):undefined} open={open} describe={describe} toggle={(index,done)=>save({type:'task',id:b.id,index,done})}/>}
          </article>;
        })}
        {liveInk.length>0&&<svg className="cv-live-ink"><InkPaths strokes={[liveInk]} color={inkColor}/></svg>}
      </div>
      {marquee&&<div className="cv-marquee" aria-hidden="true" style={{left:pan.x+marquee.x*zoom,top:pan.y+marquee.y*zoom,width:marquee.w*zoom,height:marquee.h*zoom}}/>}
      {!page.blocks.length&&!page.locked&&tool==='select'&&<button type="button" className="cv-first" onClick={()=>pick('note')}><Plus size={18}/>Add your first note</button>}
    </div>
    <div className="cv-board-dock">
      {btn('Select items',MousePointer2,resetTool,tool==='select')}{btn('Pan board',Hand,()=>{setFrom(null);setTool('pan');},tool==='pan')}
      <span className="cv-dock-divider"/>{btn('Zoom out',Minus,()=>{lastPointer.current=null;setZoom(zoom/1.2);})}
      <button className="cv-zoom-level" title="Reset zoom" onClick={()=>{lastPointer.current=null;setZoom(1);}}>{Math.round(zoom*100)}%</button>
      {btn('Zoom in',Plus,()=>{lastPointer.current=null;setZoom(zoom*1.2);})}{btn('Fit board',Focus,fit)}
      {btn(showGrid?'Hide grid':'Show grid',showGrid?Grid2X2:Grid2X2X,()=>saveZoomSetting(positionKey,'grid',showGrid?'hidden':'visible'))}
    </div>
    {(tool==='draw'||tool==='line'||status)&&<div className="cv-mode-message" role="status">{status||(tool==='draw'?'Draw on the board':from?'Choose the second item':'Choose the first item')}{tool==='draw'&&<input aria-label="Drawing color" type="color" value={inkColor} onChange={e=>setInkColor(e.target.value)}/>}<button aria-label="Finish tool" onClick={()=>{resetTool();setStatus('');}}><Check size={15}/></button></div>}
    </div></div></div>{!page.locked&&(items.length>1 || framed&&items.length===1)&&tool==='select'?<CanvasSelectionTools items={items} fixed={items.some(fixed)} clear={()=>setSelected(null)} run={batch}
      convert={title=>convertSelection(novel.id,page.id,items.map(b=>b.id),title,[...heights])}/>:!page.locked&&<CanvasTools onPick={pick} onClassic={()=>{if(fixedRows)freeArea.current?.scrollIntoView({block:'nearest'});addClassic(nextPosition('note'));}} active={tool==='draw'||tool==='line'?tool:null}/>}
    {editor&&!page.locked&&<CanvasItemEditor novel={novel} initial={editor.initial} creating={!editor.original} onClose={()=>setEditor(null)} onSave={block=>{
      const ok=save(editor.original?{type:'edit',original:editor.original,block}:{type:'add',block});if(ok){setSelected(block.id);
        if(!editor.original&&!block.columnId&&block.at){const r=surface.current!.getBoundingClientRect();
          if(block.at.y*zoom+pan.y>r.height-110||block.at.x*zoom+pan.x>r.width-65)setPan({x:r.width/2-(block.at.x+100)*zoom,y:r.height/2-(block.at.y+45)*zoom});}}
      return ok;}}/>}
  </section>;
}
