import {validCoverImage} from './project-image';

type Item = {id:string; name:string; parentId:string|null};
export type GalleryEntry = Item & ({kind:'folder'} | {kind:'image'; image:string});
export type GalleryChange =
  | {type:'add'; entries:GalleryEntry[]}
  | {type:'rename'; id:string; name:string}
  | {type:'move'; id:string; parentId:string|null}
  | {type:'remove'; id:string};

export function validGallery(value:unknown):value is GalleryEntry[]|undefined {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  const folders = new Map<string,string|null>();
  const ids = new Set<string>();
  for (const entry of value) {
    if (!entry || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id) ||
        typeof entry.name !== 'string' || !entry.name.trim() || entry.name.length > 255 ||
        (entry.parentId !== null && typeof entry.parentId !== 'string')) return false;
    ids.add(entry.id);
    if (entry.kind === 'folder') folders.set(entry.id,entry.parentId);
    else if (entry.kind !== 'image' || typeof entry.image !== 'string' || !validCoverImage(entry.image)) return false;
  }
  if (value.some(item => item.parentId !== null && !folders.has(item.parentId))) return false;
  const verified = new Set<string>();
  for (const id of folders.keys()) {
    const path = new Set<string>();
    let current:string|null = id;
    while (current !== null && !verified.has(current)) {
      if (path.has(current)) return false;
      path.add(current);
      current = folders.get(current)!;
    }
    for (const ancestor of path) verified.add(ancestor);
  }
  return true;
}

export function galleryPath(entries:GalleryEntry[], id:string|null):GalleryEntry[] {
  const byId = new Map(entries.map(entry => [entry.id,entry]));
  const path:GalleryEntry[] = [];
  let folder = id ? byId.get(id) : undefined;
  while (folder?.kind === 'folder') {
    path.push(folder);
    folder = folder.parentId ? byId.get(folder.parentId) : undefined;
  }
  return path.reverse();
}

export function changeGallery(entries:GalleryEntry[], change:GalleryChange):GalleryEntry[] {
  if (change.type === 'add') {
    if (!change.entries.length) return entries;
    const result = [...entries,...change.entries];
    if (!validGallery(result)) throw new Error('The destination or image is no longer available.');
    return result;
  }
  const item = entries.find(entry => entry.id === change.id);
  if (!item) throw new Error('This item is no longer in the gallery.');
  if (change.type === 'remove') {
    if (entries.some(entry => entry.parentId === item.id)) throw new Error('Move the contents out of this folder first.');
    return entries.filter(entry => entry !== item);
  }
  if (change.type === 'rename') {
    const name = change.name.trim();
    if (!name || name.length > 255) throw new Error('Enter a name of up to 255 characters.');
    return entries.map(entry => entry === item ? {...entry,name} : entry);
  }
  if (change.parentId !== null && (!entries.some(entry => entry.id === change.parentId && entry.kind === 'folder') ||
      galleryPath(entries,change.parentId).some(ancestor => ancestor.id === item.id))) {
    throw new Error('Choose a folder outside this branch.');
  }
  return entries.map(entry => entry === item ? {...entry,parentId:change.parentId} : entry);
}
