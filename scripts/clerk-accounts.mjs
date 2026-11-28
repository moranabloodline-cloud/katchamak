import { createClerkClient } from '@clerk/backend';

const linkCookie = '__Host-draftopus-clerk-link';
const linkLifetimeSeconds = 300;
const freshFactorMinutes = 10;

export function clerkFrontendOrigin(key) {
  const prefix = /^pk_(?:test|live)_/.exec(key)?.[0];
  if (!prefix || key.length > 512 || !/^[a-zA-Z0-9+/_=-]+$/.test(key.slice(prefix.length))) return null;
  try {
    const frontend = atob(key.slice(prefix.length).replaceAll('-', '+').replaceAll('_', '/'));
    return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}\$$/.test(frontend) ? 'https://' + frontend.slice(0, -1) : null;
  } catch {
    return null;
  }
}

export function clerkAccountConfig(request, env, origin) {
  const { DB, DRAFTOPUS_CLERK_MODE, CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, CLERK_ISSUER, CLERK_JWT_KEY } = env;
  if (!DB || !origin?.startsWith('https://') || new URL(request.url).origin !== origin) return null;
  const tier = DRAFTOPUS_CLERK_MODE === 'production' ? 'live' : DRAFTOPUS_CLERK_MODE === 'development' ? 'test' : null;
  if (!tier || !CLERK_PUBLISHABLE_KEY?.startsWith('pk_' + tier + '_') || !CLERK_SECRET_KEY?.startsWith('sk_' + tier + '_')) return null;
  const issuer = clerkFrontendOrigin(CLERK_PUBLISHABLE_KEY);
  if (!issuer || CLERK_ISSUER !== issuer || (tier === 'test') !== issuer.endsWith('.clerk.accounts.dev')) return null;
  return { issuer, publishableKey: CLERK_PUBLISHABLE_KEY, secretKey: CLERK_SECRET_KEY, jwtKey: CLERK_JWT_KEY };
}

const normalizeEmail = email => typeof email === 'string' ? email.trim().toLowerCase() : '';
const validEmail = email => email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const statement = (db, sql, ...values) => db.prepare(sql).bind(...values);

function json(data, status = 200, cookie) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie, Origin' };
  if (cookie) headers['Set-Cookie'] = cookie;
  return Response.json(data, { status, headers });
}

function cookieHeader(value, age = linkLifetimeSeconds) {
  return `${linkCookie}=${value}; Max-Age=${age}; Path=/; Secure; HttpOnly; SameSite=Strict`;
}

function readLinkCookie(request) {
  const matches = (request.headers.get('Cookie') ?? '').split(';')
    .map(piece => piece.trim()).filter(piece => piece.startsWith(linkCookie + '='));
  const value = matches.length === 1 ? matches[0].slice(linkCookie.length + 1) : '';
  return /^[0-9a-f]{64}$/.test(value) ? value : null;
}

const toHex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
async function linkTokenHash(token) {
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))));
}

function accountForIdentity(db, issuer, subject) {
  return statement(db, `SELECT a.id,a.email FROM clerk_prototype_identities i
    JOIN accounts a ON a.id=i.account_id WHERE i.issuer=? AND i.subject=?`, issuer, subject).first();
}

export async function resolveClerkAccount(request, env, origin, onNavigation) {
  const config = clerkAccountConfig(request, env, origin);
  if (!config) return null;
  const client = createClerkClient({ publishableKey: config.publishableKey, secretKey: config.secretKey, telemetry: { disabled: true } });
  const state = await client.authenticateRequest(request, {
    acceptsToken: 'session_token', authorizedParties: [origin], ...(config.jwtKey ? { jwtKey: config.jwtKey } : {}),
  });
  if (onNavigation) {
    const supplied = state.headers.get('Location');
    const target = supplied ? new URL(supplied, origin) : null;
    const location = target && !target.username && !target.password &&
      (target.origin === origin || target.origin === config.issuer) ? target.href : null;
    onNavigation({
      location: state.status === 'handshake' ? location : null,
      cookies: state.headers.getSetCookie?.() ?? [],
    });
  }
  if (!state.isAuthenticated) return null;
  const auth = state.toAuth();
  const claims = auth.sessionClaims;
  if (claims?.iss !== config.issuer || claims?.azp !== origin || (claims.sts && claims.sts !== 'active') ||
      !auth.userId || !auth.sessionId || claims.sub !== auth.userId || claims.sid !== auth.sessionId) return null;

  const account = await accountForIdentity(env.DB, config.issuer, auth.userId);
  let email = normalizeEmail(account?.email);
  if (!account) {
    const user = await client.users.getUser(auth.userId);
    const primary = user.emailAddresses.find(address => address.id === user.primaryEmailAddressId);
    if (user.id !== auth.userId || user.banned || user.locked || primary?.verification?.status !== 'verified') return null;
    email = normalizeEmail(primary.emailAddress);
  }
  if (!validEmail(email)) return null;
  return { issuer: config.issuer, subject: auth.userId, sessionId: auth.sessionId, email, account,
    firstFactorMinutes: claims.fva?.[0] };
}

function mutationError(request, env, origin, clerk) {
  const config = clerkAccountConfig(request, env, origin);
  if (!config) return json({ error: 'Draftopus account registration is unavailable.' }, 404);
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  if (request.headers.get('Origin') !== origin) return json({ error: 'Invalid request origin.' }, 403);
  if (clerk?.issuer !== config.issuer || !clerk.subject || !clerk.sessionId) return json({ error: 'Sign in with Clerk to continue.' }, 401);
  if (!Number.isInteger(clerk.firstFactorMinutes) || clerk.firstFactorMinutes < 0 || clerk.firstFactorMinutes > freshFactorMinutes) {
    return json({ error: 'Verify your Clerk sign-in again to continue.' }, 403);
  }
  return null;
}

export async function linkClerkAccount(request, env, origin, legacy, clerk) {
  const invalid = mutationError(request, env, origin, clerk);
  if (invalid) return invalid;
  const legacyEmail = normalizeEmail(legacy?.email);
  if (!legacy?.id || !validEmail(legacyEmail)) return json({ error: 'Sign in with the existing Sites account to continue.' }, 401);
  const db = env.DB;
  const now = Date.now();
  const path = new URL(request.url).pathname;

  if (path === '/api/auth/link/start') {
    if (clerk.account) return json({ error: 'This Clerk sign-in is already linked.' }, 409);
    const token = toHex(crypto.getRandomValues(new Uint8Array(32)));
    const inserted = await statement(db, `INSERT INTO clerk_prototype_link_intents
      (token_hash,legacy_account_id,legacy_email,clerk_issuer,clerk_subject,clerk_session_id,expires_at)
      SELECT ?,a.id,a.email,?,?,?,? FROM accounts a LEFT JOIN account_access x ON x.email=a.email
      WHERE a.id=? AND a.email=? AND a.status='active' AND COALESCE(x.status,'active')!='suspended'
      AND NOT EXISTS(SELECT 1 FROM clerk_prototype_identities WHERE issuer=? AND account_id=a.id)`,
    await linkTokenHash(token), clerk.issuer, clerk.subject, clerk.sessionId, now + linkLifetimeSeconds * 1000,
    legacy.id, legacyEmail, clerk.issuer).run();
    if (inserted.meta.changes !== 1) return json({ error: 'This Sites account cannot be linked.' }, 409);
    return json({ status: 'ready' }, 200, cookieHeader(token));
  }

  if (path !== '/api/auth/link/complete') return json({ error: 'This link action was not found.' }, 404);
  const token = readLinkCookie(request);
  if (!token) return json({ error: 'Start the link on this browser before confirming.' }, 409);
  const clearCookie = cookieHeader('', 0);
  const claimId = crypto.randomUUID();
  const [consumed, linked] = await db.batch([
    statement(db, `UPDATE clerk_prototype_link_intents SET consumed_at=?,claim_id=?
      WHERE token_hash=? AND consumed_at IS NULL AND expires_at>? AND legacy_account_id=? AND legacy_email=?
      AND clerk_issuer=? AND clerk_subject=? AND clerk_session_id=? AND EXISTS(
        SELECT 1 FROM accounts a LEFT JOIN account_access x ON x.email=a.email
        WHERE a.id=legacy_account_id AND a.email=legacy_email AND a.status='active' AND COALESCE(x.status,'active')!='suspended')`,
    now, claimId, await linkTokenHash(token), now, legacy.id, legacyEmail, clerk.issuer, clerk.subject, clerk.sessionId),
    statement(db, `INSERT INTO clerk_prototype_identities (issuer,subject,account_id,linked_at)
      SELECT clerk_issuer,clerk_subject,legacy_account_id,consumed_at FROM clerk_prototype_link_intents
      WHERE claim_id=? ON CONFLICT DO NOTHING`, claimId),
  ]);
  if (consumed.meta.changes !== 1 || linked.meta.changes !== 1) {
    return json({ error: 'This link is expired, already used, or belongs to a different sign-in.' }, 409, clearCookie);
  }
  return json({ status: 'linked', account: { id: legacy.id, email: legacyEmail } }, 200, clearCookie);
}

export async function registerClerkAccount(request, env, origin, clerk) {
  const invalid = mutationError(request, env, origin, clerk);
  if (invalid) return invalid;
  if (new URL(request.url).pathname !== '/api/auth/register') return json({ error: 'This registration action was not found.' }, 404);
  const email = normalizeEmail(clerk.email);
  if (!validEmail(email)) return json({ error: 'Verify your primary Clerk email before registering.' }, 403);
  if (clerk.account || email === normalizeEmail(env.KATCHAMAK_ADMIN_EMAIL)) {
    return json({ error: 'This sign-in belongs to an existing or reserved Draftopus account.' }, 409);
  }
  const id = crypto.randomUUID();
  const now = Date.now();
  const db = env.DB;
  const [registered, linked] = await db.batch([
    statement(db, `INSERT INTO accounts (id,email,created_at,last_seen)
      SELECT ?,?,?,? WHERE NOT EXISTS(SELECT 1 FROM accounts WHERE lower(trim(email))=?)
      AND NOT EXISTS(SELECT 1 FROM licenses WHERE lower(trim(email))=?)
      AND NOT EXISTS(SELECT 1 FROM account_access WHERE lower(trim(email))=?)
      AND NOT EXISTS(SELECT 1 FROM clerk_prototype_identities WHERE issuer=? AND subject=?)`,
    id, email, now, now, email, email, email, clerk.issuer, clerk.subject),
    statement(db, `INSERT INTO clerk_prototype_identities (issuer,subject,account_id,linked_at)
      SELECT ?,?,id,? FROM accounts WHERE id=?`, clerk.issuer, clerk.subject, now, id),
  ]);
  if (registered.meta.changes !== 1 || linked.meta.changes !== 1) {
    return json({ error: 'This sign-in belongs to an existing or reserved Draftopus account.' }, 409);
  }
  return json({ status: 'registered', account: { id, email } }, 201);
}
