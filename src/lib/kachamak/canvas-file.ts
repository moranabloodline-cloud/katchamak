import {type GalleryEntry} from './gallery';
import {type HomeBlock,type Homepage,type HomeTarget,homepageEntry,validHomepage} from './homepage';
import {flattenNotes} from './note-links';
import {availableProjectImage,galleryImageRef,validCoverImage} from './project-image';
import {findProjectMap} from './project-maps';
import {boardRects} from './canvas-board';
import {worldRows,legacyRowLeft} from './canvas-layout';
import type {Novel} from './types';

export interface CanvasFile {
  format:'kachamak-canvas/1';
  projectId:string;
  layout:Homepage;
  images:{ref:string;name:string;data:string}[];
  // Optional live bindings for portraits or illustrations already attached to a note.
  noteImages?:Record<string,string>;
}

export function importCanvasFile(book:Novel,current:Homepage,raw:unknown){
  const file=raw as CanvasFile|null;
  if(!file||file.format!=='kachamak-canvas/1'||file.projectId!==book.id||!file.layout||
    file.layout.mode!=='canvas'||!validHomepage(file.layout)||!Array.isArray(file.images))return null;
  const gallery:GalleryEntry[]=[...(book.gallery??[])],refs=new Map<string,string>();
  const notes=new Map(flattenNotes(book).map(({node})=>[node.id,node]));
  const hasTarget=(t?:HomeTarget)=>!t||t.kind==='note'&&notes.has(t.id)||t.kind==='page'&&!!homepageEntry(book,t.id)||t.kind==='tab'||t.kind==='web';
  function addImage(name:string,data:string){
    const known=gallery.find(e=>e.kind==='image'&&e.image===data);
    if(known)return galleryImageRef(known.id);
    const id=crypto.randomUUID();
    gallery.push({kind:'image',id,name,image:data,parentId:null});
    return galleryImageRef(id);
  }
  for(const entry of file.images){
    if(!entry||typeof entry.ref!=='string'||!entry.ref.startsWith('gallery:')||refs.has(entry.ref)||
      typeof entry.name!=='string'||!entry.name.trim()||typeof entry.data!=='string'||!validCoverImage(entry.data))return null;
    refs.set(entry.ref,addImage(entry.name,entry.data));
  }
  const blocks:HomeBlock[]=[];
  for(const block of file.layout.blocks){
    if(!hasTarget(block.target)||block.links?.some(link=>!hasTarget(link.target)))return null;
    const bound=file.noteImages?.[block.id],note=bound?notes.get(bound):undefined;
    if(bound&&!note)return null;
    let image=note?.image??(block.image&&(refs.get(block.image)??block.image));
    if(image?.startsWith('data:'))image=addImage(note?.title||block.title||'Canvas image',image);
    // Re-importing the original composition keeps annotations edited in Maps.
    if(block.layout==='map'&&image&&!block.mapId){
      const previous=current.blocks.find(item=>item.id===block.id&&item.layout==='map');
      const map=findProjectMap(book,previous?.mapId);
      if(map&&map.image===image){
        const {image:_,atlas,pin,...card}=block;
        blocks.push({...card,mapId:map.id});
        continue;
      }
    }
    blocks.push({...block,image});
  }
  const page:Homepage={...current,mode:'canvas',blocks,locked:file.layout.locked,width:file.layout.width,legacyRowX:file.layout.legacyRowX};
  return validHomepage(page)&&blocks.every(b=>availableProjectImage(gallery,b.image))?{page,gallery}:null;
}

// Open an imported composition at its top edge, with parallel columns in view.
export function canvasOpeningView(page:Homepage,viewportWidth:number){
  const rows=worldRows(page.blocks.filter(b=>b.layout==='row'),page.width==='reading'?736:1160,new Map(),page.legacyRowX??legacyRowLeft);
  const free=boardRects(page.blocks.filter(b=>!b.cell&&b.layout!=='row'),new Map());
  const bounds=[...rows.values(),...free.values()];
  if(!bounds.length)return {level:1,x:20,y:20};
  const left=Math.min(...bounds.map(r=>r.x)),top=Math.min(...bounds.map(r=>r.y)),width=Math.max(...bounds.map(r=>r.x+r.w))-left;
  const maxLevel=page.width==='wide'&&rows.size?3:1;
  const level=Math.min(maxLevel,Math.max(.02,Math.floor((viewportWidth-40)/width*100)/100));
  return {level,x:Math.max(16,(viewportWidth-width*level)/2)-left*level,y:20-top*level};
}
