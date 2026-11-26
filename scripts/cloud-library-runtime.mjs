import {demoLibraryApi} from './demo-projects.mjs';
import {validCloudLibrary} from '../src/lib/kachamak/cloud-write-validation.mjs';
import {applyLibraryNotePatch, validLibraryNotePatch} from '../src/lib/kachamak/cloud-note-patch.mjs';
import { measuredQuery } from './request-trace.mjs';
export {validCloudLibrary} from '../src/lib/kachamak/cloud-write-validation.mjs';

const librarySaveLimit = 20 * 1024 * 1024;
const libraryGzipType = 'application/vnd.katchamak.snapshot+gzip';
const libraryNotePatchType = 'application/vnd.katchamak.notes+json';
const validNoteWriteId = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value);
class LibrarySizeError extends Error {}

async function readLibraryBytes(stream, limit = librarySaveLimit) {
  if (!stream) return new ArrayBuffer(0);
  const reader = stream.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        // Cancellation can also fail when the connection has already closed.
        await reader.cancel().catch(() => {});
        throw new LibrarySizeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Blob(chunks).arrayBuffer();
}

async function compressLibrarySnapshot(raw) {
  if (raw.size < 256 * 1024) return;
  try {
    const compressed = await new Response(raw.stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    if (compressed.byteLength < raw.size) return compressed;
  } catch {
    // A valid save can still use the uncompressed storage format.
  }
}

// Included in the Sites Worker with accountApi; all keys are private to the authenticated account.
export async function cloudLibraryApi(request, env, measure) {
  const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
  try {
    const url = new URL(request.url);
    const gate = await accountApi(new Request(new URL('/api/account', url), { headers: request.headers }), env, measure);
    if (!gate.ok) return gate;
    if (!env.BUCKET) return json({ error: 'Cloud storage is unavailable.' }, 503);
    const account = await gate.json();
    const { id } = account;
    const expected=request.headers.get('X-Katchamak-Account');
    if((expected&&expected!==id)||(request.method!=='GET'&&!expected))return json({error:'Your signed-in account changed. Reopen the library before saving.',accountChanged:true},409);
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id)))].map(b => b.toString(16).padStart(2, '0')).join('');
    const prefix = `accounts/${hash}/`;
    const q = (sql, ...args) => measuredQuery(env.DB, sql, args, measure);
    const record = await q('SELECT * FROM cloud_libraries WHERE account_id = ?', id).first();
    const revision = record?.revision ?? 0;
    const previousWriteId = record?.snapshot_key?.match(/-note-([0-9a-f-]{36})\.json(?:\.gz)?$/)?.[1];
    const readSnapshot = async () => {
      if (!record?.snapshot_key) return { novels: [], collections: [] };
      const read = () => env.BUCKET.get(record.snapshot_key);
      const object = await (measure ? measure('r2.readSnapshot', read) : read());
      if (!object) throw new Error('The saved library could not be read. Please retry.');
      if (record.snapshot_key.endsWith('.json.gz')) {
        const bytes = await readLibraryBytes(object.body.pipeThrough(new DecompressionStream('gzip')));
        return JSON.parse(new TextDecoder().decode(bytes));
      }
      return JSON.parse(await object.text());
    };
    if (request.method !== 'GET') {
      if (request.headers.get('Origin') !== url.origin) return json({ error: 'Invalid request origin.' }, 403);
    }
    const writeSnapshot=async(value,baseRevision,compressed,writeId)=>{
      if (!record) {
        await q('INSERT INTO cloud_libraries (account_id, revision, updated_at) VALUES (?, 0, 0) ON CONFLICT(account_id) DO NOTHING', id).run();
      }
      const key = prefix + 'library/' + Date.now() + '-' + crypto.randomUUID() + (writeId ? '-note-' + writeId : '') + (compressed ? '.json.gz' : '.json');
      const httpMetadata = compressed ? { contentType: 'application/json', contentEncoding: 'gzip' } : { contentType: 'application/json' };
      const write = () => env.BUCKET.put(key, compressed ?? (typeof value === 'string' ? value : JSON.stringify(value)), { httpMetadata });
      await (measure ? measure('r2.writeSnapshot', write) : write());
      const updatedAt = Date.now();
      const result = await q('UPDATE cloud_libraries SET snapshot_key = ?, revision = revision + 1, updated_at = ? WHERE account_id = ? AND revision = ?', key, updatedAt, id, baseRevision).run();
      if (result.meta.changes !== 1) { await env.BUCKET.delete(key); return null; }
      return {revision:baseRevision+1,updatedAt,...(writeId ? {writeId} : {})};
    };
    if(url.pathname==='/api/library/demo'||url.pathname.startsWith('/api/library/demo/'))return await demoLibraryApi({request,env,account,prefix,revision,readSnapshot,writeSnapshot,json});
    if (url.pathname === '/api/library') {
      if (request.method === 'GET') {
        const knownRevision = url.searchParams.get('revision');
        const state = { revision, updatedAt: record?.updated_at ?? 0, ...(previousWriteId ? { writeId: previousWriteId } : {}) };
        // A lost response can be acknowledged directly from the committed revision pointer.
        if (previousWriteId && knownRevision === String(revision - 1) && url.searchParams.get('writeId') === previousWriteId) {
          return json({ ...state, confirmedWrite: true });
        }
        if (knownRevision === String(revision)) return json({ ...state, unchanged: true });
        return json({ ...state, snapshot: await readSnapshot() });
      }
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      const contentType = request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
      const noteSave = contentType === libraryNotePatchType;
      if (contentType !== 'application/json' && contentType !== libraryGzipType && !noteSave) return json({ error: 'Unsupported library encoding.' }, 415);
      const invalidLibrary = () => json({ error: 'Invalid library. Existing data was preserved.' }, 400);
      const libraryTooLarge = () => json({ error: 'Library exceeds the 20 MB save limit. Export a backup before making further edits.' }, 413);
      let wireBytes;
      try {
        wireBytes = await readLibraryBytes(request.body);
      } catch (error) {
        if (error instanceof LibrarySizeError) return libraryTooLarge();
        throw error;
      }
      let body;
      let compressed;
      try {
        if (contentType === libraryGzipType) {
          const header = request.headers.get('X-Katchamak-Revision') ?? '';
          const baseRevision = Number(header);
          if (!/^\d+$/.test(header) || !Number.isSafeInteger(baseRevision)) return invalidLibrary();
          const overhead = JSON.stringify({ revision: baseRevision, snapshot: null }).length - 4;
          const decoded = new Blob([wireBytes]).stream().pipeThrough(new DecompressionStream('gzip'));
          const bytes = await readLibraryBytes(decoded, librarySaveLimit - overhead);
          body = { revision: baseRevision, snapshot: JSON.parse(new TextDecoder().decode(bytes)) };
          if (wireBytes.byteLength < bytes.byteLength) compressed = wireBytes;
        } else {
          body = JSON.parse(new TextDecoder().decode(wireBytes));
        }
      } catch (error) {
        if (error instanceof LibrarySizeError) return libraryTooLarge();
        return json({ error: 'Invalid library data.' }, 400);
      }
      if (!Number.isSafeInteger(body?.revision) || body.revision < 0) return invalidLibrary();
      if (noteSave ? !validNoteWriteId(body.writeId) || !validLibraryNotePatch(body.notePatch) : !validCloudLibrary(body.snapshot)) return invalidLibrary();
      if (body.revision !== revision) return json({ error: 'Another window saved newer changes. Export your unsaved edits, then reload the library.', conflict: true }, 409);
      let value = body.snapshot;
      if (noteSave) {
        value = applyLibraryNotePatch(await readSnapshot(), body.notePatch);
        if (!value) return json({ error: 'These note changes require a full library save.', notePatchUnsupported: true }, 422);
        for (const field of ['view', 'navigation', 'location']) {
          if (Object.hasOwn(body, field)) value[field] = body[field];
        }
        if (!validCloudLibrary(value)) return invalidLibrary();
        const serialized = JSON.stringify(value);
        const raw = new Blob([serialized]);
        const overhead = JSON.stringify({ revision, snapshot: null }).length - 4;
        if (raw.size + overhead > librarySaveLimit) return libraryTooLarge();
        compressed = await compressLibrarySnapshot(raw);
        value = serialized;
      }
      const saved = await writeSnapshot(value, body.revision, compressed, noteSave ? body.writeId : undefined);
      return saved?json(saved):json({error:'Another window saved newer changes. Export your edits before reloading.',conflict:true},409);
    }
    const match = url.pathname.match(/^\/api\/library\/files\/([a-zA-Z0-9_-]{1,128})(?:\/([a-zA-Z0-9_-]{1,128}))?$/);
    if (!match) return json({ error: 'Not found.' }, 404);
    const [, projectId, fileId] = match;
    if (!(await readSnapshot()).novels.some(n => n.id === projectId)) return json({ error: 'Project not found.' }, 404);
    const filePrefix = prefix + 'files/' + projectId + '/';
    if (request.method === 'GET' && fileId) {
      const object = await env.BUCKET.get(filePrefix + fileId);
      if (!object) return json({ error: 'File not found.' }, 404);
      return new Response(await object.arrayBuffer(), { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(object.customMetadata?.name || 'attachment')}`, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
    }
    if (request.method === 'GET') {
      const files = []; let cursor;
      do { const page = await env.BUCKET.list({ prefix: filePrefix, include: ['customMetadata'], cursor }); files.push(...page.objects.map(o => ({ id: o.key.slice(filePrefix.length), name: o.customMetadata?.name || 'attachment', size: o.size }))); cursor = page.truncated ? page.cursor : undefined; } while (cursor);
      return json({ files });
    }
    if (request.method === 'POST' && !fileId) {
      const data = await request.formData(); const file = data.get('file');
      if (!file || typeof file === 'string' || file.size > 20 * 1024 * 1024) return json({ error: 'Choose a file up to 20 MB.' }, 400);
      const attachmentId = crypto.randomUUID();
      await env.BUCKET.put(filePrefix + attachmentId, await file.arrayBuffer(), { customMetadata: { name: file.name.slice(0, 255) } });
      return json({ id: attachmentId });
    }
    return json({ error: 'Method not allowed.' }, 405);
  } catch (error) { console.error('Cloud library request failed', error); return json({ error: 'Cloud storage could not complete this request. Your previous save is preserved. Retry saving.' }, 503); }
}
