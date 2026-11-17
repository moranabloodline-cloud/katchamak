'use client';
import {useEffect,useRef,useState} from 'react';
import {ImagePlus,X} from 'lucide-react';
import type {NoteNode,SectionKey} from '@/lib/kachamak/types';
import {useKachamak} from '@/lib/kachamak/store';
import {readNovelCover} from '@/lib/kachamak/project-settings';
import {Dialog,DialogContent,DialogTitle,DialogClose} from '@/components/ui/dialog';

export function NoteImage({node,section}:{node:NoteNode;section:SectionKey}) {
  const projectId=useKachamak(state=>state.activeNovelId);
  const input=useRef<HTMLInputElement>(null),request=useRef(0);
  const previewButton=useRef<HTMLButtonElement>(null);
  const [loading,setLoading]=useState(false),[error,setError]=useState('');
  const [preview,setPreview]=useState(false);
  const [imageRatio,setImageRatio]=useState(1);
  useEffect(()=>{request.current++;setLoading(false);setError('');setPreview(false);return()=>{request.current++;};},[projectId,node.id]);
  const read=async(file:()=>Promise<File>)=>{
    const sequence=++request.current,noteId=node.id;setLoading(true);setError('');
    try{
      const image=await readNovelCover(await file(),{width:384,height:384});
      const state=useKachamak.getState();
      if(sequence===request.current&&state.activeNovelId===projectId&&state.selectedNodeId===noteId)state.updateNode(section,noteId,{image});
    }catch(error){if(sequence===request.current)setError(error instanceof Error?error.message:'This image could not be read.');}
    finally{if(sequence===request.current)setLoading(false);}
  };
  const paste=()=>read(async()=>{
    if(!navigator.clipboard?.read)throw new Error('Use Ctrl+V here to paste an image, or choose Upload.');
    for(const item of await navigator.clipboard.read()){
      const type=item.types.find(type=>['image/png','image/jpeg','image/webp'].includes(type));
      if(type)return new File([await item.getType(type)],'pasted-image',{type});
    }
    throw new Error('Copy an image first, then choose Paste.');
  });
  const button='rounded border border-white/20 bg-[#3b3b40] px-2 py-0.5 text-[10px] leading-4 text-white hover:bg-[#505057] disabled:opacity-50';
  return <section aria-label="Note image">
    <div role="group" aria-label="Note image — upload or paste" tabIndex={0} onPaste={event=>{const file=event.clipboardData.files[0];if(file){event.preventDefault();void read(async()=>file);}}} className="group/note-image relative flex aspect-[6/5] w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-white/15 bg-black/15 outline-none focus-visible:ring-1 focus-visible:ring-amber-500">
      {node.image?<button ref={previewButton} type="button" aria-label="Enlarge note image" onClick={()=>setPreview(true)} className="h-full w-full cursor-zoom-in outline-none focus-visible:ring-1 focus-visible:ring-amber-500"><img src={node.image} alt={`${node.title} image`} onLoad={event=>{const image=event.currentTarget;if(image.naturalHeight)setImageRatio(image.naturalWidth/image.naturalHeight);}} className="h-full w-full object-contain"/></button>:<span className="flex items-center gap-2 text-xs text-muted-foreground"><ImagePlus aria-hidden="true" className="h-5 w-5"/>Add an image</span>}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 opacity-0 transition-opacity group-hover/note-image:opacity-100 group-focus-within/note-image:opacity-100 [&>button]:group-hover/note-image:pointer-events-auto [&>button]:group-focus-within/note-image:pointer-events-auto">
        <button type="button" className={button} disabled={loading} onClick={()=>input.current?.click()}>Upload</button>
        <button type="button" className={button} disabled={loading} onClick={()=>void paste()}>Paste</button>
        {node.image&&<button type="button" aria-label="Remove note image" className="absolute right-1 top-1 rounded bg-black/50 p-0.5 text-white hover:bg-black/80" onClick={()=>{request.current++;setLoading(false);setError('');setPreview(false);useKachamak.getState().updateNode(section,node.id,{image:undefined});}}><X className="h-3 w-3"/></button>}
      </div>
      {loading&&<span role="status" className="absolute inset-x-0 bottom-0 bg-black/70 text-center text-[10px] text-white">Loading…</span>}
    </div>
    <input ref={input} type="file" aria-label="Upload note image" accept="image/jpeg,image/png,image/webp" hidden onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void read(async()=>file);}}/>
    {error&&<p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}
    <Dialog open={preview&&!!node.image} onOpenChange={setPreview}><DialogContent aria-describedby={undefined} onCloseAutoFocus={event=>{event.preventDefault();previewButton.current?.focus();}} showCloseButton={false} style={{width:`min(calc(100vw - 2rem), calc((100dvh - 3rem) * ${imageRatio}))`}} className="max-w-[calc(100vw-2rem)] gap-0 overflow-hidden border-white/25 bg-black p-0 sm:max-w-[calc(100vw-2rem)]">
      <DialogTitle className="sr-only">{node.title} image</DialogTitle>
      <img src={node.image} alt={`${node.title} image`} className="block h-auto max-h-[calc(100dvh-3rem)] w-full object-contain"/>
      <DialogClose aria-label="Close image preview" className="absolute right-2 top-2 rounded-md border border-white/25 bg-black/60 p-2 text-white hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-amber-500"><X aria-hidden="true" className="h-4 w-4"/></DialogClose>
    </DialogContent></Dialog>
  </section>;
}
