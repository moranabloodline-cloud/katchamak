'use client';
import type {DragEvent} from 'react';
import type {PaletteItem} from './useCanvasToolDrop';
import {NotebookPen, Link2, ListChecks, Spline, Columns3, Heading, Film, MapPinned, AudioLines, Pipette, Table2, MessageCircle, PenTool, Image, Pencil, Shapes} from 'lucide-react';
import {CANVAS_TOOLS,type CanvasTool} from '@/lib/kachamak/canvas-board';

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
      {CANVAS_TOOLS.map(kind=>{
        const {icon:Icon,color}=toolsByKind[kind];
        const label=canvasToolLabel(kind);
        return <button {...(kind==='line'?{}:dragProps(kind))} key={kind} type="button" title={label} aria-label={kind==='map'?label:'Add '+label} aria-pressed={active===kind} onClick={()=>onPick(kind)}>
          <Icon size={18} strokeWidth={1.7} style={{color}}/><span>{label}</span>
        </button>;
      })}
      <button {...dragProps('layout')} type="button" onClick={onClassic} aria-label="Add layout block"><Shapes size={18}/>Layout block</button>
    </div>
  </fieldset>;
}
