import {demoLibraryApi} from './demo-projects.mjs';
import {validCloudLibrary} from '../src/lib/kachamak/cloud-write-validation.mjs';
import { measuredQuery } from './request-trace.mjs';
export {validCloudLibrary} from '../src/lib/kachamak/cloud-write-validation.mjs';
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
    const readSnapshot = async () => {
      if (!record?.snapshot_key) return { novels: [], collections: [] };
      const read = () => env.BUCKET.get(record.snapshot_key);
      const object = await (measure ? measure('r2.readSnapshot', read) : read());
      if (!object) throw new Error('The saved library could not be read. Please retry.');
      return JSON.parse(await object.text());
    };
    if (request.method !== 'GET') {
      if (request.headers.get('Origin') !== url.origin) return json({ error: 'Invalid request origin.' }, 403);
    }
    const writeSnapshot=async(value,baseRevision)=>{
      await q('INSERT INTO cloud_libraries (account_id, revision, updated_at) VALUES (?, 0, 0) ON CONFLICT(account_id) DO NOTHING', id).run();
      const key = prefix + 'library/' + Date.now() + '-' + crypto.randomUUID() + '.json';
      const write = () => env.BUCKET.put(key, JSON.stringify(value), { httpMetadata: { contentType: 'application/json' } });
      await (measure ? measure('r2.writeSnapshot', write) : write());
      const updatedAt = Date.now();
      const result = await q('UPDATE cloud_libraries SET snapshot_key = ?, revision = revision + 1, updated_at = ? WHERE account_id = ? AND revision = ?', key, updatedAt, id, baseRevision).run();
      if (result.meta.changes !== 1) { await env.BUCKET.delete(key); return null; }
      return {revision:baseRevision+1,updatedAt};
    };
    if(url.pathname==='/api/library/demo'||url.pathname.startsWith('/api/library/demo/'))return await demoLibraryApi({request,env,account,prefix,revision,readSnapshot,writeSnapshot,json});
    if (url.pathname === '/api/library') {
      if (request.method === 'GET') {
        // Account checks above still run; an unchanged revision needs no R2 read or manuscript transfer.
        if (url.searchParams.get('revision') === String(revision)) return json({ revision, unchanged: true, updatedAt: record?.updated_at ?? 0 });
        return json({ revision, snapshot: await readSnapshot(), updatedAt: record?.updated_at ?? 0 });
      }
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'JSON required.' }, 415);
      const text = await request.text();
      if (new TextEncoder().encode(text).length > 20 * 1024 * 1024) return json({ error: 'Library exceeds the 20 MB save limit. Export a backup before making further edits.' }, 413);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON.' }, 400); }
      if (!Number.isSafeInteger(body.revision) || body.revision < 0 || !validCloudLibrary(body.snapshot)) return json({ error: 'Invalid library. Existing data was preserved.' }, 400);
      if (body.revision !== revision) return json({ error: 'Another window saved newer changes. Export your unsaved edits, then reload the library.', conflict: true }, 409);
      const saved=await writeSnapshot(body.snapshot,body.revision);
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
