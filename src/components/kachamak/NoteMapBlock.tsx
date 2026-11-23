'use client';

import {useState} from 'react';
import {Map as MapIcon, Replace, X} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle} from '@/components/ui/dialog';
import {atlasBlock,findProjectMap} from '@/lib/kachamak/project-maps';
import {openProjectMap} from '@/lib/kachamak/map-navigation';
import {projectImageSrc} from '@/lib/kachamak/project-image';
import {findNode} from '@/lib/kachamak/utils';
import {useKachamak} from '@/lib/kachamak/store';
import type {Novel,NoteNode} from '@/lib/kachamak/types';
import type {NoteMap} from '@/lib/kachamak/note-map';
import {ProjectMapSelect} from './ProjectMapSelect';
import {CanvasMapSurface} from './CanvasMapSurface';

export function NoteMapBlock({novel,node}:{novel:Novel;node:NoteNode}){
  const link=node.noteMap;
  const saved=link?.kind==='map'?link:undefined;
  const map=findProjectMap(novel,saved?.mapId);
  const image=projectImageSrc(novel.gallery,map?.image);
  const [choosing,setChoosing]=useState(false),[mapId,setMapId]=useState(''),[pinId,setPinId]=useState('');
  const candidate=findProjectMap(novel,mapId);
  const pins=candidate?.mapAtlas?.features.filter(f=>f.kind==='pin')??[];
  const pin=map?.mapAtlas?.features.find(f=>f.kind==='pin'&&f.id===saved?.pinId);
  function choose(){setMapId(map?.id??'');setPinId(pin?.id??'');setChoosing(true);}
  function assign(next?:NoteMap){
    const state=useKachamak.getState(),book=state.novels.find(b=>b.id===novel.id);
    if(!book||state.activeNovelId!==book.id||state.selectedNodeId!==node.id||findNode(book.sections.codex,node.id)?.noteMap!==link)return;
    state.updateNode('codex',node.id,{noteMap:next});
    setChoosing(false);
  }
  const btn='rounded bg-black/75 p-1.5 text-white hover:bg-black/90';
  return <>
    {map&&image?<div className="group/map relative overflow-hidden rounded-md border border-border">
      <CanvasMapSurface block={atlasBlock(map)} image={image} selected={pin?.id} open={()=>openProjectMap(novel,map.id,pin?.id)} openLabel="Open in Maps"/>
      {pin&&<p className="px-2 py-1 text-xs">{pin.name}</p>}
      <div className="absolute left-1 top-1 z-10 flex gap-1 opacity-0 group-hover/map:opacity-100 group-focus-within/map:opacity-100 [@media(hover:none)]:opacity-100">
        <button type="button" className={btn} title="Change map or pin" aria-label="Change map or pin" onClick={choose}><Replace size={15}/></button>
        <button type="button" className={btn} title="Remove map from note" aria-label="Remove map from note" onClick={()=>assign()}><X size={15}/></button>
      </div>
    </div>:<div className="rounded-md border border-dashed border-border p-2 text-center">
      {link&&<p className="text-xs text-muted-foreground">This map is unavailable.</p>}
      <button type="button" onClick={choose} className="flex min-h-16 w-full items-center justify-center gap-2 text-xs"><MapIcon size={16}/>Choose map</button>
      {link&&<button type="button" className="text-xs underline" onClick={()=>assign()}>Remove map from note</button>}
    </div>}
    <Dialog open={choosing} onOpenChange={setChoosing}>{choosing&&<DialogContent aria-describedby={undefined}>
      <DialogTitle>Choose map</DialogTitle>
      <ProjectMapSelect book={novel} value={mapId} onChange={id=>{setMapId(id);setPinId('');}}/>
      {candidate&&<label className="grid gap-1 text-sm">Location
        <select className="rounded border border-border bg-background p-2" value={pinId} onChange={e=>setPinId(e.target.value)}>
          <option value="">Whole map</option>{pins.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}
        </select></label>}
      <button type="button" disabled={!candidate?.image} className="justify-self-end rounded border px-3 py-2 text-sm disabled:opacity-40" onClick={()=>{if(candidate)assign({kind:'map',mapId:candidate.id,...(pinId?{pinId}:{})});}}>Use map</button>
    </DialogContent>}</Dialog>
  </>;
}
