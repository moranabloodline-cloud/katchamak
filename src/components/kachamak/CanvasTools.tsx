'use client';
import type {DragEvent} from 'react';
import type {PaletteItem} from './useCanvasToolDrop';
import {NotebookPen, Link2, ListChecks, Spline, Columns3, Heading, Film, MapPinned, AudioLines, Pipette, Table2, MessageCircle, PenTool, Image, Pencil, Shapes} from 'lucide-react';
import type {CanvasTool} from '@/lib/kachamak/canvas-board';

export const toolsByKind={
  note:{name:'Note',icon:NotebookPen,color:'#e3b369',category:'writing'},
  heading:{name:'Heading',icon:Heading,color:'#dbbe86',category:'writing'},
  comment:{name:'Comment',icon:MessageCircle,color:'#e4b478',category:'writing'},
  link:{name:'Link',icon:Link2,color:'#70c8ce',category:'connections'},
  line:{name:'Line',icon:Spline,color:'#82b9d7',category:'connections'},
  map:{name:'Map',icon:MapPinned,color:'#7fbca2',category:'connections'},
  image:{name:'Image',icon:Image,color:'#7bc8a8',category:'media'},
  video:{name:'Video',icon:Film,color:'#b699d5',category:'media'},
  audio:{name:'Audio',icon:AudioLines,color:'#7bbadd',category:'media'},
  color:{name:'Color',icon:Pipette,color:'#e4a88b',category:'drawing'},
  sketch:{name:'Sketch',icon:PenTool,color:'#af9fd7',category:'drawing'},
  draw:{name:'Draw',icon:Pencil,color:'#de9195',category:'drawing'},
  todo:{name:'To-do',icon:ListChecks,color:'#acd597',category:'structure'},
  column:{name:'Column',icon:Columns3,color:'#b6a2d9',category:'structure'},
  table:{name:'Table',icon:Table2,color:'#9cbacb',category:'structure'},
} as const;

export function canvasToolLabel(kind:CanvasTool){
  return kind==='map'?'Insert map':toolsByKind[kind].name;
}

type Props={
  onPick:(kind:CanvasTool)=>void;
  onClassic:()=>void;
  active?:CanvasTool|null;
  disabled:boolean;
  onDrag:(event:DragEvent<HTMLButtonElement>,kind:PaletteItem)=>void;
  onDragEnd:()=>void;
};

export function CanvasTools({onPick,active,onClassic,disabled,onDrag,onDragEnd}:Props){
  const dragProps=(kind:PaletteItem)=>({draggable:!disabled,onDragStart:(event:DragEvent<HTMLButtonElement>)=>onDrag(event,kind),onDragEnd});
  return <fieldset className="cv-tools" aria-label="Canvas tools" disabled={disabled}>
    {disabled&&<p className="mb-3 text-xs text-muted-foreground">Unlock the canvas to add elements.</p>}
    <div className="cv-tools-grid">
      {(Object.keys(toolsByKind) as CanvasTool[]).map(kind=>{
        const {icon:Icon,category}=toolsByKind[kind];
        const label=canvasToolLabel(kind);
        return <button {...(kind==='line'?{}:dragProps(kind))} key={kind} type="button" title={label} aria-label={kind==='map'?label:'Add '+label} aria-pressed={active===kind} onClick={()=>onPick(kind)}>
          <Icon size={18} strokeWidth={1.7} data-tool-category={category}/><span>{label}</span>
        </button>;
      })}
      <button {...dragProps('layout')} type="button" onClick={onClassic} aria-label="Add layout block"><Shapes size={18} strokeWidth={1.7} data-tool-category="structure"/>Layout block</button>
    </div>
  </fieldset>;
}
