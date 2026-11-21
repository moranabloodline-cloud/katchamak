'use client';

import {usePanelZoom} from './CtrlZoom';
import {useEffect, useMemo, useRef, useState, type Dispatch, type DragEvent, type SetStateAction} from 'react';
import {Check, ChevronDown, ChevronRight, Folder, FolderOpen, FolderPlus, Images, MoreHorizontal, Upload, X} from 'lucide-react';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {useKachamak} from '@/lib/kachamak/store';
import {checkGalleryUploadSize} from '@/lib/kachamak/cloud-library';
import {readHomepageImage} from '@/lib/kachamak/project-settings';
import {branchSources,insideBranches,type BranchSource} from '@/lib/kachamak/tree-move';
import {useTreeSelection} from './useTreeSelection';
import {galleryPath, type GalleryEntry} from '@/lib/kachamak/gallery';
import {uid} from '@/lib/kachamak/utils';
import type {Novel} from '@/lib/kachamak/types';
import {WorkspaceNavigation} from './WorkspaceNavigation';
import {toast} from 'sonner';

export type GalleryDrag = {bookId:string} & (
  | {kind:'images'; imageIds:string[]; parentId:string|null}
  | {kind:'folder'; sources:BranchSource[]}
);
type SetGalleryDrag = (source:GalleryDrag|null)=>void;

function dragType(source:GalleryDrag) {
  return source.kind==='folder'?'application/x-kachamak-gallery-folder':'application/x-kachamak-gallery-image';
}

function dragData(source:GalleryDrag) {
  return JSON.stringify(source.kind==='folder'?source.sources:source.imageIds);
}

function beginDrag(event:DragEvent, source:GalleryDrag, setDrag:SetGalleryDrag) {
  event.dataTransfer.effectAllowed='move';
  event.dataTransfer.setData(dragType(source),dragData(source));
  setDrag(source);
}

type Location = {folderId:string|null; openFolder:(id:string|null)=>void};
const compareNames = (a:GalleryEntry,b:GalleryEntry) => a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});
const selectedRow = 'bg-amber-400/10 text-amber-300';

export function GalleryTree({novel,folderId,openFolder,collapsed,setCollapsed,drag,setDrag}:Location & {
  novel:Novel; collapsed:Set<string>; setCollapsed:Dispatch<SetStateAction<Set<string>>>;
  drag:GalleryDrag|null; setDrag:SetGalleryDrag;
}) {
  const leftZoom=usePanelZoom("left");
  const entries=novel.gallery;
  const tree=useRef<HTMLElement>(null);
  const select=useTreeSelection(tree,folderId);
  const source=drag?.bookId===novel.id ? drag : undefined;
  // null is the Gallery root. undefined means the pointer is outside a target.
  const [over,setOver]=useState<string|null|undefined>(undefined);
  useEffect(()=>{
    if (!source) { setOver(undefined); return; }
    if (!over || !collapsed.has(over)) return;
    const timer=setTimeout(()=>setCollapsed(previous=>{
      const expanded=new Set(previous);
      expanded.delete(over);
      return expanded;
    }),600);
    return ()=>clearTimeout(timer);
  },[source,over,collapsed,setCollapsed]);

  function dropTarget(destination:string|null, rowClass:string, insideSource=false) {
    const allowed=!!source && !insideSource && (source.kind==='images'?source.parentId!==destination:
      topSources.some(item=>item.parentId!==destination));
    return {
      onDragOver(event:DragEvent) {
        if (!source || !event.dataTransfer.types.includes(dragType(source))) return;
        event.preventDefault();
        event.dataTransfer.dropEffect=allowed?'move':'none';
        setOver(insideSource?undefined:destination);
      },
      onDragLeave(event:DragEvent) {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        setOver(current=>current===destination?undefined:current);
      },
      onDrop(event:DragEvent) {
        if (!source || event.dataTransfer.getData(dragType(source))!==dragData(source)) return;
        event.preventDefault();
        setOver(undefined);
        setDrag(null);
        if (!allowed) return;
        try {
          const change=source.kind==='folder'
            ? {type:'moveFolders' as const,sources:source.sources,parentId:destination}
            : {type:'moveImages' as const,ids:source.imageIds,from:source.parentId,parentId:destination};
          useKachamak.getState().editGallery(novel.id,change);
          if (source.kind==='folder') select.clear();
          if (source.kind==='folder' && destination && collapsed.has(destination)) {
            setCollapsed(previous=>{const expanded=new Set(previous);expanded.delete(destination);return expanded;});
          }
        } catch (error) {
          toast.error(error instanceof Error?error.message:'The selection could not be moved.');
        }
      },
      className:rowClass+' '+(allowed && over===destination
        ? 'bg-teal-400/15 ring-1 ring-inset ring-teal-400'
        : 'hover:bg-white/5 '+(folderId===destination?selectedRow:'')),
    };
  }

  const parents=useMemo(()=>new Map((entries??[]).filter(item=>item.kind==='folder').map(item=>[item.id,item.parentId])),[entries]);
  const draggedFolders=useMemo(()=>new Set(source?.kind==='folder'?source.sources.map(item=>item.id):[]),[source]);
  const topSources=useMemo(()=>source?.kind==='folder'?source.sources.filter(item=>!insideBranches(item.parentId,draggedFolders,parents)):[],[source,parents,draggedFolders]);
  const rows=useMemo(()=>{
    const folders=new Map<string|null,GalleryEntry[]>();
    for (const entry of (entries??[]).filter(entry=>entry.kind==='folder').sort(compareNames)) {
      const siblings=folders.get(entry.parentId);
      if(siblings)siblings.push(entry);
      else folders.set(entry.parentId,[entry]);
    }
    const stack=(folders.get(null)??[]).map(item=>({item,depth:0,insideSource:draggedFolders.has(item.id)})).reverse();
    const visible:{item:GalleryEntry;depth:number;insideSource:boolean;branch:boolean}[]=[];
    while(stack.length) {
      const {item,depth,insideSource}=stack.pop()!;
      const children=folders.get(item.id)??[];
      visible.push({item,depth,insideSource,branch:children.length>0});
      if(!collapsed.has(item.id)) {
        for(let i=children.length-1;i>=0;i--)stack.push({item:children[i],depth:depth+1,insideSource:insideSource||draggedFolders.has(children[i].id)});
      }
    }
    return visible;
  },[entries,collapsed,draggedFolders]);
  return <div className="flex h-full min-h-0 flex-col">
    <WorkspaceNavigation/>
    <nav ref={tree} style={{zoom:leftZoom}} aria-label="Gallery folders" className="kachamak-scroll min-h-0 flex-1 overflow-auto p-1">
      <button type="button" aria-current={folderId===null?'page':undefined} onClick={()=>{select.clear();openFolder(null);}}
        {...dropTarget(null,'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm')}>
        <Images className="size-4 text-teal-300"/>Gallery
      </button>
      {rows.map(({item,depth,branch,insideSource})=><div key={item.id} style={{paddingLeft:8+depth*14}}
        {...dropTarget(item.id,'flex items-center rounded-md text-sm '+(select.marked?.has(item.id)?'outline outline-1 -outline-offset-1 outline-teal-400':''),insideSource)}>
        {branch?<button type="button" className="grid size-6 shrink-0 place-items-center" aria-expanded={!collapsed.has(item.id)}
          aria-label={(collapsed.has(item.id)?'Expand ':'Collapse ')+item.name}
          onClick={()=>setCollapsed(previous=>{const next=new Set(previous);if(next.has(item.id))next.delete(item.id);else next.add(item.id);return next;})}>
          {collapsed.has(item.id)?<ChevronRight className="size-3"/>:<ChevronDown className="size-3"/>}
        </button>:<span className="w-6 shrink-0"/>}
        <button type="button" aria-current={folderId===item.id?'page':undefined} data-tree-move-id={item.id} aria-pressed={select.marked?.has(item.id)??(folderId===item.id)}
          onClick={event=>{if (!select.click(item.id,event)) openFolder(item.id);}} title={item.name}
          draggable onDragStart={event=>beginDrag(event,{kind:'folder',bookId:novel.id,sources:branchSources(select.dragIds(item.id),parents)},setDrag)}
          onDragEnd={()=>setDrag(null)}
          className="flex min-w-16 flex-1 cursor-grab select-none items-center gap-2 py-1.5 pr-2 text-left active:cursor-grabbing">
          <Folder className="size-4 shrink-0 text-amber-300/80"/><span className="truncate">{item.name}</span>
        </button>
      </div>)}
    </nav>
  </div>;
}

type Edit = {type:'create';parentId:string|null} | {type:'rename'|'move'|'remove';item:GalleryEntry};

export function GalleryCanvas({novel,folderId,openFolder,setDrag}:Location & {novel:Novel;setDrag:SetGalleryDrag}) {
  const entries=novel.gallery??[];
  const path=galleryPath(entries,folderId);
  const items=useMemo(()=>(novel.gallery??[]).filter(entry=>entry.parentId===folderId)
    .sort((a,b)=>a.kind===b.kind?compareNames(a,b):a.kind==='folder'?-1:1),[novel.gallery,folderId]);
  const imageIds=useMemo(()=>items.filter(entry=>entry.kind==='image').map(entry=>entry.id),[items]);
  const [selection,setSelection]=useState<Set<string>>(()=>new Set());
  const anchor=useRef<string|null>(null);
  useEffect(()=>{
    const visible=new Set(imageIds);
    if (anchor.current && !visible.has(anchor.current)) anchor.current=null;
    setSelection(previous=>{
      const kept=new Set([...previous].filter(id=>visible.has(id)));
      return kept.size===previous.size?previous:kept;
    });
  },[imageIds]);

  function selectImage(id:string, toggle:boolean, range:boolean) {
    if (range) {
      const end=imageIds.indexOf(id);
      const previousAnchor=anchor.current===null?-1:imageIds.indexOf(anchor.current);
      const start=previousAnchor<0?end:previousAnchor;
      const span=imageIds.slice(Math.min(start,end),Math.max(start,end)+1);
      setSelection(previous=>new Set(toggle?[...previous,...span]:span));
      if (previousAnchor<0) anchor.current=id;
    } else {
      anchor.current=id;
      setSelection(previous=>{
        if (!toggle) return new Set([id]);
        const next=new Set(previous);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  }
  const [editing,setEditing]=useState<Edit|null>(null);
  const [draft,setDraft]=useState('');
  const [preview,setPreview]=useState<GalleryEntry|null>(null);
  const [error,setError]=useState('');
  const [uploading,setUploading]=useState(false);
  const input=useRef<HTMLInputElement>(null);
  const editGallery=useKachamak(s=>s.editGallery);
  function edit(action:Edit) {
    setError('');setEditing(action);
    setDraft(action.type==='rename'?action.item.name:action.type==='move'?action.item.parentId??'':'');
  }
  function saveEdit() {
    if(!editing)return;
    try {
      if(editing.type==='create')editGallery(novel.id,{type:'add',entries:[{id:uid(),parentId:editing.parentId,name:draft.trim(),kind:'folder'}]});
      else if(editing.type==='rename')editGallery(novel.id,{type:'rename',id:editing.item.id,name:draft});
      else if(editing.type==='move')editGallery(novel.id,{type:'move',id:editing.item.id,parentId:draft||null});
      else editGallery(novel.id,{type:'remove',id:editing.item.id});
      setEditing(null);setError('');
    } catch(e) {setError(e instanceof Error?e.message:'The gallery could not be changed.');}
  }
  async function upload(files:File[]) {
    if(!files.length || uploading)return;
    setUploading(true);setError('');
    try {
      const additions:GalleryEntry[]=[];
      for(const file of files) {
        const image=await readHomepageImage(file);
        additions.push({kind:'image',id:uid(),name:file.name.slice(0,255),parentId:folderId,image});
      }
      checkGalleryUploadSize(additions);
      editGallery(novel.id,{type:'add',entries:additions});
    } catch(e) {setError(e instanceof Error?e.message:'The images could not be added.');}
    finally {setUploading(false);}
  }
  const moveOptions=editing?.type==='move'?entries.filter(item=>item.kind==='folder').map(item=>({item,path:galleryPath(entries,item.id)}))
    .filter(option=>!option.path.some(ancestor=>ancestor.id===editing.item.id)).sort((a,b)=>compareNames(a.item,b.item)):[];
  return <section style={{zoom:"var(--workspace-canvas-zoom, 1)"}} aria-label="Project gallery" className="col-span-full row-start-2 min-h-0 min-w-0 overflow-y-auto overscroll-contain kachamak-scroll">
    <div className="mx-auto max-w-screen-2xl p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Gallery path" className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
          <button type="button" onClick={()=>openFolder(null)} className="flex items-center gap-2 rounded px-1 py-1 font-semibold hover:bg-muted">
            <Images className="size-4 text-teal-300"/>Gallery
          </button>
          {path.map(item=><span key={item.id} className="flex min-w-0 items-center gap-1"><ChevronRight className="size-3 shrink-0 text-muted-foreground"/>
            <button type="button" className="max-w-48 truncate rounded p-1 hover:bg-muted" onClick={()=>openFolder(item.id)}>{item.name}</button></span>)}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          {selection.size>0 && <div className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <span role="status">{selection.size} selected</span>
            <button type="button" aria-label="Clear image selection" title="Clear selection" className="rounded p-1 hover:bg-muted"
              onClick={()=>{anchor.current=null;setSelection(new Set());}}><X className="size-3.5"/></button>
          </div>}
          <Button size="sm" variant="outline" onClick={()=>edit({type:'create',parentId:folderId})}><FolderPlus/>New folder</Button>
          <Button size="sm" variant="secondary" disabled={uploading} onClick={()=>input.current?.click()}><Upload/>{uploading?'Uploading…':'Upload images'}</Button>
          <input ref={input} aria-label="Choose gallery images" type="file" className="hidden" accept="image/png,image/jpeg,image/webp" multiple
            onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value='';void upload(files);}}/>
        </div>
      </div>
      {error&&!editing&&<p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
      {!items.length?<p className="rounded-lg border border-dashed border-border px-5 py-12 text-center text-sm text-muted-foreground">Add images or create a folder here.</p>:
      <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,11rem),1fr))]">
        {items.map(item=><li key={item.id} className={'relative min-w-0 overflow-hidden rounded-lg border bg-card '+
          (selection.has(item.id)?'border-teal-400 ring-1 ring-teal-400':'border-border')}>
          <button type="button" aria-label={'Open '+item.name} aria-pressed={item.kind==='image'?selection.has(item.id):undefined}
            className={'block w-full select-none text-left hover:bg-muted/50 '+(item.kind==='image'?'cursor-grab active:cursor-grabbing':'')}
            draggable={item.kind==='image'}
            onDragStart={event=>{
              if (item.kind!=='image') return;
              const ids=selection.has(item.id)?imageIds.filter(id=>selection.has(id)):[item.id];
              if (!selection.has(item.id)) selectImage(item.id,false,false);
              beginDrag(event,{kind:'images',bookId:novel.id,imageIds:ids,parentId:folderId},setDrag);
            }}
            onDragEnd={()=>setDrag(null)}
            onClick={event=>{
              if (item.kind==='folder') {openFolder(item.id);return;}
              const toggle=event.ctrlKey || event.metaKey;
              selectImage(item.id,toggle,event.shiftKey);
              if (!toggle && !event.shiftKey) setPreview(item);
            }}>
            {selection.has(item.id) && <span aria-hidden="true" className="pointer-events-none absolute left-2 top-2 grid size-5 place-items-center rounded-full bg-teal-400 text-black">
              <Check className="size-3.5" strokeWidth={3}/>
            </span>}
            <span className="flex aspect-[3/2] items-center justify-center overflow-hidden bg-muted/25">
              {item.kind==='folder'?<FolderOpen className="size-10 text-amber-300/80" strokeWidth={1.4}/>:
                <img src={item.image} alt="" draggable={false} loading="lazy" className="size-full object-contain"/>}
            </span>
            <span className="block truncate py-2.5 pl-3 pr-9 text-sm" title={item.name}>{item.name}</span>
          </button>
          <DropdownMenu><DropdownMenuTrigger asChild><button type="button" aria-label={'Actions for '+item.name}
            className="absolute bottom-1.5 right-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal className="size-4"/></button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>edit({type:'rename',item})}>Rename</DropdownMenuItem>
              <DropdownMenuItem onSelect={()=>edit({type:'move',item})}>Move to folder</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={()=>edit({type:'remove',item})}>Remove</DropdownMenuItem>
            </DropdownMenuContent></DropdownMenu>
        </li>)}
      </ul>}
    </div>
    <Dialog open={!!editing} onOpenChange={open=>{if(!open){setEditing(null);setError('');}}}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-sm"><DialogHeader><DialogTitle>
        {editing?.type==='create'?'New folder':editing?.type==='rename'?'Rename item':editing?.type==='move'?'Move to folder':'Remove item'}
      </DialogTitle></DialogHeader>
      <form onSubmit={event=>{event.preventDefault();saveEdit();}} className="grid gap-4">
        {editing?.type==='create'||editing?.type==='rename'?<label className="grid gap-1.5 text-sm">Name<Input autoFocus maxLength={255} value={draft} onChange={e=>setDraft(e.target.value)}/></label>:
         editing?.type==='move'?<label className="grid gap-1.5 text-sm">Destination<select className="rounded border bg-background p-2" value={draft} onChange={e=>setDraft(e.target.value)}>
           <option value="">Gallery</option>{moveOptions.map(({item,path})=><option key={item.id} value={item.id}>{path.map(ancestor=>ancestor.name).join(' / ')}</option>)}
         </select></label>:editing&&<p className="break-words text-sm">Remove “{editing.item.name}” from this gallery?</p>}
        {error&&<p role="alert" className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>{setEditing(null);setError('');}}>Cancel</Button>
          <Button type="submit" variant={editing?.type==='remove'?'destructive':'default'} disabled={(editing?.type==='create'||editing?.type==='rename')&&!draft.trim()}>
            {editing?.type==='create'?'Create folder':editing?.type==='remove'?'Remove':editing?.type==='move'?'Move':'Save'}
          </Button></div>
      </form></DialogContent></Dialog>
    <Dialog open={!!preview} onOpenChange={open=>{if(!open)setPreview(null);}}><DialogContent aria-describedby={undefined} className="max-h-[95dvh] overflow-auto sm:max-w-[min(90vw,70rem)]">
      <DialogHeader><DialogTitle className="break-words pr-6">{preview?.name}</DialogTitle></DialogHeader>
      {preview?.kind==='image'&&<img src={preview.image} alt={preview.name} className="mx-auto max-h-[75dvh] max-w-full object-contain"/>}
    </DialogContent></Dialog>
  </section>;
}
