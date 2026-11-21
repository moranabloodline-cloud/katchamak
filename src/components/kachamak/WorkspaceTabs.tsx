'use client';
import { useEffect, useRef, useState } from 'react';
import { Images, House, Plus, FolderOpen, BookOpen, LibraryBig, CalendarRange, Network, PanelsTopLeft, NotebookPen, Telescope, MessageSquareQuote } from 'lucide-react';
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

const tabStyles = {
  gallery: { icon: Images, color: '#79c6b5' },
  binder: { icon: BookOpen, color: '#ecb66b' },
  codex: { icon: LibraryBig, color: '#56c8b5' },
  timeline: { icon: CalendarRange, color: '#6db8eb' },
  family: { icon: Network, color: '#a8cd7c' },
  planning: { icon: NotebookPen, color: '#eba67f' },
  research: { icon: Telescope, color: '#85b7e8' },
  templates: { icon: PanelsTopLeft, color: '#b49de9' },
  prompts: { icon: MessageSquareQuote, color: '#df91ad' },
};
const folderStyle = { icon: FolderOpen, color: '#dcb272' };
function tabStyle(key: TabKey) {
  return Object.hasOwn(tabStyles, key) ? tabStyles[key as keyof typeof tabStyles] : folderStyle;
}

const horizontalOnly:Modifier=({transform})=>({...transform,y:0});
function SortableWorkspaceTab({tab,active,onOpen,onHide,onDelete,onClone}:{tab:{key:TabKey;label:string;color?:string};active:boolean;onOpen:()=>void;onHide:()=>void;onDelete:()=>void;onClone?:()=>void}) {
  const {attributes,listeners,setNodeRef,transform,transition,isDragging}=useSortable({id:tab.key});
  const {icon: Icon, color} = tabStyle(tab.key);
  const button=<button ref={setNodeRef} {...attributes} {...listeners} type="button" onClick={onOpen} aria-current={active?'page':undefined} title={tab.label} style={{transform:CSS.Transform.toString(transform),transition,position:'relative',zIndex:isDragging?10:undefined}} className={`workspace-ribbon-tile cursor-grab touch-none select-none active:cursor-grabbing ${isDragging?'bg-background shadow-lg ring-1 ring-amber-400/40':''}`}><Icon aria-hidden="true" style={{color}}/><span className="max-w-full truncate" style={{color:tab.color || undefined}}>{tab.label}</span></button>;
  const canDelete = !['binder','codex','timeline','gallery'].includes(tab.key);
  return <ContextMenu modal={false}><ContextMenuTrigger asChild>{button}</ContextMenuTrigger>
    <ContextMenuContent aria-label={`${tab.label} tab actions`} className="min-w-36 border-white/15 bg-[#1b1b1b]">
      <ContextMenuItem onSelect={onHide}>Hide tab</ContextMenuItem>
      {onClone && <ContextMenuItem onSelect={onClone}>Clone to project</ContextMenuItem>}
      {canDelete && <ContextMenuItem variant="destructive" onSelect={onDelete}>Delete</ContextMenuItem>}
    </ContextMenuContent>
  </ContextMenu>;
}

export function useOpenWorkspaceTab(novel: Novel | undefined) {
  const setTab=useKachamak(s=>s.setTab);
  const view=useKachamak(s=>s.view), setView=useKachamak(s=>s.setView);
  const inGallery=useKachamak(s=>s.activeTab==='gallery');
  const specialView=inGallery||view==='timeline'||view==='family'||view==='homepage';
  const lastNoteView=useRef(specialView?'write':view);
  useEffect(()=>{if(!specialView)lastNoteView.current=view;},[view,specialView]);
  return (key:TabKey)=>{
    if(!novel)return;
    if(key==='gallery'){setTab(key);setView('write');return;}
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
}

export function WorkspaceTabs({novel,openTab}:{novel:Novel;openTab:(key:TabKey)=>void}) {
  const active=useKachamak(s=>s.activeTab), view=useKachamak(s=>s.view), closeTab=useKachamak(s=>s.closeTab);
  const ribbon=useRef<HTMLElement>(null);
  useEffect(()=>{
    // A restored or newly revealed tab may start beyond the visible ribbon.
    const nav=ribbon.current;
    const current=nav?.querySelector<HTMLElement>('button[aria-current="page"]');
    if(!nav || !current)return;
    const tab=current.getBoundingClientRect(), viewport=nav.getBoundingClientRect();
    if(tab.right>viewport.right)nav.scrollLeft+=tab.right-viewport.right;
    else if(tab.left<viewport.left)nav.scrollLeft-=viewport.left-tab.left;
  },[active,view,novel.id]);
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
  return <><nav ref={ribbon} aria-label="Workspace sections" className="workspace-ribbon">
    <div className="workspace-ribbon-grid">
      <button type="button" className="workspace-ribbon-tile" title="Homepage" aria-current={view==='homepage'?'page':undefined} onClick={()=>useKachamak.getState().setView('homepage')}>
        <House aria-hidden="true" className="text-amber-300"/><span>Homepage</span>
      </button>
    <DndContext key={novel.id} sensors={sensors} collisionDetection={closestCenter} modifiers={[horizontalOnly]} onDragEnd={({active,over})=>{if(over&&active.id!==over.id)useKachamak.getState().moveWorkspaceTab(novel.id,active.id as TabKey,over.id as TabKey);}} accessibility={{screenReaderInstructions:{draggable:'Press Space to move a tab, Left or Right to choose a position, Space to drop, or Escape to cancel.'},announcements:{onDragStart:({active})=>`Moving ${tabLabel(active.id)}.`,onDragOver:({active,over})=>over?`${tabLabel(active.id)} over ${tabLabel(over.id)}.`:undefined,onDragEnd:({active,over})=>over?`Moved ${tabLabel(active.id)}.`:'Tab order unchanged.',onDragCancel:()=> 'Tab move cancelled.'}}}>
      <SortableContext items={tabs.map(tab=>tab.key)} strategy={horizontalListSortingStrategy}>
        {tabs.map(tab=><SortableWorkspaceTab key={tab.key} tab={tab} active={view!=='homepage' && active===tab.key} onOpen={()=>openTab(tab.key)} onHide={()=>useKachamak.getState().hideTab(novel.id,tab.key)} onDelete={()=>setPendingDelete({...tab,projectId:novel.id})} onClone={cloneable.has(tab.key)?()=>setPendingClone({...tab,projectId:novel.id}):undefined}/>)}
      </SortableContext>
    </DndContext>
    </div>
    <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button aria-label="Open workspace tab" title="Open workspace tab" className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-white/10"><Plus className="h-4 w-4"/></button></PopoverTrigger><PopoverContent align="start" className="w-72 border-white/15 bg-[#1b1b1b] p-3">
      <p className="mb-2 text-sm font-medium">Your workspace</p>
      <form className="flex gap-2" onSubmit={e=>{e.preventDefault();if(!name.trim())return;const state=useKachamak.getState();const id=state.addNode('binder',null,'doc',name.trim());if(id){state.updateNode('binder',id,{icon:'folder'});state.openNoteTab(id);state.select(id);state.setRenamingNode(null);}setName('');setOpen(false);}}><input aria-label="New folder tab name" placeholder="Research, World, Marketing…" value={name} onChange={e=>setName(e.target.value)} className="min-w-0 flex-1 rounded border border-white/15 bg-black/20 px-2 py-1.5 text-xs"/><button className="rounded bg-amber-400 px-2 text-xs text-black">Create</button></form>
      {hiddenTabs.length>0&&<div aria-label="Hidden tabs" className="mt-3 max-h-60 overflow-y-auto border-t border-white/10 pt-2">
        {hiddenTabs.map(tab=><button type="button" key={tab.key} className="flex w-full items-center gap-2 rounded p-2 text-left text-xs hover:bg-white/10" onClick={()=>{openTab(tab.key);setOpen(false);}}><FolderOpen className="h-3.5 w-3.5 shrink-0"/>Show <span style={{color:tab.color || undefined}}>{tab.label}</span></button>)}
      </div>}
    </PopoverContent></Popover>
  </nav>
    {pendingClone?.projectId===novel.id && <CloneWorkspaceTabDialog sourceId={novel.id} tab={pendingClone} onClose={()=>setPendingClone(null)}/>}
    <AlertDialog open={!!pendingDelete} onOpenChange={value=>{if(!value)setPendingDelete(null);}}><AlertDialogContent className="border-white/15 bg-[#1b1b1b]"><AlertDialogHeader><AlertDialogTitle>Delete {pendingDelete?.label} tab?</AlertDialogTitle><AlertDialogDescription>This removes only the tab from your workspace. All notes and folders stay saved in your project. {pendingDelete?.key.startsWith('note:')?'Reopen it from the note menu using Open as tab.':'Restore it from the + menu using Show '+(pendingDelete?.label??'this tab')+'.'}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 text-white hover:bg-red-500" onClick={()=>{if(pendingDelete&&useKachamak.getState().activeNovelId===pendingDelete.projectId)closeTab(pendingDelete.key);setPendingDelete(null);}}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </>;
}
