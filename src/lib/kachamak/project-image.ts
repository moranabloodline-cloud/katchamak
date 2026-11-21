import type {Novel, NoteNode} from './types';
import type {GalleryEntry} from './gallery';

type GalleryImage = Extract<GalleryEntry,{kind:'image'}>;
type GalleryImageRef = `gallery:${string}`;
export const galleryImageRef = (id:string):GalleryImageRef => `gallery:${id}`;
export const isGalleryImageRef = (value:unknown):value is GalleryImageRef => typeof value==='string' && value.startsWith('gallery:') && value.length>8;

export function validCoverImage(value:unknown) {
  return value===undefined||typeof value==='string'&&value.length<=700_000&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value);
}
export const validProjectImage = (value:unknown) => validCoverImage(value) || isGalleryImageRef(value);

const indexes=new WeakMap<GalleryEntry[],Map<string,GalleryImage>>();
export function galleryImage(gallery:GalleryEntry[]|undefined, ref:string|undefined) {
  if(!gallery || !isGalleryImageRef(ref))return undefined;
  let index=indexes.get(gallery);
  if(!index) {
    index=new Map(gallery.filter((item):item is GalleryImage=>item.kind==='image').map(item=>[galleryImageRef(item.id),item]));
    indexes.set(gallery,index);
  }
  return index.get(ref);
}
export function projectImageSrc(gallery:GalleryEntry[]|undefined, value:string|undefined) {
  return isGalleryImageRef(value) ? galleryImage(gallery,value)?.image : value;
}
export function availableProjectImage(gallery:GalleryEntry[]|undefined, value:string|undefined) {
  return !isGalleryImageRef(value) || !!galleryImage(gallery,value);
}

// Include the trash so restoring a note also restores its artwork.
export function* projectImageRefs(book:Novel) {
  if(isGalleryImageRef(book.cover?.image))yield book.cover.image;
  for(const page of [book.homepage,...(book.homePages??[])]) {
    for(const block of page?.blocks??[])if(isGalleryImageRef(block.image))yield block.image;
  }
  const stack:NoteNode[][]=[...Object.values(book.sections??{}),(book.trash??[]).map(item=>item.node)];
  while(stack.length) {
    for(const note of stack.pop()!) {
      if(isGalleryImageRef(note.image))yield note.image;
      const banner=note.event?.banner;
      if(isGalleryImageRef(banner))yield banner;
      if(note.children?.length)stack.push(note.children);
    }
  }
}
