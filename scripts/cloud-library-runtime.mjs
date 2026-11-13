// Included in the Sites Worker with accountApi; all keys are private to the authenticated account.
export function validCloudLibrary(value) {
  if (!value || !Array.isArray(value.novels) || !Array.isArray(value.collections)) return false;
  const ids = new Set(), collections = new Map();
  const validId = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(id);
  const visit = (nodes, seen, depth = 0) => Array.isArray(nodes) && depth < 100 && nodes.every(n => n && validId(n.id) && !seen.has(n.id) && (seen.add(n.id), typeof n.title === 'string' && typeof n.content === 'string' && visit(n.children, seen, depth + 1)));
  for (const n of value.novels) {
    if (!n || !validId(n.id) || ids.has(n.id) || typeof n.title !== 'string' || typeof n.author !== 'string' || !n.sections) return false;
    ids.add(n.id);
    const seen = new Set();
    for (const key of ['binder','codex','planning','research','templates','prompts']) if (!visit(n.sections[key], seen)) return false;
  }
  for (const c of value.collections) {
    if (!c || !validId(c.id) || collections.has(c.id) || typeof c.name !== 'string' || !c.name.trim() || !Array.isArray(c.projectIds) || !c.projectIds.every(id => ids.has(id))) return false;
    collections.set(c.id, c);
  }
  for (const c of value.collections) {
    const seen = new Set([c.id]); let parent = c.parentId;
    while (parent !== null) { if (seen.has(parent) || !collections.has(parent)) return false; seen.add(parent); parent = collections.get(parent).parentId; }
  }
  return true;
}

export async function cloudLibraryApi(request, env) {
  const json = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
  try {
    const url = new URL(request.url);
    const gate = await accountApi(new Request(new URL('/api/account', url), { headers: request.headers }), env);
    if (!gate.ok) return gate;
    if (!env.BUCKET) return json({ error: 'Cloud storage is unavailable.' }, 503);
    const { id } = await gate.json();
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id)))].map(b => b.toString(16).padStart(2, '0')).join('');
    const prefix = `accounts/${hash}/`;
    const q = (sql, ...args) => env.DB.prepare(sql).bind(...args);
    const record = await q('SELECT * FROM cloud_libraries WHERE account_id = ?', id).first();
    const revision = record?.revision ?? 0;
    const readSnapshot = async () => {
      if (!record?.snapshot_key) return { novels: [], collections: [] };
      const object = await env.BUCKET.get(record.snapshot_key);
      if (!object) throw new Error('The saved library could not be read. Please retry.');
      return JSON.parse(await object.text());
    };
    if (request.method !== 'GET') {
      if (request.headers.get('Origin') !== url.origin) return json({ error: 'Invalid request origin.' }, 403);
    }
    if (url.pathname === '/api/library') {
      if (request.method === 'GET') return json({ revision, snapshot: await readSnapshot(), updatedAt: record?.updated_at ?? 0 });
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'JSON required.' }, 415);
      const text = await request.text();
      if (new TextEncoder().encode(text).length > 20 * 1024 * 1024) return json({ error: 'Library exceeds the 20 MB save limit. Export a backup before making further edits.' }, 413);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON.' }, 400); }
      if (!Number.isSafeInteger(body.revision) || body.revision < 0 || !validCloudLibrary(body.snapshot)) return json({ error: 'Invalid library. Existing data was preserved.' }, 400);
      if (body.revision !== revision) return json({ error: 'Another window saved newer changes. Export your unsaved edits, then reload the library.', conflict: true }, 409);
      await q('INSERT INTO cloud_libraries (account_id, revision, updated_at) VALUES (?, 0, 0) ON CONFLICT(account_id) DO NOTHING', id).run();
      const key = prefix + 'library/' + Date.now() + '-' + crypto.randomUUID() + '.json';
      await env.BUCKET.put(key, JSON.stringify(body.snapshot), { httpMetadata: { contentType: 'application/json' } });
      const updatedAt = Date.now();
      const result = await q('UPDATE cloud_libraries SET snapshot_key = ?, revision = revision + 1, updated_at = ? WHERE account_id = ? AND revision = ?', key, updatedAt, id, body.revision).run();
      if (result.meta.changes !== 1) { await env.BUCKET.delete(key); return json({ error: 'Another window saved newer changes. Export your edits before reloading.', conflict: true }, 409); }
      return json({ revision: body.revision + 1, updatedAt });
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
