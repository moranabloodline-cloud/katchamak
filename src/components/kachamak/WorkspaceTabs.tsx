'use client';
import { useEffect, useRef, useState } from 'react';
import { Plus, FolderOpen, EyeOff } from 'lucide-react';
import {PageFormatMenu} from './PageFormatMenu';
import { useKachamak } from '@/lib/kachamak/store';
import { type Novel, type TabKey } from '@/lib/kachamak/types';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import {ContextMenu,ContextMenuTrigger,ContextMenuContent,ContextMenuItem} from '@/components/ui/context-menu';
import {AlertDialog,AlertDialogContent,AlertDialogHeader,AlertDialogTitle,AlertDialogDescription,AlertDialogFooter,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {DndContext,closestCenter,PointerSensor,KeyboardSensor,useSensors,useSensor,type Modifier} from '@dnd-kit/core';
import {SortableContext,useSortable,horizontalListSortingStrategy,sortableKeyboardCoordinates} from '@dnd-kit/sortable';
import {CSS} from '@dnd-kit/utilities';
import {findNode} from '@/lib/kachamak/utils';
import {workspaceTabs,visibleTabLocation} from '@/lib/kachamak/workspace-tabs';
import {cloneableWorkspaceTabs} from '@/lib/kachamak/clone-workspace-tab';
import {CloneWorkspaceTabDialog} from './CloneWorkspaceTabDialog';

const horizontalOnly:Modifier=({transform})=>({...transform,y:0});
function SortableWorkspaceTab({tab,active,onOpen,onHide,onDelete,onClone}:{tab:{key:TabKey;label:string};active:boolean;onOpen:()=>void;onHide:()=>void;onDelete:()=>void;onClone?:()=>void}) {
  const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:tab.key});
  const button=<button ref={setNodeRef} {...attributes} {...listeners} type="button" onClick={onOpen} aria-current={active?'page':undefined} title={tab.label} style={{transform:CSS.Transform.toString(transform),transition,position:'relative',zIndex:isDragging?10:undefined}} className={`max-w-44 shrink-0 cursor-grab touch-none select-none truncate whitespace-nowrap rounded-md border px-2.5 py-1 text-sm active:cursor-grabbing ${active?'border-[#ad7e2e]/70 bg-[#3a2c18] text-[#fbe4a6]':'border-transparent text-muted-foreground hover:text-white'} ${isDragging?'bg-background shadow-lg ring-1 ring-amber-400/40':''}`}>{tab.label}</button>;
  const canDelete = !['binder','codex','timeline'].includes(tab.key);
  return <ContextMenu><ContextMenuTrigger asChild>{button}</ContextMenuTrigger>
    <ContextMenuContent aria-label={`${tab.label} tab actions`} className="min-w-36 border-white/15 bg-[#1b1b1b]">
      <ContextMenuItem onSelect={onHide}>Hide tab</ContextMenuItem>
      {onClone && <ContextMenuItem onSelect={onClone}>Clone to project</ContextMenuItem>}
      {canDelete && <ContextMenuItem variant="destructive" onSelect={onDelete}>Delete</ContextMenuItem>}
    </ContextMenuContent>
  </ContextMenu>;
}

export function WorkspaceTabs({novel,onFocus}:{novel:Novel;onFocus?:()=>void}) {
  const active=useKachamak(s=>s.activeTab), setTab=useKachamak(s=>s.setTab), closeTab=useKachamak(s=>s.closeTab);
  const view=useKachamak(s=>s.view), setView=useKachamak(s=>s.setView);
  const specialView=view==='timeline'||view==='family';
  const lastNoteView=useRef(specialView?'write':view);
  useEffect(()=>{if(!specialView)lastNoteView.current=view;},[view,specialView]);
  const openTab=(key:TabKey)=>{
    if(key==='family'){
      const state=useKachamak.getState(), roots=novel.sections.family;
      const tree=state.selectedNodeId && findNode(roots,state.selectedNodeId);
      setTab(key);setView('family');state.select(tree ? tree.id : roots.find(n=>!n.hidden)?.id??null);
      return;
    }
    if(key==='timeline'){setTab('timeline');setView('timeline');useKachamak.setState({selectedNodeId:null});return;}
    const nextView=specialView?lastNoteView.current:view;
    if(specialView)setView(nextView);
    setTab(key);
    if(nextView==='continuous'&&key!=='trash')useKachamak.setState({selectedNodeId:null});
  };
  const [name,setName]=useState(''), [open,setOpen]=useState(false);
  const [pendingDelete,setPendingDelete]=useState<{key:TabKey;label:string;projectId:string}|null>(null);
  const [pendingClone,setPendingClone]=useState<typeof pendingDelete>(null);
  useEffect(()=>{setPendingDelete(null);setPendingClone(null);},[novel.id]);
  useEffect(()=>{
    const current=useKachamak.getState();
    if(current.activeNovelId!==novel.id || !current.novels.includes(novel))return;
    const location=visibleTabLocation(novel,current.activeTab,current.view);
    if(location)useKachamak.setState(location);
  },[novel,active,view]);
  const tabs=workspaceTabs(novel), hiddenTabs=workspaceTabs(novel,true);
  const cloneable = new Set(cloneableWorkspaceTabs(novel).map(tab => tab.key));
  const tabLabel=(id:unknown)=>tabs.find(tab=>tab.key===id)?.label??'tab';
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:5}}),useSensor(KeyboardSensor,{coordinateGetter:sortableKeyboardCoordinates,keyboardCodes:{start:['Space'],cancel:['Escape'],end:['Space']}}));
  return <><nav aria-label="Workspace sections" className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden px-2">
    <div className="flex h-full min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <DndContext key={novel.id} sensors={sensors} collisionDetection={closestCenter} modifiers={[horizontalOnly]} onDragEnd={({active,over})=>{if(over&&active.id!==over.id)useKachamak.getState().moveWorkspaceTab(novel.id,active.id as TabKey,over.id as TabKey);}} accessibility={{screenReaderInstructions:{draggable:'Press Space to move a tab, Left or Right to choose a position, Space to drop, or Escape to cancel.'},announcements:{onDragStart:({active})=>`Moving ${tabLabel(active.id)}.`,onDragOver:({active,over})=>over?`${tabLabel(active.id)} over ${tabLabel(over.id)}.`:undefined,onDragEnd:({active,over})=>over?`Moved ${tabLabel(active.id)}.`:'Tab order unchanged.',onDragCancel:()=> 'Tab move cancelled.'}}}>
      <SortableContext items={tabs.map(tab=>tab.key)} strategy={horizontalListSortingStrategy}>
        {tabs.map(tab=><SortableWorkspaceTab key={tab.key} tab={tab} active={active===tab.key} onOpen={()=>openTab(tab.key)} onHide={()=>useKachamak.getState().hideTab(novel.id,tab.key)} onDelete={()=>setPendingDelete({...tab,projectId:novel.id})} onClone={cloneable.has(tab.key)?()=>setPendingClone({...tab,projectId:novel.id}):undefined}/>)}
      </SortableContext>
    </DndContext>
    <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button aria-label="Open workspace tab" title="Open workspace tab" className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-white/10"><Plus className="h-4 w-4"/></button></PopoverTrigger><PopoverContent align="start" className="w-72 border-white/15 bg-[#1b1b1b] p-3">
      <p className="mb-2 text-sm font-medium">Your workspace</p>
      <form className="flex gap-2" onSubmit={e=>{e.preventDefault();if(!name.trim())return;const state=useKachamak.getState();const id=state.addNode('binder',null,'doc',name.trim());if(id){state.updateNode('binder',id,{icon:'folder'});state.openNoteTab(id);state.select(id);state.setRenamingNode(null);}setName('');setOpen(false);}}><input aria-label="New folder tab name" placeholder="Research, World, Marketing…" value={name} onChange={e=>setName(e.target.value)} className="min-w-0 flex-1 rounded border border-white/15 bg-black/20 px-2 py-1.5 text-xs"/><button className="rounded bg-amber-400 px-2 text-xs text-black">Create</button></form>
      {hiddenTabs.length>0&&<div aria-label="Hidden tabs" className="mt-3 max-h-60 overflow-y-auto border-t border-white/10 pt-2">
        {hiddenTabs.map(tab=><button type="button" key={tab.key} className="flex w-full items-center gap-2 rounded p-2 text-left text-xs hover:bg-white/10" onClick={()=>{openTab(tab.key);setOpen(false);}}><FolderOpen className="h-3.5 w-3.5 shrink-0"/>Show {tab.label}</button>)}
      </div>}
    </PopoverContent></Popover>
    </div>
    <div className="flex shrink-0 items-center border-l border-white/15 pl-2">
      <PageFormatMenu disabled={active==='trash'}/>
      <button type="button" disabled={active==='trash'} onMouseDown={event=>event.preventDefault()} onClick={onFocus} aria-label="Focus" title="Focus" className="mr-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-40"><EyeOff className="h-3.5 w-3.5"/>Focus</button>
      <button type="button" onClick={()=>openTab('trash')} aria-current={active==='trash'?'page':undefined} title="Trash" className={`rounded-md border px-2.5 py-1 text-sm ${active==='trash'?'border-[#ad7e2e]/70 bg-[#3a2c18] text-[#fbe4a6]':'border-transparent text-muted-foreground hover:text-white'}`}>Trash</button>
    </div>
  </nav>
    {pendingClone?.projectId===novel.id && <CloneWorkspaceTabDialog sourceId={novel.id} tab={pendingClone} onClose={()=>setPendingClone(null)}/>}
    <AlertDialog open={!!pendingDelete} onOpenChange={value=>{if(!value)setPendingDelete(null);}}><AlertDialogContent className="border-white/15 bg-[#1b1b1b]"><AlertDialogHeader><AlertDialogTitle>Delete {pendingDelete?.label} tab?</AlertDialogTitle><AlertDialogDescription>This removes only the tab from your workspace. All notes and folders stay saved in your project. {pendingDelete?.key.startsWith('note:')?'Reopen it from the note menu using Open as tab.':'Restore it from the + menu using Show '+(pendingDelete?.label??'this tab')+'.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 text-white hover:bg-red-500" onClick={()=>{if(pendingDelete&&useKachamak.getState().activeNovelId===pendingDelete.projectId)closeTab(pendingDelete.key);setPendingDelete(null);}}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
