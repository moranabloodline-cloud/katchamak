import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import { authDestinationQuery, draftopusAuthPage, readAuthDestination } from './draftopus-auth-ui.mjs';

const productionOrigin = 'https://app.draftopus.com';
const authPaths = new Set([
  '/auth/sign-in', '/auth/sign-up', '/auth/check-email', '/auth/google', '/auth/callback',
  '/auth/continue', '/auth/logout',
]);
const hostOnlyCookie = { path: '/', secure: true, httpOnly: true, sameSite: 'lax' };
const unchangedSessionErrorCodes = new Set(['user_already_exists', 'email_exists', 'identity_already_exists']);

function exactOrigin(value, allowedHostname) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && value === url.origin && !url.port && allowedHostname.test(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

export function draftopusAuthConfig(request, env) {
  if (env?.DRAFTOPUS_AUTH_ENABLED !== '1') return null;
  const test = env.DRAFTOPUS_AUTH_TEST_ORIGIN;
  const origin = test ? exactOrigin(test, /^(?:[a-z0-9-]+\.)+(?:draftopus\.com|chatgpt\.site|workers\.dev)$/)?.origin : productionOrigin;
  const provider = exactOrigin(env.SUPABASE_URL, /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.supabase\.co$/);
  const key = env.SUPABASE_PUBLISHABLE_KEY;
  if (!origin || (test && origin === productionOrigin) || new URL(request.url).origin !== origin || !provider ||
      typeof key !== 'string' || key.length > 512 || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return null;
  return {
    origin, providerOrigin: provider.origin, publishableKey: key,
    cookieName: '__Host-draftopus-auth-' + provider.hostname.split('.')[0],
    googleEnabled: env.DRAFTOPUS_GOOGLE_ENABLED === '1',
  };
}

export function openDraftopusAuth(request, config) {
  const { cookieName } = config;
  const validCookieSuffix = /^(?:-(?:code-verifier|flows-code-verifier|flow-[A-Za-z0-9_-]{8,64}-code-verifier))?(?:\.\d+)?$/;
  const belongsToAuth = name => name.startsWith(cookieName) && validCookieSuffix.test(name.slice(cookieName.length));
  const cookies = new Map(parseCookieHeader(request.headers.get('cookie') ?? '')
    .filter(({ name, value }) => belongsToAuth(name) && typeof value === 'string')
    .map(({ name, value }) => [name, value]));
  const pending = new Map();
  const cacheHeaders = new Headers();

  function refreshCookies(changes, headers) {
    for (const { name, value, options } of changes) {
      if (!belongsToAuth(name)) continue;
      const { domain: _domain, ...supportedOptions } = options ?? {};
      if (supportedOptions.maxAge === 0) cookies.delete(name);
      else cookies.set(name, value);
      pending.set(name, serializeCookieHeader(name, value, { ...supportedOptions, ...hostOnlyCookie }));
    }
    for (const [name, value] of new Headers(headers)) {
      if (['cache-control', 'expires', 'pragma'].includes(name)) cacheHeaders.set(name, value);
    }
  }

  const client = createServerClient(config.providerOrigin, config.publishableKey, {
    cookieOptions: { name: cookieName, ...hostOnlyCookie },
    cookies: {
      getAll: () => Array.from(cookies, ([name, value]) => ({ name, value })),
      setAll: refreshCookies,
    },
  });

  const hasSessionCookie = () => [...cookies.keys()].some(name => name === cookieName || name.startsWith(cookieName + '.'));

  async function getVerifiedUser() {
    if (!hasSessionCookie()) return null;
    try {
      const { data, error } = await client.auth.getUser();
      const user = data?.user;
      if (error || user?.is_anonymous || typeof user?.email_confirmed_at !== 'string' ||
          !Number.isFinite(Date.parse(user.email_confirmed_at)) || typeof user.id !== 'string' || !user.id) return null;
      const email = normalizeEmail(user.email);
      return email ? { id: user.id, email } : null;
    } catch {
      return null;
    }
  }

  function withCookies(response) {
    if (!pending.size && !cacheHeaders.keys().next().value) return response;
    const updated = new Response(response.body, response);
    for (const value of pending.values()) updated.headers.append('Set-Cookie', value);
    for (const [name, value] of cacheHeaders) updated.headers.set(name, value);
    updated.headers.set('Cache-Control', 'private, no-store');
    return updated;
  }

  async function signOut() {
    try {
      if (hasSessionCookie()) await client.auth.signOut({ scope: 'local' });
    } finally {
      // End the current browser session even if the provider is temporarily unreachable.
      refreshCookies([...cookies.keys()].map(name => ({ name, value: '', options: { maxAge: 0 } })));
    }
  }

  return { config, client, getVerifiedUser, withCookies, signOut };
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return '';
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function redirect(location) {
  return new Response(null, {
    status: 303,
    headers: { Location: location, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
  });
}

function sameOriginPath(value, origin) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  const parsed = new URL(value, origin);
  return parsed.origin === origin && !parsed.pathname.startsWith('//') ? parsed.pathname + parsed.search + parsed.hash : '/';
}

async function readForm(request) {
  const type = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (type !== 'application/x-www-form-urlencoded' || !request.body) return null;
  const decoder = new TextDecoder();
  const reader = request.body.getReader();
  let size = 0;
  let content = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return new URLSearchParams(content + decoder.decode());
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return null;
      }
      content += decoder.decode(value, { stream: true });
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

function providerAuthorizeUrl(value, config) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.origin === config.providerOrigin && !url.username && !url.password &&
      url.pathname === '/auth/v1/authorize' ? url.href : null;
  } catch {
    return null;
  }
}

export async function handleDraftopusAuth(request, session, { signedInDestination } = {}) {
  const url = new URL(request.url);
  const { config, client } = session;
  if (url.origin !== config.origin || !authPaths.has(url.pathname)) return null;
  const mode = url.pathname.slice('/auth/'.length);
  const next = readAuthDestination(url.searchParams.get('next'));
  const query = authDestinationQuery(next);
  const signIn = '/auth/sign-in' + query;
  const onward = '/auth/continue' + query;
  const callback = config.origin + '/auth/callback' + query;
  const page = (type, error, status) => draftopusAuthPage({
    mode: type, next, googleEnabled: config.googleEnabled, providerOrigin: config.providerOrigin, error, status,
  });
  const busy = (type, error) => error?.status === 429
    ? page(type, 'Too many attempts. Wait a moment and try again.', 429)
    : page(type, 'Draftopus sign-in is temporarily unavailable. Try again shortly.', 503);

  if (!['GET', 'POST'].includes(request.method) ||
      (request.method === 'POST' && !['sign-in', 'sign-up', 'google', 'logout'].includes(mode)) ||
      (request.method === 'GET' && mode === 'google')) {
    const allow = mode === 'google' ? 'POST' : ['sign-in', 'sign-up', 'logout'].includes(mode) ? 'GET, POST' : 'GET';
    return new Response('Method not allowed.', { status: 405, headers: { Allow: allow, 'Cache-Control': 'private, no-store' } });
  }
  if (request.method === 'POST' && request.headers.get('origin') !== config.origin) {
    return new Response('This request must start in Draftopus.', { status: 403, headers: { 'Cache-Control': 'private, no-store' } });
  }

  if (mode === 'continue') {
    const user = await session.getVerifiedUser();
    if (!user) return redirect(signIn);
    return redirect(sameOriginPath(await signedInDestination?.(next, user), config.origin));
  }
  if (mode === 'callback') {
    const code = url.searchParams.get('code');
    const flowId = url.searchParams.get('sb_flow_id');
    if (code && /^[A-Za-z0-9._~-]{1,1024}$/.test(code) && (flowId === null || /^[A-Za-z0-9_-]{8,64}$/.test(flowId))) {
      try {
        const { error } = await client.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
        if (!error && await session.getVerifiedUser()) return redirect(onward);
      } catch {
        return busy('sign-in');
      }
    }
    return page('sign-in', 'This sign-in link could not be used. Start again in this browser.', 400);
  }
  if (request.method === 'GET') {
    if (['sign-in', 'sign-up'].includes(mode) && await session.getVerifiedUser()) {
      return redirect(mode === 'sign-up' && !next ? '/auth/continue?next=account' : onward);
    }
    return page(mode);
  }
  if (mode === 'logout') {
    try { await session.signOut(); } catch { /* The current browser cookies were cleared. */ }
    return redirect('/auth/sign-in');
  }
  if (mode === 'google') {
    if (!config.googleEnabled) return page('sign-in', 'Google sign-in is currently unavailable.', 503);
    try {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google', options: { redirectTo: callback, skipBrowserRedirect: true },
      });
      const authorize = providerAuthorizeUrl(data?.url, config);
      return !error && authorize ? redirect(authorize) : busy('sign-in', error);
    } catch {
      return busy('sign-in');
    }
  }

  const form = await readForm(request);
  const email = normalizeEmail(form?.get('email'));
  const password = form?.get('password') ?? '';
  const signingUp = mode === 'sign-up';
  if (!email || !password || password.length > 128 || (signingUp && password.length < 8)) {
    return page(mode, signingUp ? 'Enter a valid email and a password with at least 8 characters.' : 'Enter your email and password.', 400);
  }
  try {
    if (signingUp) {
      const signupQuery = authDestinationQuery(next || 'demo');
      const { data, error } = await client.auth.signUp({
        email, password, options: { emailRedirectTo: config.origin + '/auth/callback' + signupQuery },
      });
      if (data?.session) {
        // Registration must require control of the email address before it creates a usable session.
        await session.signOut();
        return busy(mode);
      }
      if (!error || unchangedSessionErrorCodes.has(error.code)) return redirect('/auth/check-email' + signupQuery);
      if (error.code === 'weak_password') return page(mode, 'Choose a stronger password and try again.', 400);
      return busy(mode, error);
    }
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (!error && await session.getVerifiedUser()) return redirect(onward);
    return error?.status === 429 || error?.status >= 500 ? busy(mode, error)
      : page(mode, 'Could not sign in. Check your email, password, and email confirmation.', 401);
  } catch {
    return busy(mode);
  }
}
