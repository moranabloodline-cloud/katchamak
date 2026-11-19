'use client';
import {useId,type ReactNode} from 'react';
import {Check,ChevronRight,GripVertical,MoreVertical,Plus} from 'lucide-react';
import {DndContext,closestCenter,PointerSensor,KeyboardSensor,useSensor,useSensors} from '@dnd-kit/core';
import {SortableContext,useSortable,verticalListSortingStrategy,sortableKeyboardCoordinates} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {DropdownMenu,DropdownMenuContent,DropdownMenuItem,DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {DETAIL_BLOCKS,type DetailBlockKey} from '@/lib/kachamak/detail-blocks';

export function DetailsBlocks({order,onMove,children}:{order:DetailBlockKey[];onMove:(from:DetailBlockKey,to:DetailBlockKey)=>void;children:ReactNode}){
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:5}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates}));
  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({active,over})=>{if(over&&active.id!==over.id)onMove(active.id as DetailBlockKey,over.id as DetailBlockKey);}}><SortableContext items={order} strategy={verticalListSortingStrategy}><div className="space-y-2">{children}</div></SortableContext></DndContext>;
}

export function DetailsBlock({block,hidden=false,collapsed,onToggle,onHide,headerAction,children}:{block:DetailBlockKey;hidden?:boolean;collapsed:boolean;onToggle:()=>void;onHide:()=>void;headerAction?:ReactNode;children:ReactNode}) {
  const title=DETAIL_BLOCKS.find(item=>item.key===block)!.label;
  const bodyId=useId(),{attributes,listeners,setNodeRef,setActivatorNodeRef,transform,transition,isDragging}=useSortable({id:block,disabled:hidden});
  return <section hidden={hidden} ref={setNodeRef} style={{transform:CSS.Transform.toString(transform),transition,position:'relative',zIndex:isDragging?10:undefined}} aria-label={`${title} block`} className={`group/detail-block border-b border-white/10 pb-2 ${isDragging?'bg-background shadow-lg':''}`}>
    <header className={`${collapsed?'':'mb-1.5 '}flex min-h-6 items-center gap-1`}><div className="flex min-w-0 flex-1 items-center gap-1"><h3 className={`min-w-0 ${headerAction?'':'flex-1'} text-[11px] font-medium uppercase tracking-wider text-muted-foreground`}><button type="button" aria-expanded={!collapsed} aria-controls={bodyId} onClick={onToggle} className="flex w-full items-center gap-1 rounded py-1 text-left uppercase hover:text-foreground focus-visible:outline focus-visible:outline-1"><ChevronRight aria-hidden="true" className={`h-3 w-3 shrink-0 ${collapsed?'':'rotate-90'}`}/>{title}</button></h3>{headerAction}</div><button ref={setActivatorNodeRef} type="button" {...attributes} {...listeners} aria-label={`Move ${title} block`} title="Drag to reorder · Space and arrow keys" className="touch-none rounded p-1 text-muted-foreground opacity-0 hover:bg-white/10 group-hover/detail-block:opacity-100 group-focus-within/detail-block:opacity-100 focus-visible:opacity-100 cursor-grab active:cursor-grabbing"><GripVertical className="h-3.5 w-3.5"/></button><DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={`${title} block options`} className="rounded p-1 text-muted-foreground opacity-0 hover:bg-white/10 hover:text-foreground group-hover/detail-block:opacity-100 group-focus-within/detail-block:opacity-100 data-[state=open]:opacity-100 focus-visible:opacity-100"><MoreVertical className="h-3.5 w-3.5"/></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={onHide}>Hide block</DropdownMenuItem></DropdownMenuContent></DropdownMenu></header>
    <div id={bodyId} hidden={collapsed} className="space-y-2">{children}</div>
  </section>;
}

export function AddDetailsBlock({available,hidden,onAdd}:{available:DetailBlockKey[];hidden:DetailBlockKey[];onAdd:(key:DetailBlockKey)=>void}) {
  return <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label="Add block" title="Add block" className="flex shrink-0 self-start items-center justify-center rounded p-2 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"><Plus aria-hidden="true" className="h-3.5 w-3.5"/></button></DropdownMenuTrigger><DropdownMenuContent align="start">{DETAIL_BLOCKS.filter(block=>available.includes(block.key)).map(block=><DropdownMenuItem key={block.key} disabled={!hidden.includes(block.key)} onSelect={()=>onAdd(block.key)}>{block.label}{!hidden.includes(block.key)&&<Check className="ml-auto h-3.5 w-3.5"/>}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>;
}
