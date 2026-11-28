import { measuredQuery, measuredBatch } from './request-trace.mjs';
import membershipMigration from '../drizzle/0006_membership_purchases.sql' with { type: 'text' };
const accountJson = (data, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } });
export async function accountApi(request, env, measure) {
  const url = new URL(request.url), id = request.headers.get('oai-authenticated-user-id');
  const email = (request.headers.get('oai-authenticated-user-email') ?? '').trim().toLowerCase();
  if (!id || !email) return accountJson({ error: 'Sign in required' }, 401);
  if (!env.DB) return accountJson({ error: 'Account storage is unavailable' }, 503);
  const admin = Boolean(env.KATCHAMAK_ADMIN_EMAIL && email === env.KATCHAMAK_ADMIN_EMAIL.trim().toLowerCase());
  const db = env.DB, now = Date.now();
  const q = (sql, ...values) => measuredQuery(db, sql, values, measure);
  // The D1 migrations provision account_access and its indexes before serving requests.
  const readUser = () => q('SELECT a.*,x.status AS access_status,l.plan AS license_plan,l.expires_at AS license_expires_at,l.updated_at AS license_updated_at FROM accounts a LEFT JOIN account_access x ON x.email=? LEFT JOIN licenses l ON l.email=? WHERE a.id=?', email,email,id).first();
  let user = await readUser();
  if (!user || user.email !== email || user.last_seen < now - 60000) {
    await q('INSERT INTO accounts (id,email,created_at,last_seen) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,last_seen=excluded.last_seen', id,email,now,now).run();
    if (!user) user = await readUser();
  }
  if (!admin && (user.status !== 'active'||user.access_status==='suspended')) return accountJson({ error: 'Your account is suspended. Contact support.' }, 403);
  const route = url.pathname, method = request.method;
  if (route.startsWith('/api/admin') && !admin) return accountJson({ error: 'Admin access required' }, 403);
  if (!['GET','POST','PATCH'].includes(method)) return accountJson({ error: 'Method not allowed' }, 405);
  if (method !== 'GET' && (request.headers.get('Origin') !== url.origin || !(request.headers.get('Content-Type') ?? '').startsWith('application/json'))) return accountJson({ error: 'Invalid request origin or content type' }, 403);
  let body = {};
  if (method !== 'GET') { try { const text = await request.text(); if (text.length > 220000) return accountJson({ error: 'Request too large' }, 413); body = JSON.parse(text); } catch { return accountJson({ error: 'Invalid JSON' }, 400); } }
  const audit = (target, action, detail) => q('INSERT INTO account_audit (id,actor,target,action,detail,created_at) VALUES (?,?,?,?,?,?)', crypto.randomUUID(), id, target, action, JSON.stringify(detail), now);
  if (route.startsWith('/api/admin/gmail/')) return gmailConnection(request, env, {q,id,body,audit});
  if (route === '/api/account' && method === 'GET') {
    const license = user.license_plan === null ? null : {plan:user.license_plan,expires_at:user.license_expires_at,updated_at:user.license_updated_at};
    const active = !!license && license.plan !== 'none' && (license.expires_at === null || license.expires_at > now);
    const account = { id, email, role: admin ? 'admin' : 'member', displayName: user.display_name, avatar: user.avatar, preferences: JSON.parse(user.preferences), librarySaveEncoding: 'gzip', libraryNotePatch: 1, license: admin ? { plan: 'lifetime', active: true } : license ? { ...license, active } : { plan: 'none', active: false } };
    if (url.searchParams.get('include') === 'membership') {
      // Existing grants are projected directly into the new model. A pending
      // invite stays attached to its original email until its first sign-in.
      const readPurchase = () => q('SELECT edition, founder_number, status, purchased_at, amount_minor, currency, license_id FROM membership_purchases WHERE account_id=?',id).first();
      let purchase;
      try { purchase = await readPurchase(); }
      catch (error) {
        if (!/no such table:\s*(?:main\.)?membership_purchases\b/i.test(String(error))) throw error;
        await q(membershipMigration).run();
        purchase = await readPurchase();
      }
      const state = license?.plan === 'none' ? 'revoked' : active ? 'active' : license ? 'expired' : 'none';
      const membership = purchase && (purchase.status === 'refunded' || license?.plan === 'lifetime')
        ? {
          edition: purchase.edition, status: purchase.status === 'refunded' ? 'refunded' : state,
          plan: 'lifetime', expiresAt: license?.expires_at ?? null, founderNumber: purchase.founder_number,
          purchase: { date: purchase.purchased_at, amountMinor: purchase.amount_minor, currency: purchase.currency, licenseId: purchase.license_id },
        }
        : admin
          ? { edition: 'administrator', status: 'active', plan: 'lifetime', expiresAt: null }
          : { edition: license ? 'manual' : 'none', status: state, plan: license?.plan ?? 'none', expiresAt: license?.expires_at ?? null };
      return accountJson({ membership });
    }
    return accountJson(account);
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
    const imported = new Map();
    if(Array.isArray(invitations))for(const invited of invitations.slice(0,1000)){
      const invitedEmail=typeof invited?.email==='string'?invited.email.trim().toLowerCase():'';
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitedEmail)||invitedEmail.length>254)continue;
      imported.set(invitedEmail,{email:invitedEmail,name:typeof invited.name==='string'?invited.name.slice(0,100):''});
    }
    // One set-based statement, independent of the invitation count. Never reset status.
    if(imported.size)await q("INSERT INTO account_access (email,display_name,status,source,created_at,updated_at,updated_by) SELECT json_extract(value,'$.email'),json_extract(value,'$.name'),'active','sites',?,?,? FROM json_each(?) WHERE 1 ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name,source='sites' WHERE account_access.display_name<>excluded.display_name OR account_access.source<>'sites'",now,now,id,JSON.stringify([...imported.values()])).run();
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
    await measuredBatch(db,[q('INSERT INTO licenses (email,plan,expires_at,updated_at,updated_by) VALUES (?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET plan=excluded.plan,expires_at=excluded.expires_at,updated_at=excluded.updated_at,updated_by=excluded.updated_by', target,body.plan,expires,now,id), audit(target,'license',{ plan: body.plan, expiresAt: expires })],measure);
    const license = await q('SELECT email,plan,expires_at FROM licenses WHERE email=?',target).first();
    const registered = Boolean(await q('SELECT id FROM accounts WHERE email=?',target).first());
    return accountJson({ ok: true, license, registered });
  }
  if (route === '/api/admin/status' && method === 'POST') {
    const target = typeof body.email==='string'?await q("SELECT email FROM (SELECT email FROM accounts UNION SELECT email FROM licenses UNION SELECT email FROM account_access) WHERE email=?",body.email.trim().toLowerCase()).first():await q('SELECT id,email FROM accounts WHERE id=?',typeof body.id === 'string' ? body.id : '').first();
    if (!target || !['active','suspended'].includes(body.status)) return accountJson({ error: 'Invalid user or status' }, 400);
    if (target.email === env.KATCHAMAK_ADMIN_EMAIL.trim().toLowerCase() || target.id === id) return accountJson({ error: 'The owner cannot be suspended' }, 400);
    await measuredBatch(db,[q("INSERT INTO account_access (email,status,source,created_at,updated_at,updated_by) VALUES (?,?,'manual',?,?,?) ON CONFLICT(email) DO UPDATE SET status=excluded.status,updated_at=excluded.updated_at,updated_by=excluded.updated_by",target.email,body.status,now,now,id),q('UPDATE accounts SET status=? WHERE email=?',body.status,target.email),audit(target.email,'status',{ status:body.status })],measure);
    return accountJson({ ok: true });
  }
  if (route === '/api/admin/send-access-link' && method === 'POST') {
    const target=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    if(!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(target)||target.length>254)return accountJson({error:'A valid recipient email is required.'},400);
    const license=await q('SELECT plan,expires_at FROM licenses WHERE email=?',target).first();
    if(!license||license.plan==='none'||license.expires_at!==null&&license.expires_at<=now)return accountJson({error:'Assign an active license before sending an access link.'},400);
    const blocked=await q("SELECT email FROM account_access WHERE email=? AND status='suspended' UNION SELECT email FROM accounts WHERE email=? AND status='suspended'",target,target).first();
    if(blocked)return accountJson({error:'Restore this account before sending an access link.'},400);
    if(env.KATCHAMAK_GMAIL_CLIENT_ID) return gmailAccessLink(env,{q,audit,target,body,link:url.origin+'/#library'});
    if(!env.RESEND_API_KEY||!env.KATCHAMAK_MAIL_FROM)return accountJson({error:'Email sending is not configured. Set RESEND_API_KEY and KATCHAMAK_MAIL_FROM in Sites settings, then publish.'},503);
    if(typeof body.requestId!=='string'||!/^[a-zA-Z0-9-]{16,100}$/.test(body.requestId))return accountJson({error:'A valid send request is required.'},400);
    const link=url.origin+'/#library';
    let sent;
    try{
      const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'katchamak-access-'+body.requestId},body:JSON.stringify({from:env.KATCHAMAK_MAIL_FROM,to:[target],subject:'Your Draftopus access link',text:'Your Draftopus license is ready.\n\nOpen your private library: '+link+'\n\nSign in with the ChatGPT account for '+target+'. Your projects are private to your account. This link does not sign anyone in or share any manuscript.'}),signal:AbortSignal.timeout(15000)});
      sent=await response.json();if(!response.ok||typeof sent.id!=='string')return accountJson({error:'The email provider did not accept the message. Check your Resend key and verified sender address.'},502);
    }catch{return accountJson({error:'Could not confirm email sending. Retry this same request to avoid sending a duplicate.'},502);}
    await audit(target,'access-link',{providerId:sent.id}).run();
    return accountJson({ok:true,email:target,providerId:sent.id,link});
  }
  if (route === '/api/admin/audit' && method === 'GET') return accountJson({ events: (await q('SELECT * FROM account_audit ORDER BY created_at DESC LIMIT 50').all()).results });
  return accountJson({ error: 'Not found' }, 404);
}

// Sender credentials never enter a library snapshot, client bundle or API response.
const gmailScope='https://www.googleapis.com/auth/gmail.send';
const gmailBase64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const gmailBytes=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function gmailKey(env){return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.KATCHAMAK_GMAIL_CLIENT_SECRET)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
async function gmailSeal(env,text){const iv=crypto.getRandomValues(new Uint8Array(12));return gmailBase64(iv)+'.'+gmailBase64(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await gmailKey(env),new TextEncoder().encode(text))));}
async function gmailOpen(env,text){const [iv,data]=text.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:gmailBytes(iv)},await gmailKey(env),gmailBytes(data)));}
async function gmailTables(q){
  await q('CREATE TABLE IF NOT EXISTS admin_mail_oauth (state TEXT PRIMARY KEY,actor TEXT NOT NULL,verifier TEXT NOT NULL,expires_at INTEGER NOT NULL)').run();
  await q('CREATE TABLE IF NOT EXISTS admin_mail_connection (provider TEXT PRIMARY KEY,email TEXT NOT NULL,token TEXT NOT NULL,updated_at INTEGER NOT NULL)').run();
  await q('CREATE TABLE IF NOT EXISTS admin_mail_sends (request_id TEXT PRIMARY KEY,email TEXT NOT NULL,status TEXT NOT NULL,provider_id TEXT,created_at INTEGER NOT NULL)').run();
}
const gmailChanged=result=>(result.meta?.changes??result.changes??0)>0;
const gmailFetch=(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(15000)});
function gmailPage(ok){return new Response('<!doctype html><html><head><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width"><title>Draftopus email</title></head><body style="background:#151515;color:#eee;font-family:system-ui;padding:3rem"><h1>'+ (ok?'Gmail connected':'Gmail was not connected')+'</h1><p>'+(ok?'Access links will be sent from your approved Gmail account.':'Return to Admin and connect the approved sender account again.')+'</p><a style="color:#f5d16c" href="/#library">Return to Draftopus</a></body></html>',{status:ok?200:400,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});}
async function gmailConnection(request,env,{q,id,body,audit}){
  const url=new URL(request.url),route=url.pathname;
  if(!env.KATCHAMAK_GMAIL_CLIENT_ID||!env.KATCHAMAK_GMAIL_CLIENT_SECRET||!env.KATCHAMAK_GMAIL_SENDER)return accountJson({error:'Email sender setup is not ready.'},503);
  await gmailTables(q);
  if(route==='/api/admin/gmail/status'&&request.method==='GET'){
    const connected=await q("SELECT email FROM admin_mail_connection WHERE provider='gmail'").first();
    return accountJson({connected:connected?.email===env.KATCHAMAK_GMAIL_SENDER,email:env.KATCHAMAK_GMAIL_SENDER});
  }
  const redirect=url.origin+'/api/admin/gmail/callback';
  if(route==='/api/admin/gmail/connect'&&request.method==='POST'){
    const state=gmailBase64(crypto.getRandomValues(new Uint8Array(32))),verifier=gmailBase64(crypto.getRandomValues(new Uint8Array(32)));
    await q('DELETE FROM admin_mail_oauth WHERE expires_at<?',Date.now()).run();
    await q('INSERT INTO admin_mail_oauth (state,actor,verifier,expires_at) VALUES (?,?,?,?)',state,id,await gmailSeal(env,verifier),Date.now()+600000).run();
    const auth=new URL('https://accounts.google.com/o/oauth2/v2/auth');
    auth.search=new URLSearchParams({client_id:env.KATCHAMAK_GMAIL_CLIENT_ID,redirect_uri:redirect,response_type:'code',scope:'openid email '+gmailScope,access_type:'offline',prompt:'consent',login_hint:env.KATCHAMAK_GMAIL_SENDER,state,code_challenge:gmailBase64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)))),code_challenge_method:'S256'}).toString();
    return accountJson({url:auth.href});
  }
  if(route==='/api/admin/gmail/callback'&&request.method==='GET'){
    const state=url.searchParams.get('state')??'',code=url.searchParams.get('code');
    if(state.length>100||!code||code.length>5000)return gmailPage(false);
    const pending=await q('SELECT verifier FROM admin_mail_oauth WHERE state=? AND actor=? AND expires_at>?',state,id,Date.now()).first();
    if(!pending)return gmailPage(false);
    const consumed=await q('DELETE FROM admin_mail_oauth WHERE state=? AND actor=?',state,id).run();if(!gmailChanged(consumed))return gmailPage(false);
    try{
      const tokenResponse=await gmailFetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:env.KATCHAMAK_GMAIL_CLIENT_ID,client_secret:env.KATCHAMAK_GMAIL_CLIENT_SECRET,redirect_uri:redirect,grant_type:'authorization_code',code,code_verifier:await gmailOpen(env,pending.verifier)})});
      const token=await tokenResponse.json();
      if(!tokenResponse.ok||!token.refresh_token||!token.scope?.split(' ').includes(gmailScope))return gmailPage(false);
      const identityResponse=await gmailFetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+token.access_token}}),identity=await identityResponse.json();
      if(!identityResponse.ok||identity.email_verified!==true||identity.email?.toLowerCase()!==env.KATCHAMAK_GMAIL_SENDER.toLowerCase())return gmailPage(false);
      await q("INSERT INTO admin_mail_connection (provider,email,token,updated_at) VALUES ('gmail',?,?,?) ON CONFLICT(provider) DO UPDATE SET email=excluded.email,token=excluded.token,updated_at=excluded.updated_at",identity.email.toLowerCase(),await gmailSeal(env,token.refresh_token),Date.now()).run();
      await audit(identity.email.toLowerCase(),'gmail-connected',{}).run();return gmailPage(true);
    }catch{return gmailPage(false);}
  }
  return accountJson({error:'Not found'},404);
}
async function gmailAccessLink(env,{q,audit,target,body,link}){
  if(typeof body.requestId!=='string'||!/^[a-zA-Z0-9-]{16,100}$/.test(body.requestId))return accountJson({error:'A valid send request is required.'},400);
  if(!env.KATCHAMAK_GMAIL_CLIENT_SECRET)return accountJson({error:'Connect the sender Gmail account in Admin.'},503);
  await gmailTables(q);
  const connection=await q("SELECT email,token FROM admin_mail_connection WHERE provider='gmail'").first();
  if(!connection||connection.email!==env.KATCHAMAK_GMAIL_SENDER)return accountJson({error:'Connect the sender Gmail account in Admin.'},503);
  let access;
  try{
    const response=await gmailFetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:env.KATCHAMAK_GMAIL_CLIENT_ID,client_secret:env.KATCHAMAK_GMAIL_CLIENT_SECRET,refresh_token:await gmailOpen(env,connection.token),grant_type:'refresh_token'})});
    const token=await response.json();if(!response.ok||!token.access_token)return accountJson({error:'Reconnect the sender Gmail account in Admin.',resetRequest:true},503);access=token.access_token;
  }catch{return accountJson({error:'Could not reach Gmail. No email was sent.',resetRequest:true},502);}
  const inserted=await q("INSERT INTO admin_mail_sends (request_id,email,status,created_at) VALUES (?,?,'sending',?) ON CONFLICT(request_id) DO NOTHING",body.requestId,target,Date.now()).run();
  if(!gmailChanged(inserted)){
    const previous=await q('SELECT email,status,provider_id FROM admin_mail_sends WHERE request_id=?',body.requestId).first();
    if(previous?.email===target&&previous.status==='sent')return accountJson({ok:true,email:target,providerId:previous.provider_id,link});
    return accountJson({error:'This send request is still pending or its result is uncertain. Check Sent in Gmail before sending again.'},409);
  }
  const message=['From: Draftopus <'+connection.email+'>','To: '+target,'Subject: Your Draftopus access link','MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','','Your Draftopus license is ready.','','Open Draftopus: '+link,'','Sign in with the ChatGPT account for '+target+'. Your projects are private to your account.'].join('\r\n');
  let sent;
  try{
    const response=await gmailFetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({raw:gmailBase64(new TextEncoder().encode(message))})});
    sent=await response.json();
    if(!response.ok){if(response.status>=500)throw new Error('Unknown send result');await q('DELETE FROM admin_mail_sends WHERE request_id=?',body.requestId).run();return accountJson({error:'Gmail did not accept the email. Check the sender connection and sending limits.',resetRequest:true},502);}
    if(typeof sent.id!=='string')throw new Error('Unknown send result');
    await q("UPDATE admin_mail_sends SET status='sent',provider_id=? WHERE request_id=?",sent.id,body.requestId).run();
  }catch{return accountJson({error:'Could not confirm sending. Check Sent in Gmail; this request will not be sent twice.'},502);}
  await audit(target,'access-link',{provider:'gmail',providerId:sent.id}).run();
  return accountJson({ok:true,email:target,providerId:sent.id,link});
}
