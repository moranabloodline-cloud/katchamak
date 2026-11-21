'use client';

import {useEffect,useId,useLayoutEffect,useMemo,useRef,useState,type Dispatch,type SetStateAction,type ReactNode,type PointerEvent as PEvent} from 'react';
import {createPortal} from 'react-dom';
import {PanelRightOpen,Check,Columns3,Focus,Grid2X2,Grid2X2X,Hand,Layers,ListTree,LockKeyhole,Minus,MousePointer2,Pencil,Plus,Rows3,Square,Trash2,UnlockKeyhole} from 'lucide-react';
import {ContextMenu,ContextMenuContent,ContextMenuItem,ContextMenuTrigger} from '@/components/ui/context-menu';
import {worldRows,legacyRowLeft} from '@/lib/kachamak/canvas-layout';
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
import {useCanvasRowDrop} from './useCanvasRowDrop';

type Gesture={boardStart?:Point;dockable?:boolean;kind:'pan'|'move'|'row'|'ink'|'frame';base?:string[]; group?:string[];start:Point;origin:Point;id?:string;points?:Stroke};
type Props={novel:Novel;page:HomePageEntry;byId:Map<string,NoteNode>;change:(a:HomeChange)=>boolean;
  selection:string[];setSelection:Dispatch<SetStateAction<string[]>>;
  rows:HomeBlock[];rowContents:HomeBlock[];heldLines:HomeBlock[];
  renderRow:(row:HomeBlock,release:(blocks:HomeBlock[])=>void,removeRow:()=>void)=>ReactNode;layoutActions:(position:()=>Point)=>ReactNode;addRow:(at:Point)=>void;editClassic:(b:HomeBlock)=>void;renderClassic:(b:HomeBlock)=>ReactNode;addClassic:(at:Point)=>void;
  open:(t:HomeTarget)=>void;describe:(t:HomeTarget)=>string;showTree?:()=>void;toolsHost?:HTMLDivElement|null;showInspector?:()=>void;onToolPicked?:()=>void};
const inside=(p:Point,r:BoardRect)=>p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h;
function initialPan(key:string,first?:HomeBlock,zoom=1,originX=legacyRowLeft):Point{
  try{const p=JSON.parse(sessionStorage.getItem(key)??'null');if(Number.isFinite(p?.x)&&Number.isFinite(p?.y))return p;}catch{}
  return first?{x:32-(first.at?.x??originX)*zoom,y:36-(first.at?.y??0)*zoom}:{x:32,y:36};
}
export function CanvasBoard({novel,page,byId,change,open,describe,showTree,toolsHost,showInspector,onToolPicked,selection,setSelection,rows,rowContents,heldLines,renderRow,layoutActions,addRow,editClassic,renderClassic,addClassic}:Props){
  const surface=useRef<HTMLDivElement>(null),world=useRef<HTMLDivElement>(null);
  const positionKey='kachamak-board:'+novel.id+':'+page.id;
  const cameraKey=positionKey+':world';
  const showGrid=useZoomSetting(positionKey,'grid')!=='hidden';
  const storedZoom=Number(useZoomSetting(positionKey,'zoom'));
  const zoom=storedZoom>=0.02&&storedZoom<=3?storedZoom:1;
  const [pan,setPan]=useState<Point>(()=>{
    if(!rows.length){try{if(!sessionStorage.getItem(cameraKey))return initialPan(positionKey);}catch{}}
    return initialPan(cameraKey,rows[0],zoom,page.legacyRowX);
  });
  const setZoom=(level:number)=>saveZoomSetting(positionKey,'zoom',String(Math.min(3,Math.max(.02,Math.round(level*100)/100))));
  const zoomRef=useRef(zoom);zoomRef.current=zoom;
  const [heights,setHeights]=useState(new Map<string,number>());
  const [tool,setTool]=useState<'select'|'pan'|'line'|'draw'>('select');
  const [inkColor,setInkColor]=useState('#dfac74');
  const [from,setFrom]=useState<string|null>(null);
  const [framed,setFramed]=useState(false);
  const setSelected=(id:string|null)=>{setFramed(false);setSelection(id?[id]:[]);};
  const [marquee,setMarquee]=useState<BoardRect|null>(null);
  const convertSelection=useKachamak(s=>s.convertBoardSelection);
  const [editor,setEditor]=useState<{initial:HomeBlock;original?:HomeBlock;exact?:boolean}|null>(null);
  const [status,setStatus]=useState('');
  const gesture=useRef<Gesture|null>(null);
  const consumeClick=useRef(false);
  const [move,setMove]=useState<{id:string;at:Point;over?:string;group?:Set<string>}|null>(null);
  const rowDrop=useCanvasRowDrop(surface,(dx,dy)=>{
    setPan(p=>({x:p.x+dx,y:p.y+dy}));
    setMove(m=>m&&({...m,at:{x:m.at.x-dx/zoomRef.current,y:m.at.y-dy/zoomRef.current}}));
  });
  const [menu,setMenu]=useState<{block:HomeBlock;column?:number}|{at:Point}|null>(null);
  const [movingRow,setMovingRow]=useState<{id:string;at:Point}|null>(null);
  const [cellRects,setCellRects]=useState(new Map<string,BoardRect & {rowId:string}>());
  const rowWidth=page.width==='reading'?736:1160;
  const rowRects=useMemo(()=>worldRows(rows,rowWidth,heights,page.legacyRowX),[rows,rowWidth,heights,page.legacyRowX]);
  const previousRows=useRef(rows.length);
  useLayoutEffect(()=>{
    const el=surface.current,added=rows.length>previousRows.current;
    previousRows.current=rows.length;
    const last=rows.at(-1);
    const bounds=added&&last&&!last.manualPosition&&rowRects.get(last.id);
    if(el&&bounds && (bounds.y*zoom+pan.y>el.clientHeight-110 || bounds.x*zoom+pan.x>el.clientWidth-90))
      setPan({x:24-bounds.x*zoom,y:32-bounds.y*zoom});
  },[rows,rowRects,zoom,pan]);
  const [liveInk,setLiveInk]=useState<Stroke>([]);
  const lastPointer=useRef<Point|null>(null),previousZoom=useRef(zoom);
  const rects=useMemo(()=>boardRects(page.blocks,heights),[page.blocks,heights]);
  const blocks=useMemo(()=>new Map(page.blocks.map(b=>[b.id,b])),[page.blocks]);
  function toggleFreeCard(id:string){
    setSelection(previous=>{
      const active=previous.filter(key=>blocks.has(key));
      return active.includes(id)?active.filter(key=>key!==id):[...active,id];
    });
  }
  const items=useMemo(()=>selectionRoots(page.blocks,new Set(selection)),[page.blocks,selection]);
  const selected=items.length===1?items[0].id:selection.length===1?selection[0]:undefined;
  const focused=selected?blocks.get(selected)??heldLines.find(b=>b.id===selected):undefined;
  const edgePrefix=useId();
  const columnEdges=useMemo(()=>{
    const inside=new Map<string,string[]>();
    for(const b of [...page.blocks,...heldLines]){
      if(!b.edge)continue;
      for(const col of new Set([blocks.get(b.edge.from)?.columnId,blocks.get(b.edge.to)?.columnId])){
        if(!col)continue;
        const edges=inside.get(col)??[];edges.push(b.id);inside.set(col,edges);
      }
    }
    return inside;
  },[page.blocks,heldLines,blocks]);
  const layers=useMemo(()=>boardLayers(page.blocks),[page.blocks]);
  const highlighted=useMemo(()=>{
    if(!marquee)return new Set(selection);
    return new Set([...(gesture.current?.base??[]),...framedItems(page.blocks,rects,marquee)]);
  },[selection,marquee,rects,page.blocks]);
  const fixed=(b:HomeBlock)=>!!(b.layout==='column'||b.positionLocked || b.columnId&&blocks.get(b.columnId)?.positionLocked);
  const batch=(command:SelectionCommand)=>save({type:'boardSelection',ids:items.map(b=>b.id),command,heights:[...heights]});
  const save=(action:HomeChange)=>{const ok=change(action);if(!ok)setStatus('The board changed. Select the item again.');return ok;};
  useEffect(()=>{try{sessionStorage.setItem(cameraKey,JSON.stringify(pan));}catch{}},[pan,cameraKey]);
  useEffect(()=>{if(page.locked){rowDrop.clear();setEditor(null);setFrom(null);setTool('select');setMove(null);setMovingRow(null);setSelected(null);setMarquee(null);setLiveInk([]);gesture.current=null;}},[page.locked]);
  useLayoutEffect(()=>{
    if(previousZoom.current===zoom)return;
    const s=surface.current;if(!s)return;
    const ratio=zoom/previousZoom.current;previousZoom.current=zoom;
    const pivot=lastPointer.current??{x:s.clientWidth/2,y:s.clientHeight/2};
    setPan(p=>({x:pivot.x-(pivot.x-p.x)*ratio,y:pivot.y-(pivot.y-p.y)*ratio}));
  },[zoom]);
  useLayoutEffect(()=>{
    const el=surface.current,first=rows[0];
    if(!el||!first||storedZoom)return;
    try{if(sessionStorage.getItem(cameraKey))return;}catch{}
    const level=Math.min(1,Math.max(.02,Math.floor((el.clientWidth-48)/rowWidth*100)/100));
    if(level<1){
      previousZoom.current=level;setZoom(level);
      setPan({x:24-(first.at?.x??page.legacyRowX??legacyRowLeft)*level,y:32-(first.at?.y??0)*level});
    }
  },[cameraKey]);
  useLayoutEffect(()=>{
    if(!world.current || typeof ResizeObserver==='undefined')return;
    const observer=new ResizeObserver(entries=>setHeights(prev=>{
      let next=prev;
      for(const {target} of entries){
        const el=target as HTMLElement,id=el.dataset.boardCard??el.dataset.worldRow!,h=el.offsetHeight;
        if(h && prev.get(id)!==h){if(next===prev)next=new Map(prev);next.set(id,h);}
      }
      return next;
    }));
    world.current.querySelectorAll('[data-board-card]:not([data-board-column]),[data-world-row]').forEach(el=>observer.observe(el));
    return ()=>observer.disconnect();
  },[page.blocks,rows]);
  useLayoutEffect(()=>{
    const container=world.current;
    if(!container||!heldLines.length){setCellRects(prev=>prev.size?new Map():prev);return;}
    const endpoints=new Set(heldLines.flatMap(b=>[b.edge!.from,b.edge!.to]));
    const cards=[...container.querySelectorAll<HTMLElement>('[data-home-cell] [data-home-block]')];
    function measure(){
      const next=new Map<string,BoardRect & {rowId:string}>();
      for(const card of cards){
        const id=card.dataset.homeBlock!;if(!endpoints.has(id))continue;
        const row=card.closest<HTMLElement>('[data-world-row]')!;
        const origin=row.getBoundingClientRect(),r=card.getBoundingClientRect(),scale=zoomRef.current;
        next.set(id,{rowId:row.dataset.worldRow!,x:(r.x-origin.x)/scale,y:(r.y-origin.y)/scale,w:r.width/scale,h:r.height/scale});
      }
      setCellRects(next);
    }
    measure();
    const observer=new ResizeObserver(measure);
    cards.forEach(card=>observer.observe(card));
    return ()=>observer.disconnect();
  },[rowRects,rowContents,heldLines]);
  useEffect(()=>{
    const el=surface.current;if(!el)return;
    const reset=registerZoomReset(el,()=>{lastPointer.current=null;setZoom(1);});
    const wheel=(e:WheelEvent)=>{
      e.preventDefault();e.stopPropagation();
      const factor=e.deltaMode===1?16:e.deltaMode===2?el.clientHeight:1;
      if(e.ctrlKey){
        lastPointer.current=local(e.clientX,e.clientY);
        setZoom(zoomRef.current*Math.exp(-Math.max(-400,Math.min(400,e.deltaY*factor))*.002));
      }else setPan(p=>({x:p.x-(e.deltaX+(e.shiftKey?e.deltaY:0))*factor,y:p.y-(e.shiftKey?0:e.deltaY)*factor}));
    };
    el.addEventListener('wheel',wheel,{passive:false});
    return ()=>{reset();el.removeEventListener('wheel',wheel);};
  },[positionKey]);
  const local=(x:number,y:number)=>{
    const el=surface.current!,r=el.getBoundingClientRect();
    return {x:(x-r.left)*el.clientWidth/r.width,y:(y-r.top)*el.clientHeight/r.height};
  };
  const boardPoint=(p:Point)=>({x:(p.x-pan.x)/zoom,y:(p.y-pan.y)/zoom});
  function visualRect(id:string){
    const cell=cellRects.get(id);
    if(cell){
      const origin=movingRow?.id===cell.rowId?movingRow.at:rowRects.get(cell.rowId);
      if(origin)return {...cell,x:origin.x+cell.x,y:origin.y+cell.y};
    }
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
  function nextPosition(kind:CanvasTool,width=kind==='column'?COLUMN_WIDTH:CARD_WIDTH,height=216):Point{
    const el=surface.current!,start=boardPoint({x:28,y:28});
    const step=COLUMN_WIDTH+24;
    const lanes=Math.max(1,1+Math.floor((el.clientWidth/zoom-56-width)/step));
    let best:Point|null=null;
    const occupied=[...rects.values(),...rowRects.values()].sort((a,b)=>a.y-b.y);
    for(let lane=0;lane<lanes;lane++){
      const x=Math.round(start.x+lane*step);
      let y=Math.round(start.y);
      // Leave room below each new item for its real text, image or table height.
      for(const r of occupied)if(x+width>r.x-14 && x<r.x+r.w+14 && y<r.y+r.h+20 && y+height>r.y-14)y=r.y+r.h+20;
      if(!best || y<best.y)best={x,y};
    }
    return best!;
  }
  function releaseCards(cards:HomeBlock[]){
    const first=cards[0];
    if(!first?.cell)return;
    const ids=cards.map(b=>b.id);
    const width=cards.reduce((total,b)=>total+(b.extent?.w??CARD_WIDTH)+24,-24);
    let height=140;
    for(const b of cards){
      const el=world.current?.querySelector<HTMLElement>('[data-home-block="'+CSS.escape(b.id)+'"]');
      if(el)height=Math.max(height,44+el.offsetHeight*Math.max(1,(b.extent?.w??CARD_WIDTH)/Math.max(1,el.offsetWidth)));
    }
    const at=nextPosition('note',width,height);
    if(!save({type:'releaseCards',ids,cell:first.cell,at}))return;
    setTool('select');setFrom(null);setFramed(false);setSelection(ids);
    requestAnimationFrame(()=>{
      const s=surface.current;if(!s)return;
      if(at.y*zoom+pan.y>s.clientHeight-80||at.x*zoom+pan.x>s.clientWidth-80)
        setPan({x:s.clientWidth/2-(at.x+CARD_WIDTH/2)*zoom,y:s.clientHeight/2-(at.y+45)*zoom});
      world.current?.querySelector<HTMLElement>('[data-board-card="'+CSS.escape(first.id)+'"]')?.focus({preventScroll:true});
    });
  }
  function pick(kind:CanvasTool,at?:Point){
    if(page.locked)return;
    setFrom(null);setStatus('');
    if(kind==='line'||kind==='draw'){setTool(current=>current===kind?'select':kind);return;}
    setTool('select');
    const initial={...newCanvasBlock(kind),at:at??nextPosition(kind)};
    if(!at&&kind!=='column'&&focused?.layout==='column')Object.assign(initial,{columnId:focused.id});
    setEditor({initial,exact:!!at});
  }
  function finishLink(id:string){
    if(!from){setFrom(id);return;}
    if(from===id){setFrom(null);return;}
    const line:HomeBlock={...newCanvasBlock('line'),edge:{from,to:id}};
    if(save({type:'add',block:line})){setSelected(line.id);setTool('select');setFrom(null);}
  }
  function remove(block=focused,column?:number){
    if(!block||page.locked)return;
    const container=block.layout==='row'||block.layout==='column';
    if(!window.confirm(container?'Remove this '+(column!==undefined||block.layout==='column'?'column':'row')+'? Its cards will stay on the canvas.':'Delete this item and its connections?'))return;
    const positions=Object.fromEntries([...rects].map(([id,r])=>[id,{x:r.x,y:r.y}]));
    if(block.layout==='row'){
      const origin=world.current!.getBoundingClientRect();
      world.current!.querySelectorAll<HTMLElement>('[data-home-cell] [data-home-block]').forEach(el=>{
        const r=el.getBoundingClientRect();positions[el.dataset.homeBlock!]={x:(r.x-origin.x)/zoom,y:(r.y-origin.y)/zoom};
      });
    }
    if(block.layout==='row'&&(rows.length>1||column!==undefined&&block.columns!>1)){
      const children=rowContents.filter(b=>b.cell?.rowId===block.id&&(column===undefined||b.cell.column===column)).sort((a,b)=>a.cell!.column-b.cell!.column);
      const start=nextPosition('note',children.reduce((n,b)=>n+(b.extent?.w??CARD_WIDTH)+24,0));
      let x=start.x;
      for(const child of children){positions[child.id]={x,y:start.y};x+=(child.extent?.w??CARD_WIDTH)+24;}
    }
    if(save(block.layout==='row'||block.cell?{type:'remove',original:block,positions,column}:{type:'removeBoardItem',original:block,positions}))setSelected(null);
  }
  function moveRow(id:string,at:Point){
    return save({type:'moveRow',id,at,heights:[...heights]});
  }
  function centerRow(id:string){
    const el=surface.current,r=rowRects.get(id);
    if(!el||!r)return;
    const middle=boardPoint({x:el.clientWidth/2,y:el.clientHeight/2});
    moveRow(id,{x:middle.x-r.w/2,y:middle.y-r.h/2});
  }
  function fit(){
    const s=surface.current,rs=[...rects.values(),...rowRects.values()];if(!s||!rs.length)return;
    const left=Math.min(...rs.map(r=>r.x)),right=Math.max(...rs.map(r=>r.x+r.w)),top=Math.min(...rs.map(r=>r.y)),bottom=Math.max(...rs.map(r=>r.y+r.h));
    const level=Math.min(2,Math.max(.02,Math.floor(100*Math.min((s.clientWidth-48)/(right-left),(s.clientHeight-48)/(bottom-top)))/100));
    previousZoom.current=level;setZoom(level);setPan({x:(s.clientWidth-(right-left)*level)/2-left*level,y:(s.clientHeight-(bottom-top)*level)/2-top*level});
  }
  function startGesture(e:PEvent<HTMLDivElement>){
    if(!e.isPrimary||e.button!==0&&e.button!==1||!surface.current?.contains(e.target as Node))return;
    const target=e.target as Element,card=target.closest<HTMLElement>('[data-board-card]'),id=card?.dataset.boardCard;
    const start=local(e.clientX,e.clientY),p=boardPoint(start);
    consumeClick.current=false;
    if(e.button===1 || tool==='pan'){gesture.current={kind:'pan',start,origin:pan};}
    else if(!page.locked&&tool==='line'){
      const endpoint=id??target.closest<HTMLElement>('[data-home-cell] [data-home-block]')?.dataset.homeBlock;
      if(endpoint){consumeClick.current=true;finishLink(endpoint);e.preventDefault();}
      return;
    }
    else if(!page.locked&&tool==='select'&&target.closest('[data-row-handle]')){
      const id=target.closest<HTMLElement>('[data-row-handle]')!.dataset.rowHandle!;
      gesture.current={kind:'row',id,start,boardStart:p,origin:rowRects.get(id)!};
      setSelected(null);
    }
    else if(target.closest('[data-world-row]'))return;
    else if(!page.locked&&tool==='draw'){gesture.current={kind:'ink',start,origin:p,points:[[p.x,p.y]]};setLiveInk([[p.x,p.y]]);}
    else if(target.closest('button,a,input,audio,iframe,video,select,[data-board-edge],[data-board-edge-copy]'))return;
    else if(id&&!page.locked){
      if(e.shiftKey||e.ctrlKey||e.metaKey){
        toggleFreeCard(id);
        e.preventDefault();return;
      }
      const member=items.find(b=>b.id===id || b.id===blocks.get(id)?.columnId);
      const group=items.length>1 && member?items:undefined;
      const anchor=group?member!.id:id;
      if(!group)setSelected(id);
      if((group??[blocks.get(id)!]).some(fixed)){e.preventDefault();return;}
      const dockable=group?group.every(b=>b.layout!=='column'):blocks.get(id)?.layout!=='column';
      gesture.current={kind:'move',start,boardStart:p,origin:rects.get(anchor)!,id:anchor,group:group?.map(b=>b.id),dockable};
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
    if(g.kind==='row'&&(movingRow||Math.abs(dx)+Math.abs(dy)>3))
      setMovingRow({id:g.id!,at:{x:g.origin.x+p.x-g.boardStart!.x,y:g.origin.y+p.y-g.boardStart!.y}});
    if(g.kind==='pan')setPan({x:g.origin.x+dx,y:g.origin.y+dy});
    if(g.kind==='ink'){g.points!.push([p.x,p.y]);setLiveInk([...g.points!]);}
    if(g.kind==='move'&&(Math.abs(dx)+Math.abs(dy)>3 || move)){
      if(rows.length&&g.dockable){
        const caption=g.group?g.group.length+' cards':blocks.get(g.id!)?.title||'Move card here';
        rowDrop.track(e.clientX,e.clientY,caption);
      }
      setMove({id:g.id!,at:{x:g.origin.x+p.x-g.boardStart!.x,y:g.origin.y+p.y-g.boardStart!.y},over:g.group?undefined:columnAt(p,g.id!),group:g.group?new Set(g.group):undefined});
    }
  }
  function endGesture(e:PEvent<HTMLDivElement>){
    const g=gesture.current;if(!g||!e.isPrimary)return;
    const point=local(e.clientX,e.clientY),p=boardPoint(point);
    const dragged=Math.abs(point.x-g.start.x)+Math.abs(point.y-g.start.y)>3;
    if(g.kind==='row'&&dragged && surface.current?.contains(document.elementFromPoint(e.clientX,e.clientY)))
      moveRow(g.id!,{x:g.origin.x+p.x-g.boardStart!.x,y:g.origin.y+p.y-g.boardStart!.y});
    if(g.kind==='frame'){
      setFramed(dragged);
      const hits=dragged?framedItems(page.blocks,rects,frameBetween(g.origin,p)):[];
      setSelection(selectionRoots(page.blocks,new Set([...(g.base??[]),...hits])).map(b=>b.id));
    }
    if(g.kind==='move'&&(move||dragged)){
      const cell=g.dockable&&rowDrop.target(e.clientX,e.clientY);
      if(cell){
        const ids=g.group??[g.id!];
        if(save({type:'dockCards',ids,cell,heights:[...heights]})){setFramed(false);setSelection(ids);}
        cancelGesture();return;
      }
      // A drop outside the viewport must not move the cards.
      const hovered=document.elementFromPoint(e.clientX,e.clientY);
      if(!hovered||!surface.current?.contains(hovered)){cancelGesture();return;}
    }
    if(g.kind==='move'&&(move||dragged)&&g.group){
      save({type:'boardSelection',ids:g.group,heights:[...heights],command:{kind:'translate',delta:{x:p.x-g.boardStart!.x,y:p.y-g.boardStart!.y}}});
    }else if(g.kind==='move'&&(move||dragged)){
      const col=columnAt(p,g.id!),before=col?page.blocks.find(b=>b.columnId===col&&b.id!==g.id&&p.y<rects.get(b.id)!.y+rects.get(b.id)!.h/2)?.id:undefined;
      save({type:'boardMove',id:g.id!,at:{x:Math.round(g.origin.x+p.x-g.boardStart!.x),y:Math.round(g.origin.y+p.y-g.boardStart!.y)},columnId:col,before});
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
  function cancelGesture(){rowDrop.clear();gesture.current=null;setMove(null);setMovingRow(null);setLiveInk([]);setMarquee(null);}
  const editBlock=(b:HomeBlock)=>{
    if(!(b.layout in toolsByKind) || b.layout==='image'&&(b.imageFrame||b.imageCutout))editClassic(b);
    else setEditor({initial:b,original:b});
  };
  const editFocused=()=>{if(focused&&focused.layout!=='line')editBlock(focused);};
  const resetTool=()=>{setTool('select');setFrom(null);cancelGesture();};
  const btn=(label:string,Icon:typeof Plus,fn:()=>void,pressed?:boolean)=><button type="button" title={label} aria-label={label} aria-pressed={pressed} className="cv-icon" onClick={fn}><Icon size={16}/></button>;
  return <section className="cv-board-shell flex-1" aria-label="Canvas board" aria-description={page.title}>
    <div className="cv-board-main"><header className="cv-board-head"><button type="button" className="md:hidden" aria-label="Show canvas tree" onClick={showTree}><ListTree size={16}/></button><Layers size={16}/><h2>{page.title}</h2>
      {focused&&!page.locked&&tool==='select'&&<div className="cv-selection-tools">{focused.positionLocked&&btn('Unlock position',UnlockKeyhole,()=>batch({kind:'lock',locked:false}))}{focused.layout!=='line'&&btn('Edit selected item',Pencil,editFocused)}{btn('Remove selected item',Trash2,remove)}</div>}
      {!page.locked&&layoutActions(()=>nextPosition('note',rowWidth))}
      {btn(page.locked?'Unlock canvas':'Lock canvas',page.locked?LockKeyhole:UnlockKeyhole,()=>save({type:'lock',locked:!page.locked}))}
      <button type="button" className="lg:hidden" aria-label="Show canvas inspector" title="Show canvas inspector" onClick={showInspector}><PanelRightOpen size={16}/></button></header>
    <div className="cv-viewport">
    <ContextMenu><ContextMenuTrigger asChild onContextMenu={e=>{
      const hit=(e.target as Element).closest<HTMLElement>('[data-board-edge-copy],[data-board-edge],[data-board-card],[data-home-block],[data-home-cell]');
      const id=hit?.dataset.boardEdgeCopy??hit?.dataset.boardEdge??hit?.dataset.boardCard??hit?.dataset.homeBlock??hit?.dataset.homeCell;
      const block=id&&(blocks.get(id)??rowContents.find(b=>b.id===id)??heldLines.find(b=>b.id===id));
      if(page.locked||!surface.current?.contains(e.target as Node)){e.preventDefault();return;}
      if(block)setMenu({block,column:hit?.hasAttribute('data-home-cell')?Number(hit.dataset.column):undefined});
      else setMenu({at:boardPoint(local(e.clientX,e.clientY))});
    }}>
    <div ref={surface} tabIndex={0} aria-label="Board surface" className={'cv-surface cv-mode-'+tool} style={{backgroundImage:showGrid?undefined:'none',backgroundSize:24*zoom+'px '+24*zoom+'px',backgroundPosition:pan.x+'px '+pan.y+'px'}}
      onClickCapture={e=>{if(consumeClick.current){consumeClick.current=false;e.stopPropagation();e.preventDefault();}}}
      onPointerDown={startGesture} onPointerMove={track} onPointerUp={endGesture} onPointerCancel={cancelGesture} onLostPointerCapture={cancelGesture}
      onKeyDown={e=>{if(e.key==='Escape'){resetTool();setSelected(null);}if(e.target===surface.current&&e.key==='Delete')remove();
        const handle=(e.target as HTMLElement).closest<HTMLElement>('[data-row-handle]');
        if(handle&&!page.locked&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
          e.preventDefault();const id=handle.dataset.rowHandle!,r=rowRects.get(id)!;
          moveRow(id,{x:r.x+(e.key==='ArrowRight'?16:e.key==='ArrowLeft'?-16:0),y:r.y+(e.key==='ArrowDown'?16:e.key==='ArrowUp'?-16:0)});
        }}}>
      <div ref={world} className="cv-world" style={{transform:'translate('+pan.x+'px,'+pan.y+'px) scale('+zoom+')'}}>
        {rows.map(row=>{
          const r=rowRects.get(row.id)!;
          return <div key={row.id} data-world-row={row.id} className="cv-world-row" style={{left:movingRow?.id===row.id?movingRow.at.x:r.x,top:movingRow?.id===row.id?movingRow.at.y:r.y,width:r.w}}>{renderRow(row,releaseCards,()=>remove(row))}</div>;
        })}
        <svg className="cv-lines" aria-label="Connections" style={{zIndex:1}}>{[...page.blocks.filter(b=>b.layout==='line'),...heldLines].map(b=>{
          const a=visualRect(b.edge!.from),z=visualRect(b.edge!.to);
          if(!a||!z)return null;
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
              if(e.key===' '&&(e.ctrlKey||e.metaKey||e.shiftKey)){e.preventDefault();toggleFreeCard(b.id);return;}
              if(e.key==='Enter'){if(tool==='line')finishLink(b.id);else editBlock(b);}
              if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
                e.preventDefault();const delta={x:e.key==='ArrowRight'?16:e.key==='ArrowLeft'?-16:0,y:e.key==='ArrowDown'?16:e.key==='ArrowUp'?-16:0};
                if(items.length>1&&highlighted.has(b.id)){if(!items.some(fixed))batch({kind:'translate',delta});}
                else if(!fixed(b)&&!b.columnId)save({type:'boardMove',id:b.id,at:{x:r.x+delta.x,y:r.y+delta.y}});
              }}}
            onFocus={e=>{if(!page.locked&&e.target===e.currentTarget&&e.currentTarget.matches(':focus-visible')&&!highlighted.has(b.id))setSelected(b.id);}}
            className={'cv-card'+(column?' cv-column':'')+(looseInk?' cv-free-ink':'')+(tool==='line'?' cv-connectable':'')}
            data-dragging={!!move&&(move.id===b.id || move.group?.has(b.id) || move.id===b.columnId || move.group?.has(b.columnId??''))||undefined}
            data-selected={!page.locked&&(highlighted.has(b.id)||from===b.id)||undefined} data-drop={move?.over===b.id||undefined}
            style={{left:r.x,top:r.y,width:r.w,height:column?r.h:undefined,zIndex:move?.id===b.id&&!column&&!move.group?layers.size*2+3:(layers.get(b.columnId??b.id)??1)+(b.columnId?1:0),'--cv-accent':b.color??color} as React.CSSProperties}>
            {column&&columnEdges.has(b.id)&&<svg className="cv-column-lines" aria-hidden="true">
              <g transform={'translate('+(-r.x)+' '+(-r.y)+')'}>{columnEdges.get(b.id)!.map(id=>
                <use key={id} href={'#'+edgePrefix+id} data-board-edge-copy={id} onClick={()=>{if(!page.locked)setSelected(id);}}/>)}</g>
            </svg>}
            {!looseInk&&<div className="cv-card-cap"><Icon size={13}/>{column?<strong>{b.title||'Column'}</strong>:<span>{name}</span>}{(column||b.positionLocked)&&<LockKeyhole size={11} aria-label="Position locked"/>}{column&&<small>{page.blocks.filter(x=>x.columnId===b.id).length}</small>}
              {!page.locked&&<button aria-label={'Edit '+(b.title||name)} type="button" onClick={()=>editBlock(b)}><Pencil size={13}/></button>}</div>}
            {column?(!page.locked&&<button type="button" className="cv-column-add" aria-label={'Add note to '+b.title} onClick={()=>{setTool('select');setEditor({initial:{...newCanvasBlock('note'),at:{x:r.x+14,y:r.y+56},columnId:b.id}});}}><Plus size={13}/> Note</button>):
            !(kind in toolsByKind)?renderClassic(b):<CanvasItemFace block={b} novel={novel} locked={page.locked} source={b.target?.kind==='note'?byId.get(b.target.id):undefined} open={open} describe={describe} toggle={(index,done)=>save({type:'task',id:b.id,index,done})}/>}
          </article>;
        })}
        {liveInk.length>0&&<svg className="cv-live-ink"><InkPaths strokes={[liveInk]} color={inkColor}/></svg>}
      </div>
      {marquee&&<div className="cv-marquee" aria-hidden="true" style={{left:pan.x+marquee.x*zoom,top:pan.y+marquee.y*zoom,width:marquee.w*zoom,height:marquee.h*zoom}}/>}
      {!rows.length&&!page.blocks.length&&!page.locked&&tool==='select'&&<button type="button" className="cv-first" onClick={()=>pick('note')}><Plus size={18}/>Add your first note</button>}
    </div></ContextMenuTrigger>{menu&&<ContextMenuContent>
      {'at' in menu?<>
        <ContextMenuItem onSelect={()=>addRow(menu.at)}><Rows3 size={14}/>Add row here</ContextMenuItem>
        <ContextMenuItem onSelect={()=>pick('column',menu.at)}><Columns3 size={14}/>Add column here</ContextMenuItem>
        <ContextMenuItem onSelect={()=>addClassic(menu.at)}><Square size={14}/>Add card here</ContextMenuItem>
      </>:<>
        {menu.block.layout==='row'&&menu.column===undefined&&<ContextMenuItem onSelect={()=>centerRow(menu.block.id)}><Focus size={14}/>Center row in view</ContextMenuItem>}
        <ContextMenuItem onSelect={()=>remove(menu.block,menu.column)}><Trash2 size={14}/>Delete {menu.column!==undefined?'column':menu.block.layout==='line'?'connection':menu.block.layout}</ContextMenuItem>
      </>}
    </ContextMenuContent>}</ContextMenu>
    <div className="cv-board-dock">
      {btn('Select items',MousePointer2,resetTool,tool==='select')}{btn('Pan board',Hand,()=>{setFrom(null);setTool('pan');},tool==='pan')}
      <span className="cv-dock-divider"/>{btn('Zoom out',Minus,()=>{lastPointer.current=null;setZoom(zoom/1.2);})}
      <button className="cv-zoom-level" title="Reset zoom" onClick={()=>{lastPointer.current=null;setZoom(1);}}>{Math.round(zoom*100)}%</button>
      {btn('Zoom in',Plus,()=>{lastPointer.current=null;setZoom(zoom*1.2);})}{btn('Fit board',Focus,fit)}
      {btn(showGrid?'Hide grid':'Show grid',showGrid?Grid2X2:Grid2X2X,()=>saveZoomSetting(positionKey,'grid',showGrid?'hidden':'visible'))}
    </div>
    {(tool==='draw'||tool==='line'||status)&&<div className="cv-mode-message" role="status">{status||(tool==='draw'?'Draw on the board':from?'Choose the second item':'Choose the first item')}{tool==='draw'&&<input aria-label="Drawing color" type="color" value={inkColor} onChange={e=>setInkColor(e.target.value)}/>}<button aria-label="Finish tool" onClick={()=>{resetTool();setStatus('');}}><Check size={15}/></button></div>}
    </div></div>
    {toolsHost && createPortal(<>
      {!page.locked&&(items.length>1 || framed&&items.length===1)&&tool==='select'&&<CanvasSelectionTools items={items} fixed={items.some(fixed)} clear={()=>setSelected(null)} run={batch}
      convert={title=>convertSelection(novel.id,page.id,items.map(b=>b.id),title,[...heights])}/>}
      <CanvasTools disabled={page.locked} onPick={kind=>{pick(kind);onToolPicked?.();}} onClassic={()=>{addClassic(nextPosition('note'));onToolPicked?.();}} active={tool==='draw'||tool==='line'?tool:null}/>
    </>,toolsHost)}
    {editor&&!page.locked&&<CanvasItemEditor novel={novel} initial={editor.initial} creating={!editor.original} onClose={()=>setEditor(null)} onSave={block=>{
      const ok=save(editor.original?{type:'edit',original:editor.original,block}:{type:'add',block});if(ok){setSelected(block.id);
        if(!editor.original&&!editor.exact&&!block.columnId&&block.at){const r=surface.current!.getBoundingClientRect();
          if(block.at.y*zoom+pan.y>r.height-110||block.at.x*zoom+pan.x>r.width-65)setPan({x:r.width/2-(block.at.x+100)*zoom,y:r.height/2-(block.at.y+45)*zoom});}}
      return ok;}}/>}
  </section>;
}
