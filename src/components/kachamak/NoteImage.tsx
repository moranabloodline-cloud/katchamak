'use client';
import {useEffect,useRef,useState} from 'react';
import {ImagePlus,X} from 'lucide-react';
import type {NoteNode,SectionKey} from '@/lib/kachamak/types';
import {useKachamak} from '@/lib/kachamak/store';
import {GalleryImagePicker} from './GalleryImagePicker';
import {projectImageSrc} from '@/lib/kachamak/project-image';
import {Dialog,DialogContent,DialogTitle,DialogClose} from '@/components/ui/dialog';

export function NoteImage({node,section}:{node:NoteNode;section:SectionKey}) {
  const novel=useKachamak(state=>state.novels.find(book=>book.id===state.activeNovelId));
  const previewButton=useRef<HTMLButtonElement>(null);
  const [preview,setPreview]=useState(false);
  const [imageRatio,setImageRatio]=useState(1);
  const image=projectImageSrc(novel?.gallery,node.image);
  useEffect(()=>setPreview(false),[novel?.id,node.id]);
  if(!novel)return null;
  const apply=(value?:string)=>{
    const state=useKachamak.getState();
    if(state.activeNovelId===novel.id && state.selectedNodeId===node.id)state.updateNode(section,node.id,{image:value});
  };
  return <section aria-label="Note image">
    <div className="relative flex aspect-[6/5] w-full items-center justify-center overflow-hidden rounded-md border border-dashed border-white/15 bg-black/15">
      {image&&<button ref={previewButton} type="button" aria-label="Enlarge note image" onClick={()=>setPreview(true)} className="h-full w-full cursor-zoom-in">
        <img src={image} alt={node.title+' image'} onLoad={e=>{if(e.currentTarget.naturalHeight)setImageRatio(e.currentTarget.naturalWidth/e.currentTarget.naturalHeight);}} className="size-full object-contain"/>
      </button>}
      <GalleryImagePicker key={novel.id+':'+node.id} novel={novel} onPick={apply}>
        <button type="button" className={image?'absolute bottom-2 left-2 rounded bg-black/80 px-2 py-1 text-xs text-white':'flex size-full items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground'}>
          <ImagePlus className="size-4"/>{image?'Change image':'Choose from Gallery'}
        </button>
      </GalleryImagePicker>
      {image&&<button type="button" aria-label="Remove note image" className="absolute top-1 right-1 rounded bg-black/60 p-1 text-white" onClick={()=>{setPreview(false);apply(undefined);}}><X className="size-3"/></button>}
    </div>
    <Dialog open={preview&&!!image} onOpenChange={setPreview}><DialogContent aria-describedby={undefined} onCloseAutoFocus={event=>{event.preventDefault();previewButton.current?.focus();}} showCloseButton={false} style={{width:`min(80vw, 960px, calc(80dvh * ${imageRatio}), calc(800px * ${imageRatio}))`}} className="max-w-[calc(100vw-2rem)] gap-0 overflow-hidden border-white/25 bg-black p-0 sm:max-w-[calc(100vw-2rem)]">
      <DialogTitle className="sr-only">{node.title} image</DialogTitle>
      <img src={image} alt={`${node.title} image`} className="block h-auto max-h-[min(80dvh,800px)] w-full object-contain"/>
      <DialogClose aria-label="Close image preview" className="absolute right-2 top-2 rounded-md border border-white/25 bg-black/60 p-2 text-white hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-amber-500"><X aria-hidden="true" className="h-4 w-4"/></DialogClose>
    </DialogContent></Dialog>
  </section>;
}
