'use client';
import {FolderPlus,ListTree,Map as MapIcon,Plus} from 'lucide-react';
import {atlasBlock, findProjectMap} from '@/lib/kachamak/project-maps';
import {leaveMap,mapVisit} from '@/lib/kachamak/map-navigation';
import {projectImageSrc} from '@/lib/kachamak/project-image';
import {useKachamak} from '@/lib/kachamak/store';
import type {NoteNode,Novel} from '@/lib/kachamak/types';
import {GalleryImagePicker} from './GalleryImagePicker';
import {CanvasMapStudio} from './CanvasMapStudio';

type Props={novel:Novel;selected:NoteNode|null;host:HTMLDivElement|null;showTree:()=>void;showTools:()=>void;onToolPicked:()=>void};
export function MapsWorkspace({novel,selected,host,showTree,showTools,onToolPicked}:Props){
  const map=selected&&selected.kind!=='folder'?selected:null;
  const image=projectImageSrc(novel.gallery,map?.image);
  const visit=mapVisit(novel,map?.id);
  const create=(kind:'folder'|'doc')=>useKachamak.getState().addNode('maps',selected?.kind==='folder'?selected.id:null,kind,kind==='folder'?'New folder':'New map');
  const entries=(selected?.kind==='folder'?selected.children:novel.sections.maps??[]).filter(n=>!n.hidden);
  const controls='inline-flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs hover:bg-muted';
  const originalAtlas=map?.mapAtlas,originalImage=map?.image;
  return <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Maps workspace">
    <header className="flex min-h-10 shrink-0 items-center gap-2 border-b border-border px-3">
      <button className="md:hidden" type="button" aria-label="Show maps tree" onClick={showTree}><ListTree size={17}/></button>
      <MapIcon size={17} className="text-emerald-300"/><h2 className="mr-auto truncate font-semibold">{selected?.kind==='folder'?selected.title:'Maps'}</h2>
      <button className={controls} type="button" onClick={()=>create('folder')}><FolderPlus size={14}/>Folder</button>
      <button className={controls} type="button" onClick={()=>create('doc')}><Plus size={14}/>New map</button>
    </header>
    {map&&image?<div className="relative min-h-0 flex-1">
      <CanvasMapStudio key={map.id+':'+image.slice(-24)} block={atlasBlock(map)} image={image} initialPinId={visit?.pinId}
        host={host} showTools={showTools} onPick={onToolPicked} backLabel={visit?(visit.origin.view==='homepage'?'Back to canvas':'Back to note'):'Map library'} close={()=>leaveMap(novel,map.id)}
        persist={atlas=>{
          const state=useKachamak.getState(),book=state.novels.find(b=>b.id===novel.id);
          const live=book&&findProjectMap(book,map.id);
          if(!live||state.activeNovelId!==novel.id||state.selectedNodeId!==map.id||live.mapAtlas!==originalAtlas||live.image!==originalImage)return false;
          state.updateNode('maps',map.id,{mapAtlas:atlas});
          return live.mapAtlas===atlas;
        }}/>
    </div>:map?<div className="m-auto grid justify-items-center gap-3 p-6"><h3 className="text-lg">{map.title}</h3>
      <GalleryImagePicker novel={novel} onPick={image=>{const state=useKachamak.getState();if(state.activeNovelId===novel.id&&state.selectedNodeId===map.id)state.updateNode('maps',map.id,{image});}}>
        <button type="button" className={controls}>Choose map image from Gallery</button>
      </GalleryImagePicker></div>:<div className="min-h-0 flex-1 overflow-auto p-4">
      {entries.length?<ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">{entries.map(n=><li key={n.id}>
        <button className="w-full overflow-hidden rounded border border-border text-left hover:bg-muted" onClick={()=>useKachamak.getState().select(n.id)}>
          {n.image&&<img alt="" className="h-24 w-full object-cover" src={projectImageSrc(novel.gallery,n.image)}/>}
          <span className="block truncate p-2 text-sm">{n.title}</span>
        </button></li>)}</ul>:<p className="text-sm text-muted-foreground">Add a map to this folder and choose its image from the book’s Gallery.</p>}
    </div>}
  </section>;
}
