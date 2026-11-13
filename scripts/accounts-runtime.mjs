const accountJson = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
export async function accountApi(request, env) {
  const url = new URL(request.url), id = request.headers.get('oai-authenticated-user-id');
  const email = (request.headers.get('oai-authenticated-user-email') ?? '').trim().toLowerCase();
  if (!id || !email) return accountJson({ error: 'Sign in required' }, 401);
  if (!env.DB) return accountJson({ error: 'Account storage is unavailable' }, 503);
  const admin = Boolean(env.KATCHAMAK_ADMIN_EMAIL && email === env.KATCHAMAK_ADMIN_EMAIL.trim().toLowerCase());
  const db = env.DB, now = Date.now();
  const q = (sql, ...values) => db.prepare(sql).bind(...values);
  await q('INSERT INTO accounts (id,email,created_at,last_seen) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,last_seen=excluded.last_seen', id,email,now,now).run();
  const user = await q('SELECT * FROM accounts WHERE id=?', id).first();
  if (!admin && user.status !== 'active') return accountJson({ error: 'Your account is suspended. Contact support.' }, 403);
  const route = url.pathname, method = request.method;
  if (route.startsWith('/api/admin') && !admin) return accountJson({ error: 'Admin access required' }, 403);
  if (!['GET','POST','PATCH'].includes(method)) return accountJson({ error: 'Method not allowed' }, 405);
  if (method !== 'GET' && (request.headers.get('Origin') !== url.origin || !(request.headers.get('Content-Type') ?? '').startsWith('application/json'))) return accountJson({ error: 'Invalid request origin or content type' }, 403);
  let body = {};
  if (method !== 'GET') { try { const text = await request.text(); if (text.length > 220000) return accountJson({ error: 'Request too large' }, 413); body = JSON.parse(text); } catch { return accountJson({ error: 'Invalid JSON' }, 400); } }
  const audit = (target, action, detail) => q('INSERT INTO account_audit (id,actor,target,action,detail,created_at) VALUES (?,?,?,?,?,?)', crypto.randomUUID(), id, target, action, JSON.stringify(detail), now);
  if (route === '/api/account' && method === 'GET') {
    const license = await q('SELECT plan,expires_at,updated_at FROM licenses WHERE email=?',email).first();
    return accountJson({ id, email, role: admin ? 'admin' : 'member', displayName: user.display_name, avatar: user.avatar, preferences: JSON.parse(user.preferences), license: admin ? { plan: 'lifetime', active: true } : license ? { ...license, active: license.plan !== 'none' && (license.expires_at === null || license.expires_at > now) } : { plan: 'none', active: false } });
  }
  if (route === '/api/account' && method === 'PATCH') {
    if (Object.keys(body).some(k => !['displayName','avatar','preferences'].includes(k))) return accountJson({ error: 'Profile fields only' }, 400);
    const name = body.displayName ?? user.display_name, avatar = body.avatar ?? user.avatar;
    if (typeof name !== 'string' || name.length > 100 || typeof avatar !== 'string' || avatar.length > 200000 || (avatar && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar))) return accountJson({ error: 'Invalid profile or avatar (maximum 150 KB)' }, 400);
    const prefs = body.preferences ?? JSON.parse(user.preferences);
    if (!prefs || typeof prefs !== 'object' || Array.isArray(prefs) || Object.entries(prefs).some(([key,value]) => !['tips','updates','changelog','lightTheme','smallInterface','largeInterface'].includes(key) || typeof value !== 'boolean')) return accountJson({ error: 'Invalid notification preferences' }, 400);
    await q('UPDATE accounts SET display_name=?,avatar=?,preferences=? WHERE id=?',name.trim(),avatar,JSON.stringify(prefs),id).run();
    return accountJson({ ok: true });
  }
  if (route === '/api/admin/users' && method === 'GET') {
    const search = (url.searchParams.get('search') ?? '').slice(0,100), offset = Math.max(0, Math.min(1000000, Number(url.searchParams.get('offset')) || 0));
    const rows = await q('SELECT a.id,a.email,a.display_name,a.status,a.created_at,a.last_seen,l.plan,l.expires_at FROM accounts a LEFT JOIN licenses l ON l.email=a.email WHERE a.email LIKE ? OR a.display_name LIKE ? ORDER BY a.created_at DESC,a.id LIMIT 51 OFFSET ?', '%'+search+'%','%'+search+'%',offset).all();
    return accountJson({ users: rows.results.slice(0,50).map(u => ({ ...u, role: u.email === env.KATCHAMAK_ADMIN_EMAIL.trim().toLowerCase() ? 'admin' : 'member' })), hasMore: rows.results.length > 50 });
  }
  if (route === '/api/admin/license' && method === 'POST') {
    const target = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target) || target.length > 254 || !['none','lifetime','timed'].includes(body.plan)) return accountJson({ error: 'Valid email and license type required' }, 400);
    if (target === env.KATCHAMAK_ADMIN_EMAIL.trim().toLowerCase()) return accountJson({ error: 'The owner license cannot be changed' }, 400);
    const expires = body.plan === 'timed' ? Number(body.expiresAt) : null;
    if (body.plan === 'timed' && (!Number.isSafeInteger(expires) || expires <= now)) return accountJson({ error: 'Choose a future expiry date' }, 400);
    await db.batch([q('INSERT INTO licenses (email,plan,expires_at,updated_at,updated_by) VALUES (?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET plan=excluded.plan,expires_at=excluded.expires_at,updated_at=excluded.updated_at,updated_by=excluded.updated_by', target,body.plan,expires,now,id), audit(target,'license',{ plan: body.plan, expiresAt: expires })]);
    return accountJson({ ok: true });
  }
  if (route === '/api/admin/status' && method === 'POST') {
    const target = await q('SELECT id,email FROM accounts WHERE id=?',typeof body.id === 'string' ? body.id : '').first();
    if (!target || !['active','suspended'].includes(body.status)) return accountJson({ error: 'Invalid user or status' }, 400);
    if (target.email === env.KATCHAMAK_ADMIN_EMAIL.trim().toLowerCase() || target.id === id) return accountJson({ error: 'The owner cannot be suspended' }, 400);
    await db.batch([q('UPDATE accounts SET status=? WHERE id=?',body.status,target.id),audit(target.id,'status',{ status:body.status })]);
    return accountJson({ ok: true });
  }
  if (route === '/api/admin/audit' && method === 'GET') return accountJson({ events: (await q('SELECT * FROM account_audit ORDER BY created_at DESC LIMIT 50').all()).results });
  return accountJson({ error: 'Not found' }, 404);
}
