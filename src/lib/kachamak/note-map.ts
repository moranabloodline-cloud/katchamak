import {validAtlas,type MapAtlas} from './canvas-map';
import {isGalleryImageRef} from './project-image';

export type NoteMap =
  | {kind:'map'; mapId:string; pinId?:string}
  | {kind:'canvas'; pageId:string; blockId:string}
  | {kind:'gallery'; image:string; atlas?:MapAtlas};

export function validNoteMap(value:unknown):value is NoteMap|undefined {
  if(value===undefined)return true;
  if(!value||typeof value!=='object')return false;
  const map=value as NoteMap;
  if(map.kind==='map')return typeof map.mapId==='string'&&!!map.mapId&&(map.pinId===undefined||typeof map.pinId==='string'&&!!map.pinId);
  if(map.kind==='canvas')return typeof map.pageId==='string'&&!!map.pageId&&typeof map.blockId==='string'&&!!map.blockId;
  return map.kind==='gallery'&&isGalleryImageRef(map.image)&&(map.atlas===undefined||validAtlas(map.atlas));
}
