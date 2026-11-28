import { Webhook } from 'standardwebhooks';
import { authDestinationQuery } from './draftopus-auth-ui.mjs';

const endpoint = '/auth/email-hook';
const providerEndpoint = 'https://api.resend.com/emails';
const maxBodyBytes = 64 * 1024;
const allowedDestinations = ['', 'demo', 'account', 'membership'];

function hookResponse(status, message, extraHeaders) {
  const body = message ? { error: { http_code: status, message } } : {};
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extraHeaders },
  });
}

async function readBody(request, signal) {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > maxBodyBytes) return null;
  if (!request.body || signal.aborted) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
  const stop = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', stop, { once: true });
  let size = 0;
  let body = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return signal.aborted ? '' : body + decoder.decode();
      size += value.byteLength;
      if (size > maxBodyBytes) {
        stop();
        return null;
      }
      body += decoder.decode(value, { stream: true });
    }
  } finally {
    signal.removeEventListener('abort', stop);
    reader.releaseLock();
  }
}

function enrollmentEmail(event, config) {
  const recipient = event?.user?.email;
  const data = event?.email_data;
  if (typeof recipient !== 'string' || recipient.length > 254 || !/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(recipient) ||
      data?.email_action_type !== 'signup' || typeof data.token_hash !== 'string' || !/^(?:pkce_)?[0-9a-f]{56}$/.test(data.token_hash)) return null;

  const callback = config.origin + '/auth/callback';
  if (!allowedDestinations.some(next => data.redirect_to === callback + authDestinationQuery(next))) return null;

  const link = new URL('/auth/v1/verify', config.providerOrigin);
  link.searchParams.set('token', data.token_hash);
  link.searchParams.set('type', 'signup');
  link.searchParams.set('redirect_to', data.redirect_to);
  return {
    to: [recipient],
    subject: 'Confirm your Draftopus email address',
    text: [
      'Confirm your email address to finish creating your Draftopus account.',
      '',
      'Open this link in the browser where you signed up:',
      link.href,
      '',
      'If you did not create a Draftopus account, you can ignore this email.',
      '',
      'Draftopus',
    ].join('\n'),
  };
}

export async function sendDraftopusAuthEmail(request, env, config) {
  const url = new URL(request.url);
  if (!config || url.protocol !== 'https:' || url.origin !== config.origin || url.pathname !== endpoint || url.search) {
    return hookResponse(404, 'Not found.');
  }
  if (request.method !== 'POST') return hookResponse(405, 'Method not allowed.', { Allow: 'POST' });
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return hookResponse(415, 'Expected a JSON request.');
  }
  const id = request.headers.get('webhook-id');
  const timestamp = request.headers.get('webhook-timestamp');
  const signature = request.headers.get('webhook-signature');
  if (!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id) || !/^\d{10,11}$/.test(timestamp ?? '') || !signature || signature.length > 1024) {
    return hookResponse(401, 'Invalid webhook signature.');
  }

  const secret = env?.DRAFTOPUS_AUTH_MAIL_HOOK_SECRET;
  const apiKey = env?.RESEND_API_KEY;
  const sender = env?.KATCHAMAK_MAIL_FROM;
  const unavailable = () => hookResponse(503, 'Verification email is temporarily unavailable.', { 'Retry-After': '2' });
  if (typeof secret !== 'string' || !/^(?:v1,)?whsec_[A-Za-z0-9+/]{32,128}={0,2}$/.test(secret) ||
      typeof apiKey !== 'string' || !apiKey || typeof sender !== 'string' || !sender ||
      !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.providerOrigin)) return unavailable();

  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(3800)]);
  let event;
  try {
    const body = await readBody(request, signal);
    if (signal.aborted) return unavailable();
    if (body === null) return hookResponse(413, 'Webhook payload is too large.');
    event = new Webhook(secret.replace(/^v1,/, '')).verify(body, {
      'webhook-id': id,
      'webhook-timestamp': timestamp,
      'webhook-signature': signature,
    });
  } catch {
    return hookResponse(401, 'Invalid webhook signature.');
  }

  const email = enrollmentEmail(event, config);
  if (!email) return hookResponse(400, 'Unsupported email request.');
  try {
    const response = await fetch(providerEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'Idempotency-Key': 'draftopus-auth-signup/' + id,
      },
      body: JSON.stringify({ from: sender, ...email }),
      redirect: 'manual',
      signal,
    });
    if (response.body) void response.body.cancel().catch(() => {});
    return response.ok ? hookResponse(200) : unavailable();
  } catch {
    return unavailable();
  }
}
