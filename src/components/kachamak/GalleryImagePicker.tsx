'use client';

import {useState, type ReactNode} from 'react';
import {ChevronRight, Folder, Images, Search} from 'lucide-react';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger} from '@/components/ui/dialog';
import {galleryPath, type GalleryEntry} from '@/lib/kachamak/gallery';
import {galleryImageRef} from '@/lib/kachamak/project-image';
import type {Novel} from '@/lib/kachamak/types';

type Props = {
  novel?:Novel; books?:Novel[]; children?:ReactNode; open?:boolean; onOpenChange?:(open:boolean)=>void;
  onPick:(ref:string,item:Extract<GalleryEntry,{kind:'image'}>)=>void;
};
export function GalleryImagePicker({novel,books,children,open,onOpenChange,onPick}:Props) {
  const [localOpen,setLocalOpen]=useState(false);
  const show=(value:boolean)=>{setLocalOpen(value);onOpenChange?.(value);};
  return <Dialog open={open??localOpen} onOpenChange={show}>
    {children&&<DialogTrigger asChild>{children}</DialogTrigger>}
    {(open??localOpen)&&<DialogContent aria-describedby={undefined} className="flex max-h-[85dvh] flex-col sm:max-w-2xl">
      <DialogHeader><DialogTitle>Choose from Gallery</DialogTitle></DialogHeader>
      <GalleryBrowser key={novel?.id??'library'} novel={novel} books={books} onPick={(ref,item)=>{onPick(ref,item);show(false);}}/>
    </DialogContent>}
  </Dialog>;
}

function GalleryBrowser({novel,books,onPick}:Pick<Props,'novel'|'books'|'onPick'>) {
  const [bookId,setBookId]=useState(books?.[0]?.id);
  const book=novel??books?.find(entry=>entry.id===bookId);
  const [folder,setFolder]=useState<string|null>(null),[query,setQuery]=useState('');
  const entries=book?.gallery??[];
  const path=galleryPath(entries,folder);
  const search=query.trim().toLocaleLowerCase();
  const items=entries.filter(item=>search?item.name.toLocaleLowerCase().includes(search):item.parentId===(path.at(-1)?.id??null))
    .sort((a,b)=>a.kind===b.kind?a.name.localeCompare(b.name,undefined,{numeric:true}):a.kind==='folder'?-1:1);
  const go=(id:string|null)=>{setFolder(id);setQuery('');};
  return <>
    {!novel&&!!books?.length&&<label className="flex items-center gap-2 text-sm">Book
      <select className="min-w-0 rounded border bg-background p-1" value={bookId} onChange={e=>{setBookId(e.target.value);go(null);}}>
        {books.map(b=><option value={b.id} key={b.id}>{b.title}</option>)}
      </select></label>}
    <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
      <Search className="size-4 text-muted-foreground"/><input aria-label="Search gallery" placeholder="Search this gallery" value={query} onChange={e=>setQuery(e.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none"/>
    </label>
    <nav aria-label="Image picker path" className="flex flex-wrap items-center gap-1 text-sm">
      <button type="button" onClick={()=>go(null)} className="flex items-center gap-2"><Images className="size-4 text-teal-300"/>Gallery</button>
      {path.map(item=><span key={item.id} className="flex items-center gap-1"><ChevronRight className="size-3"/>
        <button type="button" onClick={()=>go(item.id)} className="max-w-44 truncate">{item.name}</button></span>)}
    </nav>
    <div className="min-h-0 overflow-y-auto overscroll-contain">
      {items.length?<ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">{items.map(item=><li key={item.id}>
        <button type="button" aria-label={(item.kind==='folder'?'Open folder ':'Choose image ')+item.name}
          className="block w-full overflow-hidden rounded-md border border-border text-left hover:border-teal-400 focus-visible:outline-teal-300"
          onClick={()=>item.kind==='folder'?go(item.id):onPick(galleryImageRef(item.id),item)}>
          <span className="flex aspect-[3/2] items-center justify-center bg-muted/30">{item.kind==='folder'?<Folder className="size-8 text-amber-300"/>:<img src={item.image} alt="" loading="lazy" className="size-full object-contain"/>}</span>
          <span className="block truncate px-2 py-1.5 text-sm" title={item.name}>{item.name}</span>
        </button></li>)}</ul>:<p className="py-8 text-center text-sm text-muted-foreground">
        {search?'No matching items.':!entries.length?'Upload images in the book’s Gallery first.':'This folder is empty.'}
      </p>}
    </div>
  </>;
}
