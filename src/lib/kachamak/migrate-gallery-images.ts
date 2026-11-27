import {migrateProjectMaps} from './project-maps';
import { v5 as namedUuid } from 'uuid';
import type { GalleryEntry } from './gallery';
import type { Homepage } from './homepage';
import type { NoteNode, Novel } from './types';
import { embeddedNoteImages, galleryImageRef, isGalleryImageRef, mapEditorImageRefs, validCoverImage } from './project-image';

function mapChanged<T>(items: T[], transform: (item: T) => T): T[] {
  let result = items;
  items.forEach((item, index) => {
    const next = transform(item);
    if (next !== item) {
      if (result === items) result = items.slice();
      result[index] = next;
    }
  });
  return result;
}


export function migrateBookArtwork(book: Novel): Novel {
  return normalizeArtwork(migrateProjectMaps(book));
}
function normalizeArtwork(book: Novel): Novel {
  const added: GalleryEntry[] = [];
  const byImage = new Map<string, string>();
  const occupied = new Set<string>();
  const canonical = new Map<string, string>();
  const copies = new Map<string, string[]>();
  const remove = new Set<string>();
  for (const entry of book.gallery ?? []) {
    occupied.add(entry.id);
    if (entry.kind !== 'image') continue;
    const ref = galleryImageRef(entry.id);
    const first = byImage.get(entry.image);
    if (first) {
      canonical.set(ref, first);
      const ids = copies.get(first) ?? [];
      ids.push(entry.id);
      copies.set(first, ids);
    } else {
      byImage.set(entry.image, ref);
    }
  }

  function useExisting(ref: string) {
    const retained = canonical.get(ref) ?? ref;
    for (const id of copies.get(retained) ?? []) remove.add(id);
    copies.delete(retained);
    return retained;
  }

  function reference(image: string | undefined, name: string) {
    if (isGalleryImageRef(image)) return useExisting(image);
    if (!image?.startsWith('data:image/') || !validCoverImage(image)) return image;
    const existing = byImage.get(image);
    if (existing) return useExisting(existing);
    // Two windows upgrading the same book must produce the same references.
    const baseId = namedUuid(book.id + '/' + image, namedUuid.URL);
    let id = baseId;
    for (let suffix = 1; occupied.has(id); suffix++) id = baseId + '-' + suffix;
    const ref = galleryImageRef(id);
    added.push({ kind: 'image', id, parentId: null, name: name.trim().slice(0, 255) || 'Image', image });
    byImage.set(image, ref);
    occupied.add(id);
    return ref;
  }

  function noteArtwork(note: NoteNode): NoteNode {
    const image = reference(note.image, note.title);
    // Keep imported rich text self-contained for HTML/Markdown exports.
    for (const embedded of embeddedNoteImages(note)) reference(embedded, note.title);
    const banner = reference(note.event?.banner, note.title);
    const children = note.children && mapChanged(note.children, noteArtwork);
    const content = note.content && mapEditorImageRefs(note.content,useExisting);
    const synopsis = note.synopsis && mapEditorImageRefs(note.synopsis,useExisting);
    const notes = note.notes && mapEditorImageRefs(note.notes,useExisting);
    if (note.image === image && note.event?.banner === banner && children === note.children &&
        content === note.content && synopsis === note.synopsis && notes === note.notes) return note;
    return { ...note, ...(image !== note.image && { image }),
      ...(banner !== note.event?.banner && { event: { ...note.event!, banner } }), children, content, synopsis, notes };
  }

  function pageArtwork<T extends Homepage>(page: T, name: string): T {
    const blocks = mapChanged(page.blocks, block => {
      const image = reference(block.image, block.title || name);
      return image === block.image ? block : { ...block, image };
    });
    const synopsis=page.synopsis&&mapEditorImageRefs(page.synopsis,useExisting);
    const notes=page.notes&&mapEditorImageRefs(page.notes,useExisting);
    return blocks === page.blocks && synopsis === page.synopsis && notes === page.notes ? page : { ...page, blocks, synopsis, notes };
  }

  const coverImage = reference(book.cover?.image, book.title + ' — Cover');
  let sections = book.sections;
  for (const key of Object.keys(sections ?? {}) as (keyof Novel['sections'])[]) {
    const nodes = mapChanged(sections[key], noteArtwork);
    if (nodes !== sections[key]) {
      if (sections === book.sections) sections = { ...sections };
      sections[key] = nodes;
    }
  }
  const homepage = book.homepage && pageArtwork(book.homepage, 'Homepage');
  const homePages = book.homePages && mapChanged(book.homePages, page => pageArtwork(page, page.title));
  const trash = book.trash && mapChanged(book.trash, item => {
    const node = noteArtwork(item.node);
    return node === item.node ? item : { ...item, node };
  });
  if (sections === book.sections && homepage === book.homepage && homePages === book.homePages &&
      trash === book.trash && coverImage === book.cover?.image && !remove.size && !added.length) return book;
  const gallery = remove.size ? book.gallery!.filter(entry => !remove.has(entry.id)) : book.gallery;
  return { ...book, ...((added.length || remove.size) ? { gallery: [...(gallery ?? []), ...added] } : {}),
    ...(coverImage !== book.cover?.image && { cover: { ...book.cover, image: coverImage } }),
    sections, ...(homepage && { homepage }), ...(homePages && { homePages }), ...(trash && { trash }) };
}

export function migrateLibraryArtwork(novels: Novel[]): Novel[] {
  return mapChanged(novels, migrateBookArtwork);
}
