import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Window } from 'happy-dom';
const dom = new Window({ url: 'https://kachamak.test' });
globalThis.window = dom; globalThis.document = dom.document; globalThis.DOMParser = dom.DOMParser;
globalThis.localStorage = dom.localStorage;
let identity = 'user-a';
globalThis.fetch = async () => identity ? Response.json({ id: identity, email: identity + '@test.local' }) : Response.json({}, { status: 401 });
const records = new Map();
// IndexedDB stores opaque handles; this adapter keeps the test's native disk handles usable.
globalThis.indexedDB = { open() {
  const req = {};
  req.result = { createObjectStore() {}, close() {}, transaction() {
    const tx = { objectStore: () => ({
      get(key) { const r = {}; queueMicrotask(() => { r.result = records.get(key); r.onsuccess?.(); tx.oncomplete?.(); }); return r; },
      put(value, key) { const r = {}; queueMicrotask(() => { records.set(key, [...value]); r.onsuccess?.(); tx.oncomplete?.(); }); return r; },
    }) }; return tx;
  } };
  queueMicrotask(() => { req.onupgradeneeded?.(); req.onsuccess?.(); }); return req;
} };
let permit = true, failWrite = false, pickCount = 0, failParentScan = false;
const notFound = () => new DOMException('Missing', 'NotFoundError');
class Folder {
  kind = 'directory';
  constructor(p) { this.p = p; this.name = path.basename(p); }
  async queryPermission() { return permit ? 'granted' : 'prompt'; }
  async requestPermission() { permit = true; return 'granted'; }
  async *values() { if (failParentScan && this.p === a) throw new DOMException('Cannot enumerate unrelated folders', 'NotAllowedError'); for (const d of await fs.readdir(this.p, { withFileTypes: true })) yield d.isDirectory() ? new Folder(path.join(this.p, d.name)) : new DiskFile(path.join(this.p, d.name)); }
  async getDirectoryHandle(name, { create = false } = {}) { const p = path.join(this.p, name); if (create) await fs.mkdir(p, { recursive: true }); try { if (!(await fs.stat(p)).isDirectory()) throw new Error('not directory'); } catch { throw notFound(); } return new Folder(p); }
  async getFileHandle(name, { create = false } = {}) { const p = path.join(this.p, name); try { await fs.access(p); } catch { if (!create) throw notFound(); await fs.writeFile(p, ''); } return new DiskFile(p); }
  async removeEntry(name, { recursive = false } = {}) { await fs.rm(path.join(this.p, name), { recursive }); }
}
class DiskFile {
  kind = 'file';
  constructor(p) { this.p = p; this.name = path.basename(p); }
  async getFile() { return new File([await fs.readFile(this.p)], this.name); }
  async createWritable() { if (!permit) throw new DOMException('Folder access expired', 'NotAllowedError'); let data; return { write: async value => { if (failWrite && this.name.endsWith('.md')) { failWrite = false; throw new Error('Disk temporarily unavailable'); } data = typeof value === 'string' ? value : Buffer.from(await value.arrayBuffer()); }, close: async () => fs.writeFile(this.p, data), abort: async () => {} }; }
}
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'katchamak-folders-'));
const a = path.join(temp, 'drive-a'), b = path.join(temp, 'drive-b'); await fs.mkdir(a); await fs.mkdir(b);
let picked = a;
window.showDirectoryPicker = async () => { pickCount++; return new Folder(picked); };
const web = await import('../src/lib/kachamak/web-library.ts');
const { useKachamak } = await import('../src/lib/kachamak/store.ts');
const { useCollections } = await import('../src/lib/kachamak/collections-store.ts');
await web.initializeWebLibrary();
assert.equal(useKachamak.getState().novels.length, 0);
failParentScan = true;
const first = await web.createWebCollection('Books', null);
failParentScan = false;
assert.ok(useCollections.getState().collections.some(c => c.id === first), 'new collection is visible without scanning unrelated sibling folders');
picked = b;
const second = await web.createWebCollection('Games', null);
assert.equal(pickCount, 2, 'each top-level collection asks for its own location');
const nested = await web.createWebCollection('Fantasy', first);
const novelId = await web.createWebProject('My book', 'Author', nested);
assert.equal(pickCount, 2, 'nested collections and projects do not ask again');
const noteId = useKachamak.getState().addNode('binder', null, 'doc', 'Opening');
useKachamak.getState().updateNode('binder', noteId, { content: '<h2>First scene</h2><p>A <strong>brave</strong> beginning.</p>' });
await web.flushWebLibrary();
async function findFile(dir, name) { for (const item of await fs.readdir(dir, { withFileTypes: true })) { if (item.name.startsWith('.')) continue; const p = path.join(dir, item.name); if (item.isDirectory()) { const found = await findFile(p, name); if (found) return found; } else if (name(item.name)) return p; } }
let projectPath = await findFile(a, n => n === 'project.json');
assert.ok(projectPath); assert.equal(await findFile(b, n => n === 'project.json'), undefined);
let mdPath = await findFile(a, n => n.endsWith('.md'));
assert.match(await fs.readFile(mdPath, 'utf8'), /## First scene/);
assert.match(await fs.readFile(mdPath, 'utf8'), /\*\*brave\*\*/);
await web.addProjectAttachment(new File(['attachment bytes'], 'map.txt'));
assert.equal((await web.projectAttachments())[0].name, 'map.txt');
assert.equal(localStorage.getItem('kachamak-store-v1'), null, 'browser stores no manuscripts');
assert.equal(localStorage.getItem('kachamak-collections-v1'), null, 'browser stores no collection contents');
for (const roots of records.values()) for (const root of roots) assert.deepEqual(Object.keys(root).sort(), ['handle','id','kind','name','parent'], 'registry contains only location references');
await fs.writeFile(mdPath, '# Changed outside\n\nRead from disk.\n');
await web.reloadWebLibrary();
let novel = useKachamak.getState().novels.find(n => n.id === novelId);
assert.match(novel.sections.binder[0].content, /Read from disk/);
assert.equal(pickCount, 2, 'reopening uses remembered locations');
useKachamak.getState().openNovel(novelId);
useKachamak.getState().updateNode('binder', noteId, { content: '<p>Unsaved recovery text.</p>' });
failWrite = true;
await assert.rejects(web.flushWebLibrary(), /temporarily unavailable/);
assert.equal(web.useWebLibrary.getState().pending, true);
await web.flushWebLibrary();
assert.equal(web.useWebLibrary.getState().pending, false);
// A permission revoked while the editor is open must be recoverable without reload.
useKachamak.getState().updateNode('binder', noteId, { content: '<p>Keep this unsaved text.</p>' });
permit = false;
await assert.rejects(web.flushWebLibrary(), /Folder access expired/);
await web.saveWebLibrary();
assert.equal(web.useWebLibrary.getState().error, null);
assert.match(await fs.readFile(mdPath, 'utf8'), /Keep this unsaved text/);
assert.equal(pickCount, 2, 'Save renews permission without choosing another folder');
// Explorer folder names are independent of titles; reacquire stale handles by ID.
const oldFolder = path.dirname(await findFile(a, n => n === 'project.json'));
const renamedFolder = path.join(path.dirname(oldFolder), 'Renamed in Explorer');
await fs.rename(oldFolder, renamedFolder);
useKachamak.getState().updateNode('binder', noteId, { content: '<p>Saved after external rename.</p>' });
await web.flushWebLibrary();
assert.match(await fs.readFile(path.join(renamedFolder, 'project.json'), 'utf8'), /Saved after external rename/);
assert.equal(await fs.stat(renamedFolder).then(s => s.isDirectory()), true);
const parentFolder = path.dirname(renamedFolder);
const customParent = path.join(path.dirname(parentFolder), 'Morana custom folder');
await fs.rename(parentFolder, customParent);
useKachamak.getState().updateNode('binder', noteId, { content: '<p>Saved after collection rename.</p>' });
await web.flushWebLibrary();
assert.match(await fs.readFile(path.join(customParent, 'Renamed in Explorer', 'project.json'), 'utf8'), /Saved after collection rename/);
useCollections.getState().moveProject(novelId, second, nested);
await web.flushWebLibrary();
projectPath = await findFile(b, n => n === 'project.json');
assert.ok(projectPath, 'project moved to the other selected drive');
assert.equal(await findFile(a, n => n === 'project.json'), undefined, 'old live project folder retired');
assert.equal(await fs.readFile(path.join(path.dirname(projectPath), 'Files', 'map.txt'), 'utf8'), 'attachment bytes', 'attachments survive moving');
useCollections.getState().removeCollection(second);
await web.flushWebLibrary();
await web.reloadWebLibrary();
assert.ok(useKachamak.getState().novels.some(n => n.id === novelId), 'removing collection promotes projects without loss');
assert.equal(pickCount, 2, 'promotion does not ask for another location');
permit = false; await web.initializeWebLibrary();
assert.equal(web.useWebLibrary.getState().reconnect, true);
await web.initializeWebLibrary(true);
assert.equal(web.useWebLibrary.getState().ready, true);
assert.equal(pickCount, 2, 'permission renewal does not reselect locations');
// An external edit must never be overwritten by a stale open tab.
useKachamak.getState().openNovel(novelId);
const liveProject = await findFile(b, n => n === 'project.json');
const liveMd = await findFile(path.dirname(liveProject), n => n.endsWith('.md'));
await fs.writeFile(liveMd, 'External author update.\n');
useKachamak.getState().updateNode('binder', noteId, { content: '<p>Competing in-app edit.</p>' });
await assert.rejects(web.flushWebLibrary(), /changed outside/);
assert.equal(await fs.readFile(liveMd, 'utf8'), 'External author update.\n');
assert.match(useKachamak.getState().novels.find(n => n.id === novelId).sections.binder[0].content, /Competing/, 'unsaved edit remains available for backup');
// Explicit reload resolves this test conflict by reading the disk version.
await web.reloadWebLibrary();
assert.match(useKachamak.getState().novels.find(n => n.id === novelId).sections.binder[0].content, /External author update/);
window.showDirectoryPicker = async () => { throw new DOMException('Cancelled', 'AbortError'); };
const beforeCancel = JSON.stringify(useCollections.getState().collections);
await assert.rejects(web.createWebCollection('Cancelled', null), /Cancelled/);
assert.equal(JSON.stringify(useCollections.getState().collections), beforeCancel);
// Switching signed-in users must not inherit another user's local directory grants.
identity = 'user-b';
await web.initializeWebLibrary();
assert.equal(useKachamak.getState().novels.length, 0);
assert.equal(useCollections.getState().collections.length, 0);
identity = 'user-a';
await web.initializeWebLibrary();
assert.ok(useKachamak.getState().novels.some(n => n.id === novelId));
identity = null;
await assert.rejects(web.initializeWebLibrary(), /Sign in/);
assert.equal(web.useWebLibrary.getState().ready, false, 'signed-out users cannot open the library');
await fs.rm(temp, { recursive: true, force: true });
console.log('Folder library: separate roots, nested folders, Markdown, attachments, disk reload, failure retry, moves, removal, privacy and permission renewal passed.');
