import type {Novel, NoteNode} from './types';
import type {GalleryEntry} from './gallery';

export type GalleryImage = Extract<GalleryEntry,{kind:'image'}>;
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

export const editorImageAttribute = 'data-draftopus-image';
const editorImages = 'img['+editorImageAttribute+']';

// Parse a fragment inertly, and only when the document has an inline gallery reference.
function editorImageTemplate(html: string) {
  if (!html.includes(editorImageAttribute+'=') || typeof document === 'undefined') return;
  const template = document.createElement('template');
  template.innerHTML = html;
  return template;
}

export function mapEditorImageRefs(html:string, map:(ref:string)=>string|undefined):string {
  const template=editorImageTemplate(html);
  if(!template)return html;
  let changed=false;
  for(const img of template.content.querySelectorAll(editorImages)){
    const ref=img.getAttribute(editorImageAttribute);
    if(!isGalleryImageRef(ref))continue;
    const next=map(ref);
    if(next && next!==ref){img.setAttribute(editorImageAttribute,next);changed=true;}
  }
  return changed?template.innerHTML:html;
}

export function paintEditorImages(root:ParentNode, gallery:GalleryEntry[]|undefined, source=(asset:GalleryImage)=>asset.image) {
  for(const img of root.querySelectorAll<HTMLImageElement>(editorImages)){
    const asset=galleryImage(gallery,img.getAttribute(editorImageAttribute)??undefined);
    if(!asset){img.removeAttribute('src');continue;}
    const url=source(asset);
    if(img.getAttribute('src')!==url)img.setAttribute('src',url);
  }
}

/** Keep stored HTML free of transient browser URLs and duplicate asset bytes. */
export function storedEditorHtml(html:string) {
  const template=editorImageTemplate(html);
  if(!template)return html;
  let changed=false;
  for(const img of template.content.querySelectorAll(editorImages+'[src]')){
    img.removeAttribute('src');
    changed=true;
  }
  return changed?template.innerHTML:html;
}

export function portableEditorHtml(html:string,gallery:GalleryEntry[]|undefined) {
  const template=editorImageTemplate(html);
  if(!template)return html;
  paintEditorImages(template.content,gallery);
  return template.innerHTML;
}

function* editorImageRefs(html?:string) {
  const template=html&&editorImageTemplate(html);
  if(!template)return;
  for(const img of template.content.querySelectorAll(editorImages)){
    const ref=img.getAttribute(editorImageAttribute);
    if(isGalleryImageRef(ref))yield ref;
  }
}

// Older pasted/imported HTML can already contain self-contained images. Read it
// in an inert template so inspecting a manuscript never loads an external URL.
export function* embeddedNoteImages(note: NoteNode) {
  for (const html of [note.content, note.synopsis, note.notes]) {
    if (!html?.includes('data:image/') || !/<img\b/i.test(html) || typeof document === 'undefined') continue;
    const template = document.createElement('template');
    template.innerHTML = html;
    for (const img of template.content.querySelectorAll('img[src]')) {
      const src = img.getAttribute('src');
      if (src && validCoverImage(src)) yield src;
    }
  }
}

// Include the trash so restoring a note also restores its artwork.
export function* projectImageRefs(book:Novel, includeEmbedded = false) {
  let embeddedRefs: Map<string, string> | undefined;
  if(isGalleryImageRef(book.cover?.image))yield book.cover.image;
  for(const page of [book.homepage,...(book.homePages??[])]) {
    for(const block of page?.blocks??[])if(isGalleryImageRef(block.image))yield block.image;
    yield* editorImageRefs(page?.synopsis);
    yield* editorImageRefs(page?.notes);
  }
  const stack:NoteNode[][]=[...Object.values(book.sections??{}),(book.trash??[]).map(item=>item.node)];
  while(stack.length) {
    for(const note of stack.pop()!) {
      for(const html of [note.content,note.synopsis,note.notes])yield* editorImageRefs(html);
      if (includeEmbedded) for (const image of embeddedNoteImages(note)) {
        if (!embeddedRefs) embeddedRefs = new Map((book.gallery ?? []).flatMap(entry =>
          entry.kind === 'image' ? [[entry.image, galleryImageRef(entry.id)] as const] : []));
        const ref = embeddedRefs.get(image);
        if (ref) yield ref;
      }
      if(isGalleryImageRef(note.bookStyle?.chapterImage))yield note.bookStyle.chapterImage;
      if(isGalleryImageRef(note.image))yield note.image;
      if(note.noteMap?.kind==='gallery')yield note.noteMap.image;
      for (const column of note.kanban?.columns ?? []) {
        for (const card of column.cards) if (isGalleryImageRef(card.cover)) yield card.cover;
      }
      const banner=note.event?.banner;
      if(isGalleryImageRef(banner))yield banner;
      if(note.children?.length)stack.push(note.children);
    }
  }
}
