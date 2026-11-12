'use client';
import { create } from 'zustand';
import TurndownService from 'turndown';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { useKachamak, isUsableBackup, normalizeNovelSections } from './store';
import { useCollections, type Collection } from './collections-store';
import { useLibraryPreferences } from './library-preferences';
import { newNovel } from './seed';
import { SECTION_KEYS, type Novel, type NoteNode } from './types';
import { registerFolderStorage } from './session-storage';
import { directory, readText, writeText, copyFolder, archiveFolder, folderName, type DiskFolder } from './folder-files';

type Handle = DiskFolder & { queryPermission(o: { mode: string }): Promise<PermissionState>; requestPermission(o: { mode: string }): Promise<PermissionState> };
type Root = { id: string; kind: 'collection' | 'project'; handle: Handle; parent: Handle; name: string };
type Location = { id: string; kind: Root['kind']; handle: DiskFolder; parent: DiskFolder; name: string; key: string; rootId: string };
type NoteFile = { path: string; markdown: string };
type Document = { format: string; version: number; storeVersion: number; novel: Novel; webNotes?: Record<string, NoteFile> };
export const useWebLibrary = create<{ ready: boolean; busy: boolean; pending: boolean; error: string | null; reconnect: boolean; supported: boolean }>(() => ({ ready: false, busy: false, pending: false, error: null, reconnect: false, supported: false }));
let roots: Root[] = [], locations = new Map<string, Location>();
let expected = new Map<string, string | null>();
let running: Promise<void> | null = null, initializing: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let applying = false, subscribed = false, savedSnapshot = '';
const initialState = useKachamak.getInitialState();
const snapshot = () => JSON.stringify({ novels: useKachamak.getState().novels, collections: useCollections.getState().collections });
const setError = (error: unknown) => useWebLibrary.setState({ busy: false, pending: true, error: error instanceof Error ? error.message : String(error) });
const accountKey = 'katchamak-local-account';
function account() {
  const raw = localStorage.getItem(accountKey);
  if (raw) { const a = JSON.parse(raw); if (typeof a.id === 'string') return a as { id: string; author: string }; }
  const a = { id: crypto.randomUUID(), author: '' }; localStorage.setItem(accountKey, JSON.stringify(a)); return a;
}
async function registry(write?: Root[]) {
  const a = account();
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('katchamak-folder-locations', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('accounts');
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
  try { return await new Promise<Root[]>((resolve, reject) => {
    const tx = db.transaction('accounts', write ? 'readwrite' : 'readonly');
    const req = write ? tx.objectStore('accounts').put(write, a.id) : tx.objectStore('accounts').get(a.id);
    let result: Root[] = [];
    req.onsuccess = () => { result = write ?? req.result ?? []; };
    tx.oncomplete = () => resolve(result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  }); } finally { db.close(); }
}
function visit(nodes: NoteNode[], action: (node: NoteNode) => void) { for (const n of nodes) { action(n); visit(n.children, action); } }
const noteId = () => crypto.randomUUID();
async function markdownFiles(folder: DiskFolder, prefix = ''): Promise<{ path: string; text: string }[]> {
  const result: { path: string; text: string }[] = [];
  for await (const entry of folder.values()) {
    if (entry.name.startsWith('.')) continue;
    const path = `${prefix}${entry.name}`;
    if (entry.kind === 'directory') result.push(...await markdownFiles(entry, path + '/'));
    else if (/\.md$/i.test(entry.name)) result.push({ path, text: await (await entry.getFile()).text() });
  }
  return result;
}
async function loadProject(loc: Location): Promise<Novel> {
  const raw = await readText(loc.handle, 'project.json');
  const parsed = raw ? JSON.parse(raw) : null;
  const doc: Document = parsed?.format === 'katchamak-project' ? parsed : { novel: parsed, webNotes: {} };
  if (!isUsableBackup(doc.novel)) throw new Error(`Invalid project.json in ${loc.name}. Nothing has been overwritten.`);
  normalizeNovelSections(doc.novel);
  const novel = doc.novel;
  if (novel.id !== loc.id) throw new Error(`Project identity changed in ${loc.name}. Reopen its folder.`);
  expected.set(loc.id + ':project.json', raw);
  const known = new Set<string>();
  for (const nodes of Object.values(novel.sections)) {
    const pending: Promise<void>[] = [];
    visit(nodes, node => {
      const record = doc.webNotes?.[node.id];
      if (record) pending.push((async () => {
        const md = await readText(loc.handle, record.path);
        if (md === null) throw new Error(`Missing note: ${record.path}. Restore the file before saving.`);
        known.add(record.path); expected.set(loc.id + ':' + record.path, md);
        if (md !== record.markdown) node.content = DOMPurify.sanitize(await marked.parse(md));
      })());
    });
    await Promise.all(pending);
  }
  let notes: { path: string; text: string }[] = [];
  try { notes = await markdownFiles(await loc.handle.getDirectoryHandle('Notes'), 'Notes/'); }
  catch (error) { if ((error as Error).name !== 'NotFoundError') throw error; }
  for (const file of notes) if (!known.has(file.path)) {
    const id = noteId(), now = Date.now();
    novel.sections.binder.push({ id, title: file.path.split('/').pop()!.replace(/\.md$/i, ''), kind: 'doc', synopsis: '', notes: '', content: DOMPurify.sanitize(await marked.parse(file.text)), status: '', label: '', createdAt: now, updatedAt: now, children: [] });
    expected.set(loc.id + ':' + file.path, file.text);
    // Record external notes so they are archived after the canonical Markdown copy is saved.
  }
  return novel;
}
async function loadAll() {
  const nextLocations = new Map<string, Location>(), collections: Collection[] = [], novels: Novel[] = [];
  expected = new Map();
  async function scan(loc: Location, parentId: string | null) {
    if (nextLocations.has(loc.id)) throw new Error('The same folder is registered more than once.');
    nextLocations.set(loc.id, loc);
    if (loc.kind === 'project') { novels.push(await loadProject(loc)); if (parentId) collections.find(c => c.id === parentId)!.projectIds.push(loc.id); return; }
    const raw = await readText(loc.handle, '.collection.json');
    const meta = raw ? JSON.parse(raw) : {};
    const collection: Collection = { id: loc.id, name: meta.name ?? loc.name, parentId, projectIds: [], createdAt: meta.createdAt ?? Date.now(), updatedAt: meta.updatedAt ?? Date.now() };
    collections.push(collection); expected.set(loc.id + ':.collection.json', raw);
    for await (const child of loc.handle.values()) {
      if (child.kind !== 'directory' || child.name.startsWith('.')) continue;
      const project = await readText(child, 'project.json');
      const marker = project ? JSON.parse(project) : JSON.parse(await readText(child, '.collection.json') ?? '{}');
      const id = project ? (marker.novel ?? marker).id : marker.id ?? noteId();
      if (typeof id !== 'string') throw new Error(`Invalid folder: ${child.name}`);
      await scan({ id, kind: project ? 'project' : 'collection', handle: child, parent: loc.handle, name: child.name, key: loc.key + '/' + child.name, rootId: loc.rootId }, loc.id);
    }
  }
  for (const root of roots) await scan({ ...root, key: root.id + '/' + root.name, rootId: root.id }, null);
  applying = true;
  try {
    useKachamak.setState({ ...initialState, novels, defaultAuthor: account().author ?? '', activeNovelId: null });
    useCollections.setState({ collections });
    useLibraryPreferences.setState({ selectedCollection: null, expanded: [] });
  } finally { applying = false; }
  locations = nextLocations; savedSnapshot = snapshot();
  useWebLibrary.setState({ ready: true, busy: false, pending: false, error: null, reconnect: false });
}
export async function initializeWebLibrary(reconnect = false) {
  if (initializing) return initializing;
  initializing = (async () => {
    const supported = 'showDirectoryPicker' in window;
    useWebLibrary.setState({ supported, busy: true, error: null });
    if (!supported) { useWebLibrary.setState({ busy: false, ready: false }); return; }
    roots = await registry();
    for (const root of roots) {
      const permission = reconnect ? await root.parent.requestPermission({ mode: 'readwrite' }) : await root.parent.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') { useWebLibrary.setState({ busy: false, reconnect: true, ready: false }); return; }
    }
    await loadAll();
    if (!subscribed) {
      subscribed = true;
      const changed = () => {
        if (applying || !useWebLibrary.getState().ready) return;
        const a = account(); const author = useKachamak.getState().defaultAuthor;
        if (a.author !== author) localStorage.setItem(accountKey, JSON.stringify({ ...a, author }));
        if (snapshot() === savedSnapshot) return;
        useWebLibrary.setState({ pending: true });
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => { timer = null; void flushWebLibrary().catch(setError); }, 500);
      };
      useKachamak.subscribe(changed); useCollections.subscribe(changed);
    }
  })().catch(error => { setError(error); throw error; }).finally(() => { initializing = null; });
  return initializing;
}
async function pickParent(): Promise<Handle> {
  const picker = (window as unknown as { showDirectoryPicker(o: { mode: string }): Promise<Handle> }).showDirectoryPicker;
  if (!picker) throw new Error('Use desktop Chrome or Edge to choose a writable folder.');
  try { return await picker.call(window, { mode: 'readwrite' }); }
  catch (error) { if (['NotAllowedError', 'SecurityError'].includes((error as Error).name)) throw new Error('Folder access was blocked. Open Katchamak directly in a desktop Chrome or Edge tab and allow access to the selected folder.'); throw error; }
}
async function attachRoot(id: string, kind: Root['kind'], title: string, parent?: Handle, novel?: Novel) {
  parent ??= await pickParent();
  const name = folderName(title, id);
  const handle = await parent.getDirectoryHandle(name, { create: true }) as Handle;
  const root: Root = { id, kind, name, handle, parent };
  if (kind === "collection") await writeText(handle, ".collection.json", JSON.stringify({ id, name: title }, null, 2));
  else if (novel) await writeText(handle, "project.json", JSON.stringify({ format: "katchamak-project", version: 1, storeVersion: 7, novel }, null, 2));
  roots = [...roots, root]; await registry(roots);
  return root;
}
export async function createWebCollection(name: string, parentId: string | null) {
  if (!parentId) {
    const id = noteId();
    const root = await attachRoot(id, 'collection', name);
    await writeText(root.handle, '.collection.json', JSON.stringify({ id, name }, null, 2));
    useCollections.setState(s => ({ collections: [...s.collections, { id, name, parentId: null, projectIds: [], createdAt: Date.now(), updatedAt: Date.now() }] }));
    await flushWebLibrary(); return id;
  }
  const id = useCollections.getState().addCollection(name, parentId); await flushWebLibrary(); return id;
}
export async function createWebProject(title: string, author: string, collectionId: string | null) {
  const novel = newNovel(title, author);
  if (!collectionId) await attachRoot(novel.id, 'project', title, undefined, novel);
  applying = true;
  try {
    useKachamak.setState(s => ({ novels: [...s.novels, novel], activeNovelId: novel.id, activeTab: 'binder', selectedNodeId: null, paneAId: null, paneBId: null }));
    if (collectionId) useCollections.getState().setMembership(collectionId, novel.id, true);
  } finally { applying = false; }
  await flushWebLibrary(); return novel.id;
}
/** Pick destination on the Import button's user gesture; import file contents later. */
let importParent: Handle | undefined;
export async function prepareWebImport(collectionId: string | null) { importParent = collectionId ? undefined : await pickParent(); }
export async function importWebProject(json: string, collectionId: string | null) {
  const input = JSON.parse(json); const value = input?.format === 'katchamak-project' ? input.novel : input;
  if (!isUsableBackup(value)) throw new Error('Not a Katchamak project.');
  normalizeNovelSections(value);
  const novel = { ...value, id: noteId() } as Novel;
  if (!collectionId) { if (!importParent) throw new Error('Select a destination folder first.'); await attachRoot(novel.id, 'project', novel.title, importParent, novel); }
  applying = true;
  try {
    useKachamak.setState(s => ({ novels: [...s.novels, novel], activeNovelId: novel.id, selectedNodeId: null }));
    if (collectionId) useCollections.getState().setMembership(collectionId, novel.id, true);
  } finally { applying = false; importParent = undefined; }
  await flushWebLibrary();
}
export async function connectWebFolder() {
  const handle = await pickParent();
  const raw = await readText(handle, 'project.json');
  const meta = raw ? JSON.parse(raw) : JSON.parse(await readText(handle, '.collection.json') ?? '{}');
  const id = raw ? (meta.novel ?? meta).id : meta.id ?? noteId();
  if (roots.some(r => r.id === id) || locations.has(id)) throw new Error('This folder is already in your library.');
  await flushWebLibrary();
  const previous = roots;
  roots = [...roots, { id, kind: raw ? 'project' : 'collection', handle, parent: handle, name: handle.name }];
  try { await loadAll(); await registry(roots); }
  catch (error) { roots = previous; throw error; }
}

export async function flushWebLibrary(): Promise<void> {
  if (!useWebLibrary.getState().ready) throw new Error('Reconnect your library folders first.');
  if (timer) { clearTimeout(timer); timer = null; }
  if (running) { await running; if (snapshot() !== savedSnapshot) return flushWebLibrary(); return; }
  if (snapshot() === savedSnapshot) return;
  running = (async () => { if (navigator.locks) await navigator.locks.request("katchamak-folder-save-" + account().id, saveSnapshot); else await saveSnapshot(); })().catch(error => { setError(error); throw error; }).finally(() => { running = null; });
  await running;
  if (snapshot() !== savedSnapshot) await flushWebLibrary();
}
// Reacquire handles by document ID after Explorer renames a folder. Never reload manuscript data here.
async function refreshFolderLocations() {
  const fresh = new Map<string, Location>();
  async function identity(handle: DiskFolder) {
    const project = await readText(handle, 'project.json');
    const raw = project ?? await readText(handle, '.collection.json');
    if (!raw) return null;
    let meta; try { meta = JSON.parse(raw); } catch { return null; } return { id: project ? (meta.novel ?? meta).id : meta.id, kind: project ? 'project' as const : 'collection' as const };
  }
  async function scan(loc: Location) {
    if (fresh.has(loc.id)) throw new Error('Duplicate project or collection ID on disk.');
    fresh.set(loc.id, loc);
    if (loc.kind === 'project') return;
    for await (const child of loc.handle.values()) {
      if (child.kind !== 'directory' || child.name.startsWith('.')) continue;
      const found = await identity(child);
      if (found && locations.has(found.id)) await scan({ ...found, parent: loc.handle, handle: child, name: child.name, key: loc.key + '/' + child.name, rootId: loc.rootId });
    }
  }
  const refreshed: Root[] = [];
  for (const root of roots) {
    let handle: DiskFolder | undefined;
    if (root.parent === root.handle) {
      if ((await identity(root.handle))?.id === root.id) handle = root.handle;
    } else {
      for await (const child of root.parent.values()) {
        if (child.kind !== 'directory' || child.name.startsWith('.')) continue;
        if ((await identity(child))?.id === root.id) { if (handle) throw new Error('Duplicate project or collection ID on disk.'); handle = child; }
      }
    }
    if (!handle) throw new Error('Project folder is unavailable. Reconnect its drive or locate the folder again.');
    refreshed.push({ ...root, handle: handle as Handle, name: handle.name });
    await scan({ id: root.id, kind: root.kind, handle, parent: root.parent, name: handle.name, key: root.id + '/' + handle.name, rootId: root.id });
  }
  for (const id of locations.keys()) if (!fresh.has(id)) throw new Error('A project folder is missing. Restore it before saving. Current edits are preserved.');
  await registry(refreshed);
  roots = refreshed; locations = fresh;
}
async function saveSnapshot() {
  useWebLibrary.setState({ busy: true, pending: true, error: null });
  await refreshFolderLocations();
  const serialized = snapshot();
  const { novels, collections } = JSON.parse(serialized) as { novels: Novel[]; collections: Collection[] };
  const next = new Map<string, Location>(), nextRoots: Root[] = [];
  const old = locations;
  async function writeOwned(loc: Location, path: string, value: string) {
    await writeText(loc.handle, path, value);
    if (old.get(loc.id)?.key === loc.key) expected.set(loc.id + ':' + path, value);
  }
  const rootFor = (id: string) => roots.find(r => r.id === id);
  function promotedParent(loc: Location): Handle {
    const root = rootFor(loc.rootId);
    if (!root) throw new Error('Choose a folder for this top-level item.');
    return root.parent;
  }
  async function place(id: string, kind: Root['kind'], title: string, parentId: string | null) {
    const previous = old.get(id), root = rootFor(id);
    const parentLoc = parentId ? next.get(parentId) : undefined;
    if (parentId && !parentLoc) throw new Error('Invalid collection hierarchy.');
    if (!parentLoc && !root && !previous) throw new Error('Select a location for the top-level item.');
    const parent = parentLoc?.handle ?? root?.parent ?? promotedParent(previous!);
    // An attached existing folder may not grant access to its parent: keep that root in place.
    const attached = root && root.parent === root.handle;
    const name = previous?.name ?? (attached ? root.name : folderName(title, id));
    const key = parentLoc ? parentLoc.key + '/' + name : id + '/' + name;
    let handle: DiskFolder;
    if (attached && !parentLoc) handle = root.handle;
    else if (previous?.key === key) handle = previous.handle;
    else handle = await parent.getDirectoryHandle(name, { create: true });
    if (previous && previous.key !== key) await copyFolder(previous.handle, handle);
    const loc: Location = { id, kind, parent, handle, name, key, rootId: parentLoc?.rootId ?? id };
    next.set(id, loc);
    if (!parentLoc) nextRoots.push({ id, kind, handle: handle as Handle, parent: parent as Handle, name });
    return loc;
  }
  // Verify external changes before making any modifications.
  for (const [token, text] of expected) {
    const colon = token.indexOf(':'); const id = token.slice(0, colon), path = token.slice(colon + 1);
    const loc = old.get(id);
    if (loc && await readText(loc.handle, path) !== text) throw new Error(`A file was changed outside Katchamak (${loc.name}/${path}). Reopen the library before saving.`);
  }
  const pending = [...collections];
  while (pending.length) {
    const index = pending.findIndex(c => !c.parentId || next.has(c.parentId));
    if (index < 0) throw new Error('Collection hierarchy contains a cycle.');
    const c = pending.splice(index, 1)[0];
    const loc = await place(c.id, 'collection', c.name, c.parentId);
    await writeOwned(loc, '.collection.json', JSON.stringify({ id: c.id, name: c.name, createdAt: c.createdAt, updatedAt: c.updatedAt }, null, 2));
  }
  const converter = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  for (const novel of novels) {
    const memberships = collections.filter(c => c.projectIds.includes(novel.id));
    if (memberships.length > 1) throw new Error('A project folder can belong to one collection. Move it to a single collection first.');
    const loc = await place(novel.id, 'project', novel.title, memberships[0]?.id ?? null);
    const webNotes: Record<string, NoteFile> = {};
    for (const section of SECTION_KEYS) visit(novel.sections[section], node => {
      webNotes[node.id] = { path: `Notes/${section}/${folderName(node.title, node.id)}.md`, markdown: converter.turndown(node.content) + '\n' };
    });
    const prior = await readText(loc.handle, 'project.json');
    if (prior) await writeText(loc.handle, 'project.json.bak', prior);
    for (const record of Object.values(webNotes)) await writeOwned(loc, record.path, record.markdown);
    await directory(loc.handle, 'Files', true);
    await writeOwned(loc, 'project.json', JSON.stringify({ format: 'katchamak-project', version: 1, storeVersion: 7, novel, webNotes }, null, 2));
    // Retired note files are recoverable, not silently re-imported on the next load.
    const active = new Set(Object.values(webNotes).map(n => n.path));
    for (const [token, text] of expected) if (token.startsWith(novel.id + ':Notes/') && !active.has(token.slice(novel.id.length + 1)) && text !== null) {
      const path = token.slice(novel.id.length + 1);
      await writeText(loc.handle, `.katchamak-history/${Date.now()}/${path}`, text);
      const parts = path.split('/'); const name = parts.pop()!;
      await (await directory(loc.handle, parts.join('/'))).removeEntry(name);
      expected.delete(token);
    }
  }
  await registry(nextRoots);
  // Copy succeeded and the location registry is durable before retiring old folders.
  const obsolete = [...old.values()].filter(loc => !next.has(loc.id) || next.get(loc.id)!.key !== loc.key);
  for (const loc of obsolete.filter(loc => !obsolete.some(parent => parent.id !== loc.id && loc.key.startsWith(parent.key + '/')))) {
    if (loc.parent === loc.handle) continue; // Never delete a folder whose parent was not selected.
    await archiveFolder(loc.parent, loc.name);
  }
  roots = nextRoots; locations = next; expected = new Map();
  for (const loc of locations.values()) {
    const path = loc.kind === 'project' ? 'project.json' : '.collection.json';
    const raw = await readText(loc.handle, path); expected.set(loc.id + ':' + path, raw);
    if (loc.kind === 'project' && raw) for (const record of Object.values((JSON.parse(raw) as Document).webNotes ?? {})) expected.set(loc.id + ':' + record.path, record.markdown);
  }
  savedSnapshot = serialized;
  useWebLibrary.setState({ busy: false, pending: snapshot() !== savedSnapshot, error: null });
}
export async function reloadWebLibrary() { if (snapshot() !== savedSnapshot && !useWebLibrary.getState().error) await flushWebLibrary(); await loadAll(); }
export async function projectAttachments() {
  const loc = locations.get(useKachamak.getState().activeNovelId ?? '');
  if (!loc) return [];
  const folder = await directory(loc.handle, 'Files', true);
  const files: { name: string; file: File }[] = [];
  for await (const entry of folder.values()) if (entry.kind === 'file') files.push({ name: entry.name, file: await entry.getFile() });
  return files;
}
export async function addProjectAttachment(file: File) {
  const loc = locations.get(useKachamak.getState().activeNovelId ?? '');
  if (!loc) throw new Error('Save the project folder first.');
  const folder = await directory(loc.handle, 'Files', true);
  let name = file.name;
  try { await folder.getFileHandle(name); name = `${Date.now()}-${name}`; } catch (error) { if ((error as Error).name !== 'NotFoundError') throw error; }
  const stream = await (await folder.getFileHandle(name, { create: true })).createWritable();
  try { await stream.write(file); await stream.close(); } catch (error) { await stream.abort?.(); throw error; }
}
registerFolderStorage(() => useWebLibrary.getState().ready && !useWebLibrary.getState().pending && !useWebLibrary.getState().error && snapshot() === savedSnapshot, flushWebLibrary);
