import test from 'node:test';
import assert from 'node:assert/strict';
import { Webhook } from 'standardwebhooks';
import { sendDraftopusAuthEmail } from '../scripts/draftopus-auth-email.mjs';

const config = {
  origin: 'https://app.draftopus.com',
  providerOrigin: 'https://example-auth.supabase.co',
};
const webhookSecret = 'whsec_' + btoa('a local signing test secret!!!!!');
const env = {
  DRAFTOPUS_AUTH_MAIL_HOOK_SECRET: 'v1,' + webhookSecret,
  RESEND_API_KEY: 'a-synthetic-api-key',
  KATCHAMAK_MAIL_FROM: 'Draftopus <draftopus@example.test>',
};
const id = 'draftopus-test-event-1';
const endpoint = config.origin + '/auth/email-hook';
const hash = 'pkce_' + 'a'.repeat(56);

function signup({ action = 'signup', email = 'reader@example.test', redirect = config.origin + '/auth/callback?next=demo' } = {}) {
  return JSON.stringify({
    user: { email, user_metadata: { email: 'other@example.test' } },
    email_data: { email_action_type: action, redirect_to: redirect, token_hash: hash, token: '000000' },
  });
}

function hook(body, { at = new Date(), signedBody = body, url = endpoint, signal } = {}) {
  return new Request(url, {
    method: 'POST', body, signal,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'webhook-id': id,
      'webhook-timestamp': String(Math.floor(at.getTime() / 1000)),
      'webhook-signature': new Webhook(webhookSecret).sign(id, at, signedBody),
    },
  });
}

test('signed signup generates an idempotent email with a pinned verification link', async t => {
  const mockedFetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ id: 'private-provider-id' }));
  for (let retry = 0; retry < 2; retry += 1) {
    const response = await sendDraftopusAuthEmail(hook(signup()), env, config);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), {});
  }
  assert.equal(mockedFetch.mock.callCount(), 2);
  const [[url, request], [, retryRequest]] = mockedFetch.mock.calls.map(call => call.arguments);
  assert.equal(url, 'https://api.resend.com/emails');
  assert.equal(request.method, 'POST');
  assert.equal(request.redirect, 'error');
  assert.equal(request.headers['Idempotency-Key'], 'draftopus-auth-signup/' + id);
  assert.equal(request.headers['Idempotency-Key'], retryRequest.headers['Idempotency-Key']);
  assert.equal(request.body, retryRequest.body);
  assert.ok(request.signal instanceof AbortSignal);

  const email = JSON.parse(request.body);
  assert.equal(email.from, env.KATCHAMAK_MAIL_FROM);
  assert.deepEqual(email.to, ['reader@example.test']);
  assert.match(email.subject, /Draftopus/);
  const confirmation = new URL(email.text.split('\n').find(line => line.startsWith('https://')));
  assert.equal(confirmation.origin, config.providerOrigin);
  assert.equal(confirmation.pathname, '/auth/v1/verify');
  assert.equal(confirmation.searchParams.get('token'), hash);
  assert.equal(confirmation.searchParams.get('type'), 'signup');
  assert.equal(confirmation.searchParams.get('redirect_to'), config.origin + '/auth/callback?next=demo');
  assert.doesNotMatch(email.text, /000000|other@example\.test/);
});

test('ignores unsigned, modified, stale, oversized, and off-route requests', async t => {
  const mockedFetch = t.mock.method(globalThis, 'fetch');
  const requests = [
    [new Request(endpoint, { method: 'POST', body: signup(), headers: { 'Content-Type': 'application/json' } }), 401],
    [hook(signup({ email: 'changed@example.test' }), { signedBody: signup() }), 401],
    [hook(signup(), { at: new Date(Date.now() - 10 * 60 * 1000) }), 401],
    [hook('x'.repeat(65 * 1024)), 413],
    [new Request(endpoint), 405],
    [hook(signup(), { url: endpoint + '/' }), 404],
    [hook(signup(), { url: endpoint + '?other=1' }), 404],
    [hook(signup(), { url: 'https://www.draftopus.com/auth/email-hook' }), 404],
  ];
  for (const [request, status] of requests) {
    const response = await sendDraftopusAuthEmail(request, env, config);
    assert.equal(response.status, status);
    const { error } = await response.json();
    assert.equal(error.http_code, status);
  }
  assert.equal(mockedFetch.mock.callCount(), 0);
});

test('rejects signed non-signup requests and callback destinations outside the Draftopus allowlist', async t => {
  const mockedFetch = t.mock.method(globalThis, 'fetch');
  const eventBodies = [
    signup({ action: 'recovery' }),
    signup({ email: 'reader@example.test,extra@example.test' }),
    signup({ redirect: 'https://stranger.example.test/auth/callback?next=demo' }),
    signup({ redirect: config.origin + '/auth/callback?next=//stranger.example.test' }),
    signup({ redirect: config.origin + '/auth/callback?next=demo&next=account' }),
    signup({ redirect: config.origin + '/auth/callback?next=demo#different' }),
    signup({ redirect: config.origin + '/auth/elsewhere?next=demo' }),
  ];
  for (const body of eventBodies) {
    const response = await sendDraftopusAuthEmail(hook(body), env, config);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: { http_code: 400, message: 'Unsupported email request.' } });
  }
  assert.equal(mockedFetch.mock.callCount(), 0);
});

test('upstream errors are retryable and redact provider details and tokens', async t => {
  const mockedFetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'reader@example.test, ' + hash }, { status: 429 }));
  const response = await sendDraftopusAuthEmail(hook(signup()), env, config);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('retry-after'), '2');
  assert.deepEqual(await response.json(), { error: { http_code: 503, message: 'Verification email is temporarily unavailable.' } });

  const controller = new AbortController();
  controller.abort();
  const expired = await sendDraftopusAuthEmail(hook(signup(), { signal: controller.signal }), env, config);
  assert.equal(expired.status, 503);
  assert.equal(mockedFetch.mock.callCount(), 1);
});
