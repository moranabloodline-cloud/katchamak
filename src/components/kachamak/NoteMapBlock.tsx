'use client';

import {useState} from 'react';
import {Map as MapIcon, Replace, X} from 'lucide-react';
import {Dialog, DialogContent, DialogTitle} from '@/components/ui/dialog';
import {homepageEntry, homepageRows, type HomeBlock} from '@/lib/kachamak/homepage';
import {galleryImage,projectImageSrc} from '@/lib/kachamak/project-image';
import {findNode} from '@/lib/kachamak/utils';
import {useKachamak} from '@/lib/kachamak/store';
import type {Novel,NoteNode} from '@/lib/kachamak/types';
import type {NoteMap} from '@/lib/kachamak/note-map';
import type {MapAtlas} from '@/lib/kachamak/canvas-map';
import {GalleryImagePicker} from './GalleryImagePicker';
import {CanvasMapStudio} from './CanvasMapStudio';
import {CanvasMapSurface} from './CanvasMapSurface';

export function NoteMapBlock({novel,node}:{novel:Novel;node:NoteNode}){
  const [view,setView]=useState<'choose'|'gallery'|'studio'|null>(null);
  const selected=node.noteMap;
  let block:HomeBlock|undefined;
  if(selected?.kind==='canvas'){
    block=homepageEntry(novel,selected.pageId)?.blocks.find(b=>b.id===selected.blockId&&b.layout==='map');
  }else if(selected?.kind==='gallery'){
    block={id:node.id,layout:'map',width:'standard',title:galleryImage(novel.gallery,selected.image)?.name||'Map',text:'',image:selected.image,atlas:selected.atlas};
  }
  const image=projectImageSrc(novel.gallery,block?.image);
  function currentNote(){
    const state=useKachamak.getState();
    if(state.activeNovelId!==novel.id||state.selectedNodeId!==node.id)return;
    const book=state.novels.find(n=>n.id===novel.id);
    return book&&findNode(book.sections.codex,node.id);
  }
  function assign(next:NoteMap|undefined){
    const current=currentNote();
    if(!current||current.noteMap!==selected)return false;
    useKachamak.getState().updateNode('codex',node.id,{noteMap:next});
    return true;
  }
  function saveAtlas(atlas:MapAtlas){
    if(selected?.kind==='gallery')return assign({...selected,atlas});
    if(selected?.kind!=='canvas'||!block||currentNote()?.noteMap!==selected)return false;
    return useKachamak.getState().changeHomepage(novel.id,{type:'mapAnnotations',original:block,atlas},selected.pageId);
  }
  const btn='rounded bg-black/75 p-1.5 text-white hover:bg-black/90 focus-visible:outline-2 focus-visible:outline-amber-500';
  return <>
    {block&&image?<div className="group/map relative overflow-hidden rounded-md border border-border">
      <CanvasMapSurface block={block} image={image} open={()=>setView('studio')}/>
      <div className="absolute left-1 top-1 z-10 flex gap-1 opacity-0 group-hover/map:opacity-100 group-focus-within/map:opacity-100 [@media(hover:none)]:opacity-100">
        <button type="button" className={btn} title="Change map" aria-label="Change map" onClick={()=>setView('choose')}><Replace size={15}/></button>
        <button type="button" className={btn} title="Remove map from note" aria-label="Remove map from note" onClick={()=>assign(undefined)}><X size={15}/></button>
      </div>
    </div>:<div className="rounded-md border border-dashed border-border p-2 text-center">
      {selected&&<p className="mb-1 text-xs text-muted-foreground">This map is no longer available.</p>}
      <button type="button" onClick={()=>setView('choose')} className="flex min-h-16 w-full items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"><MapIcon size={16}/>Choose map</button>
      {selected&&<button type="button" className="text-xs underline" onClick={()=>assign(undefined)}>Remove map from note</button>}
    </div>}
    <Dialog open={view==='choose'} onOpenChange={open=>{if(!open)setView(null)}}>
      {view==='choose'&&<DialogContent aria-describedby={undefined} className="max-h-[80dvh] overflow-y-auto">
        <DialogTitle>Choose map</DialogTitle>
        {homepageRows(novel).map(page=>{
          const maps=homepageEntry(novel,page.id)?.blocks.filter(b=>b.layout==='map'&&projectImageSrc(novel.gallery,b.image));
          if(!maps?.length)return null;
          return <section key={page.id} aria-label={page.path}>
            <h3 className="mb-1 text-xs text-muted-foreground">{page.path}</h3>
            {maps.map(map=><button type="button" key={map.id} onClick={()=>{assign({kind:'canvas',pageId:page.id,blockId:map.id});setView(null)}} className="flex w-full items-center gap-3 rounded p-2 text-left text-sm hover:bg-muted">
              <img alt="" className="h-10 w-16 rounded object-contain" src={projectImageSrc(novel.gallery,map.image)}/>{map.title||'Untitled map'}
            </button>)}
          </section>;
        })}
        <button type="button" className="rounded border border-border p-2 text-sm hover:bg-muted" onClick={()=>setView('gallery')}>Use an image from Gallery</button>
      </DialogContent>}
    </Dialog>
    <GalleryImagePicker novel={novel} open={view==='gallery'} onOpenChange={open=>setView(open?'gallery':null)} onPick={image=>assign({kind:'gallery',image})}/>
    <Dialog open={view==='studio'&&!!image} onOpenChange={open=>{if(!open)setView(null)}}>
      {view==='studio'&&block&&image&&<DialogContent aria-describedby={undefined} showCloseButton={false} onEscapeKeyDown={event=>{if(event.target instanceof Element&&event.target.closest('.atlas-studio'))event.preventDefault()}} className="h-[88dvh] w-[94vw] max-w-[94vw] overflow-hidden p-0 sm:max-w-[94vw]">
        <DialogTitle className="sr-only">{block.title||'Map'}</DialogTitle>
        <CanvasMapStudio block={block} image={image} initial="inspect" backLabel="Back to note" close={()=>setView(null)} persist={saveAtlas}/>
      </DialogContent>}
    </Dialog>
  </>;
}
