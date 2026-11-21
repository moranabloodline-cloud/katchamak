'use client';
import {useRef,useState} from 'react';
import {NotebookPen, Link2, ListChecks, Spline, Columns3, Heading, Film, MapPinned, AudioLines, Pipette, Table2, MessageCircle, PenTool, Image, Pencil, ChevronDown, PanelRightClose, Shapes} from 'lucide-react';
import {CANVAS_TOOLS,type CanvasTool} from '@/lib/kachamak/canvas-board';

import {CtrlZoom,usePanelZoom} from './CtrlZoom';

export const toolsByKind={
  note:{name:'Note',icon:NotebookPen,color:'#e3b369'}, link:{name:'Link',icon:Link2,color:'#70c8ce'},
  todo:{name:'To-do',icon:ListChecks,color:'#acd597'}, line:{name:'Line',icon:Spline,color:'#82b9d7'},
  column:{name:'Column',icon:Columns3,color:'#b6a2d9'}, heading:{name:'Heading',icon:Heading,color:'#dbbe86'},
  image:{name:'Image',icon:Image,color:'#7bc8a8'}, video:{name:'Video',icon:Film,color:'#b699d5'},
  map:{name:'Map',icon:MapPinned,color:'#7fbca2'}, audio:{name:'Audio',icon:AudioLines,color:'#7bbadd'},
  color:{name:'Color',icon:Pipette,color:'#e4a88b'}, table:{name:'Table',icon:Table2,color:'#9cbacb'},
  comment:{name:'Comment',icon:MessageCircle,color:'#e4b478'}, sketch:{name:'Sketch',icon:PenTool,color:'#af9fd7'},
  draw:{name:'Draw',icon:Pencil,color:'#de9195'}
} as const;

export function CanvasTools({onPick,active}:{onPick:(kind:CanvasTool)=>void;active?:CanvasTool|null}){
  const [collapsed,setCollapsed]=useState(false),[more,setMore]=useState(false);
  const panel=useRef<HTMLElement>(null),zoom=usePanelZoom('right');
  if(collapsed)return <button type="button" className="cv-tools-toggle" aria-label="Show canvas tools" title="Show canvas tools" onClick={()=>setCollapsed(false)}><Shapes size={18}/></button>;
  const button=(kind:CanvasTool)=>{
    const {icon:Icon,name,color}=toolsByKind[kind];
    return <button key={kind} type="button" title={name} aria-label={'Add '+name} aria-pressed={active===kind} onClick={()=>onPick(kind)}><Icon size={18} strokeWidth={1.7} style={{color}}/><span>{name}</span></button>;
  };
  return <aside ref={panel} className="cv-tools" aria-label="Canvas tools"><CtrlZoom panel="right" targetRef={panel}/><div style={{zoom}}>
    <div className="cv-tools-head"><strong>Tools</strong><button type="button" aria-label="Hide canvas tools" title="Hide tools" onClick={()=>setCollapsed(true)}><PanelRightClose size={15}/></button></div>
    <div className="cv-tools-grid">{CANVAS_TOOLS.slice(0,7).map(button)}</div>
    <button type="button" aria-expanded={more} className="cv-more" onClick={()=>setMore(!more)}>More tools<ChevronDown size={14} style={{transform:more?'rotate(180deg)':undefined}}/></button>
    {more&&<div className="cv-tools-grid">{CANVAS_TOOLS.slice(7).map(button)}</div>}
  </div></aside>;
}
