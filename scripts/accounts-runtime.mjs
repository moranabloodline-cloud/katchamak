const accountJson = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
export async function accountApi(request, env) {
  const url = new URL(request.url), id = request.headers.get('oai-authenticated-user-id');
  const email = (request.headers.get('oai-authenticated-user-email') ?? '').trim().toLowerCase();
  if (!id || !email) return accountJson({ error: 'Sign in required' }, 401);
  if (!env.DB) return accountJson({ error: 'Account storage is unavailable' }, 503);
  const admin = Boolean(env.KATCHAMAK_ADMIN_EMAIL && email === env.KATCHAMAK_ADMIN_EMAIL.trim().toLowerCase());
  const db = env.DB, now = Date.now();
  const q = (sql, ...values) => db.prepare(sql).bind(...values);
  // Idempotent migration also covers an existing Sites D1 binding on first use.
  await q("CREATE TABLE IF NOT EXISTS account_access (email TEXT PRIMARY KEY NOT NULL,display_name TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'active',source TEXT NOT NULL DEFAULT 'manual',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,updated_by TEXT NOT NULL)").run();
  await q('INSERT INTO accounts (id,email,created_at,last_seen) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,last_seen=excluded.last_seen', id,email,now,now).run();
  const user = await q('SELECT * FROM accounts WHERE id=?', id).first();
  const access = await q('SELECT status FROM account_access WHERE email=?',email).first();
  if (!admin && (user.status !== 'active'||access?.status==='suspended')) return accountJson({ error: 'Your account is suspended. Contact support.' }, 403);
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
  if (route === '/api/admin/licenses' && method === 'GET') {
    const search=(url.searchParams.get('search')??'').slice(0,254),offset=Math.max(0,Math.min(1000000,Math.floor(Number(url.searchParams.get('offset'))||0)));
    const rows=await q('SELECT email,plan,expires_at,updated_at FROM licenses WHERE email LIKE ? ORDER BY updated_at DESC,email LIMIT 51 OFFSET ?','%'+search+'%',offset).all();
    return accountJson({licenses:rows.results.slice(0,50),hasMore:rows.results.length>50});
  }
  if (route === '/api/admin/users' && method === 'GET') {
    let invitations=[];
    try{invitations=JSON.parse(env.KATCHAMAK_INVITED_USERS||'[]');}catch{/* Keep registered users available if the import is misconfigured. */}
    if(Array.isArray(invitations))for(const invited of invitations.slice(0,1000)){
      const invitedEmail=typeof invited?.email==='string'?invited.email.trim().toLowerCase():'';
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitedEmail)||invitedEmail.length>254)continue;
      await q("INSERT INTO account_access (email,display_name,status,source,created_at,updated_at,updated_by) VALUES (?,?,'active','sites',?,?,?) ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name,source='sites'",invitedEmail,typeof invited.name==='string'?invited.name.slice(0,100):'',now,now,id).run();
    }
    const search = (url.searchParams.get('search') ?? '').slice(0,100), offset = Math.max(0, Math.min(1000000, Number(url.searchParams.get('offset')) || 0));
    const rows = await q("SELECT * FROM (SELECT a.id,a.email,a.display_name,COALESCE(x.status,a.status) AS status,a.created_at,a.last_seen,l.plan,l.expires_at,COALESCE(x.source,'account') AS source FROM accounts a LEFT JOIN licenses l ON l.email=a.email LEFT JOIN account_access x ON x.email=a.email UNION ALL SELECT NULL AS id,l.email,COALESCE(x.display_name,'') AS display_name,COALESCE(x.status,'pending') AS status,l.updated_at AS created_at,NULL AS last_seen,l.plan,l.expires_at,COALESCE(x.source,'license') AS source FROM licenses l LEFT JOIN account_access x ON x.email=l.email WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.email=l.email) UNION ALL SELECT NULL AS id,x.email,x.display_name,x.status,x.created_at,NULL AS last_seen,NULL AS plan,NULL AS expires_at,x.source FROM account_access x WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.email=x.email) AND NOT EXISTS (SELECT 1 FROM licenses l WHERE l.email=x.email)) WHERE email LIKE ? OR display_name LIKE ? ORDER BY created_at DESC,email,id LIMIT 51 OFFSET ?", '%'+search+'%','%'+search+'%',offset).all();
    return accountJson({ users: rows.results.slice(0,50).map(u => ({ ...u, role: u.email === env.KATCHAMAK_ADMIN_EMAIL.trim().toLowerCase() ? 'admin' : 'member' })), hasMore: rows.results.length > 50 });
  }
  if (route === '/api/admin/license' && method === 'POST') {
    const target = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target) || target.length > 254 || !['none','lifetime','timed'].includes(body.plan)) return accountJson({ error: 'Valid email and license type required' }, 400);
    if (target === env.KATCHAMAK_ADMIN_EMAIL.trim().toLowerCase()) return accountJson({ error: 'The owner license cannot be changed' }, 400);
    const expires = body.plan === 'timed' ? Number(body.expiresAt) : null;
    if (body.plan === 'timed' && (!Number.isSafeInteger(expires) || expires <= now)) return accountJson({ error: 'Choose a future expiry date' }, 400);
    await db.batch([q('INSERT INTO licenses (email,plan,expires_at,updated_at,updated_by) VALUES (?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET plan=excluded.plan,expires_at=excluded.expires_at,updated_at=excluded.updated_at,updated_by=excluded.updated_by', target,body.plan,expires,now,id), audit(target,'license',{ plan: body.plan, expiresAt: expires })]);
    const license = await q('SELECT email,plan,expires_at FROM licenses WHERE email=?',target).first();
    const registered = Boolean(await q('SELECT id FROM accounts WHERE email=?',target).first());
    return accountJson({ ok: true, license, registered });
  }
  if (route === '/api/admin/status' && method === 'POST') {
    const target = typeof body.email==='string'?await q("SELECT email FROM (SELECT email FROM accounts UNION SELECT email FROM licenses UNION SELECT email FROM account_access) WHERE email=?",body.email.trim().toLowerCase()).first():await q('SELECT id,email FROM accounts WHERE id=?',typeof body.id === 'string' ? body.id : '').first();
    if (!target || !['active','suspended'].includes(body.status)) return accountJson({ error: 'Invalid user or status' }, 400);
    if (target.email === env.KATCHAMAK_ADMIN_EMAIL.trim().toLowerCase() || target.id === id) return accountJson({ error: 'The owner cannot be suspended' }, 400);
    await db.batch([q("INSERT INTO account_access (email,status,source,created_at,updated_at,updated_by) VALUES (?,?,'manual',?,?,?) ON CONFLICT(email) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at,updated_by=excluded.updated_by",target.email,body.status,now,now,id),q('UPDATE accounts SET status=? WHERE email=?',body.status,target.email),audit(target.email,'status',{ status:body.status })]);
    return accountJson({ ok: true });
  }
  if (route === '/api/admin/send-access-link' && method === 'POST') {
    const target=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    const license=await q('SELECT plan,expires_at FROM licenses WHERE email=?',target).first();
    if(!license||license.plan==='none'||license.expires_at!==null&&license.expires_at<=now)return accountJson({error:'Assign an active license before sending an access link.'},400);
    const blocked=await q("SELECT email FROM account_access WHERE email=? AND status='suspended' UNION SELECT email FROM accounts WHERE email=? AND status='suspended'",target,target).first();
    if(blocked)return accountJson({error:'Restore this account before sending an access link.'},400);
    if(!env.RESEND_API_KEY||!env.KATCHAMAK_MAIL_FROM)return accountJson({error:'Email sending is not configured. Set RESEND_API_KEY and KATCHAMAK_MAIL_FROM in Sites settings, then publish.'},503);
    if(typeof body.requestId!=='string'||!/^[a-zA-Z0-9-]{16,100}$/.test(body.requestId))return accountJson({error:'A valid send request is required.'},400);
    const link=url.origin+'/#library';
    let sent;
    try{
      const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'katchamak-access-'+body.requestId},body:JSON.stringify({from:env.KATCHAMAK_MAIL_FROM,to:[target],subject:'Your Katchamak access link',text:'Your Katchamak license is ready.\n\nOpen your private library: '+link+'\n\nSign in with the ChatGPT account for '+target+'. Your projects are private to your account. This link does not sign anyone in or share any manuscript.'}),signal:AbortSignal.timeout(15000)});
      sent=await response.json();if(!response.ok||typeof sent.id!=='string')return accountJson({error:'The email provider did not accept the message. Check your Resend key and verified sender address.'},502);
    }catch{return accountJson({error:'Could not confirm email sending. Retry this same request to avoid sending a duplicate.'},502);}
    await audit(target,'access-link',{providerId:sent.id}).run();
    return accountJson({ok:true,email:target,providerId:sent.id,link});
  }
  if (route === '/api/admin/audit' && method === 'GET') return accountJson({ events: (await q('SELECT * FROM account_audit ORDER BY created_at DESC LIMIT 50').all()).results });
  return accountJson({ error: 'Not found' }, 404);
}
