'use client';

import {useEffect, useMemo, useRef, useState, type Dispatch, type DragEvent, type SetStateAction} from 'react';
import {ChevronDown, ChevronRight, Folder, FolderOpen, FolderPlus, Images, MoreHorizontal, Upload} from 'lucide-react';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/components/ui/dialog';
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from '@/components/ui/dropdown-menu';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {useKachamak} from '@/lib/kachamak/store';
import {checkGalleryUploadSize} from '@/lib/kachamak/cloud-library';
import {readHomepageImage} from '@/lib/kachamak/project-settings';
import {galleryPath, type GalleryEntry} from '@/lib/kachamak/gallery';
import {uid} from '@/lib/kachamak/utils';
import type {Novel} from '@/lib/kachamak/types';
import {WorkspaceNavigation} from './WorkspaceNavigation';
import {toast} from 'sonner';

const galleryDragType = 'application/x-kachamak-gallery-image';
export type DraggedGalleryImage = {bookId:string; imageId:string};
type SetDraggedImage = (source:DraggedGalleryImage|null)=>void;

type Location = {folderId:string|null; openFolder:(id:string|null)=>void};
const compareNames = (a:GalleryEntry,b:GalleryEntry) => a.name.localeCompare(b.name,undefined,{numeric:true,sensitivity:'base'});
const selectedRow = 'bg-amber-400/10 text-amber-300';

export function GalleryTree({novel,folderId,openFolder,collapsed,setCollapsed,draggedImage,setDraggedImage}:Location & {
  novel:Novel; collapsed:Set<string>; setCollapsed:Dispatch<SetStateAction<Set<string>>>;
  draggedImage:DraggedGalleryImage|null; setDraggedImage:SetDraggedImage;
}) {
  const entries=novel.gallery;
  const source=draggedImage?.bookId===novel.id ? entries?.find(item=>item.id===draggedImage.imageId && item.kind==='image') : undefined;
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

  function dropTarget(destination:string|null, rowClass:string) {
    const allowed=!!source && source.parentId!==destination;
    return {
      onDragOver(event:DragEvent) {
        if (!source || !event.dataTransfer.types.includes(galleryDragType)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect=allowed?'move':'none';
        setOver(destination);
      },
      onDragLeave(event:DragEvent) {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
        setOver(current=>current===destination?undefined:current);
      },
      onDrop(event:DragEvent) {
        if (!source || event.dataTransfer.getData(galleryDragType)!==source.id) return;
        event.preventDefault();
        setOver(undefined);
        setDraggedImage(null);
        if (!allowed) return;
        try {
          useKachamak.getState().editGallery(novel.id,{type:'move',id:source.id,parentId:destination});
        } catch (error) {
          toast.error(error instanceof Error?error.message:'The image could not be moved.');
        }
      },
      className:rowClass+' '+(allowed && over===destination
        ? 'bg-teal-400/15 ring-1 ring-inset ring-teal-400'
        : 'hover:bg-white/5 '+(folderId===destination?selectedRow:'')),
    };
  }

  const rows=useMemo(()=>{
    const folders=new Map<string|null,GalleryEntry[]>();
    for (const entry of (entries??[]).filter(entry=>entry.kind==='folder').sort(compareNames)) {
      const siblings=folders.get(entry.parentId);
      if(siblings)siblings.push(entry);
      else folders.set(entry.parentId,[entry]);
    }
    const stack=(folders.get(null)??[]).map(item=>({item,depth:0})).reverse();
    const visible:{item:GalleryEntry;depth:number;branch:boolean}[]=[];
    while(stack.length) {
      const {item,depth}=stack.pop()!;
      const children=folders.get(item.id)??[];
      visible.push({item,depth,branch:children.length>0});
      if(!collapsed.has(item.id)) {
        for(let i=children.length-1;i>=0;i--)stack.push({item:children[i],depth:depth+1});
      }
    }
    return visible;
  },[entries,collapsed]);
  return <div className="flex h-full min-h-0 flex-col">
    <WorkspaceNavigation/>
    <nav aria-label="Gallery folders" className="kachamak-scroll min-h-0 flex-1 overflow-auto p-1">
      <button type="button" aria-current={folderId===null?'page':undefined} onClick={()=>openFolder(null)}
        {...dropTarget(null,'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm')}>
        <Images className="size-4 text-teal-300"/>Gallery
      </button>
      {rows.map(({item,depth,branch})=><div key={item.id} style={{paddingLeft:8+depth*14}}
        {...dropTarget(item.id,'flex items-center rounded-md text-sm')}>
        {branch?<button type="button" className="grid size-6 shrink-0 place-items-center" aria-expanded={!collapsed.has(item.id)}
          aria-label={(collapsed.has(item.id)?'Expand ':'Collapse ')+item.name}
          onClick={()=>setCollapsed(previous=>{const next=new Set(previous);if(next.has(item.id))next.delete(item.id);else next.add(item.id);return next;})}>
          {collapsed.has(item.id)?<ChevronRight className="size-3"/>:<ChevronDown className="size-3"/>}
        </button>:<span className="w-6 shrink-0"/>}
        <button type="button" aria-current={folderId===item.id?'page':undefined} onClick={()=>openFolder(item.id)} title={item.name}
          className="flex min-w-16 flex-1 items-center gap-2 py-1.5 pr-2 text-left">
          <Folder className="size-4 shrink-0 text-amber-300/80"/><span className="truncate">{item.name}</span>
        </button>
      </div>)}
    </nav>
  </div>;
}

type Edit = {type:'create';parentId:string|null} | {type:'rename'|'move'|'remove';item:GalleryEntry};

export function GalleryCanvas({novel,folderId,openFolder,setDraggedImage}:Location & {novel:Novel;setDraggedImage:SetDraggedImage}) {
  const entries=novel.gallery??[];
  const path=galleryPath(entries,folderId);
  const items=entries.filter(entry=>entry.parentId===folderId).sort((a,b)=>a.kind===b.kind?compareNames(a,b):a.kind==='folder'?-1:1);
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
  return <section aria-label="Project gallery" className="col-span-full row-start-2 min-h-0 min-w-0 overflow-y-auto overscroll-contain kachamak-scroll">
    <div className="mx-auto max-w-screen-2xl p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Gallery path" className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm">
          <button type="button" onClick={()=>openFolder(null)} className="flex items-center gap-2 rounded px-1 py-1 font-semibold hover:bg-muted">
            <Images className="size-4 text-teal-300"/>Gallery
          </button>
          {path.map(item=><span key={item.id} className="flex min-w-0 items-center gap-1"><ChevronRight className="size-3 shrink-0 text-muted-foreground"/>
            <button type="button" className="max-w-48 truncate rounded p-1 hover:bg-muted" onClick={()=>openFolder(item.id)}>{item.name}</button></span>)}
        </nav>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={()=>edit({type:'create',parentId:folderId})}><FolderPlus/>New folder</Button>
          <Button size="sm" variant="secondary" disabled={uploading} onClick={()=>input.current?.click()}><Upload/>{uploading?'Uploading…':'Upload images'}</Button>
          <input ref={input} aria-label="Choose gallery images" type="file" className="hidden" accept="image/png,image/jpeg,image/webp" multiple
            onChange={e=>{const files=Array.from(e.target.files??[]);e.target.value='';void upload(files);}}/>
        </div>
      </div>
      {error&&!editing&&<p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
      {!items.length?<p className="rounded-lg border border-dashed border-border px-5 py-12 text-center text-sm text-muted-foreground">Add images or create a folder here.</p>:
      <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,11rem),1fr))]">
        {items.map(item=><li key={item.id} className="relative min-w-0 overflow-hidden rounded-lg border border-border bg-card">
          <button type="button" aria-label={'Open '+item.name} className={'block w-full text-left hover:bg-muted/50 '+(item.kind==='image'?'cursor-grab active:cursor-grabbing':'')}
            draggable={item.kind==='image'}
            onDragStart={event=>{
              if (item.kind!=='image') return;
              event.dataTransfer.effectAllowed='move';
              event.dataTransfer.setData(galleryDragType,item.id);
              setDraggedImage({bookId:novel.id,imageId:item.id});
            }}
            onDragEnd={()=>setDraggedImage(null)}
            onClick={()=>item.kind==='folder'?openFolder(item.id):setPreview(item)}>
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
