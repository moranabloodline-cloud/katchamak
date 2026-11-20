import assert from 'node:assert/strict';
import { requestJson, RequestTimeoutError } from '../src/lib/kachamak/request-json.ts';
const original = globalThis.fetch;
try {
  let calls = 0, aborted = false;
  globalThis.fetch = async (_, init) => { calls++; init.signal.addEventListener('abort', () => { aborted = true; }); return new Promise(() => {}); };
  const started = performance.now();
  await assert.rejects(requestJson('/api/library', { method: 'POST', body: '{}' }, 25), RequestTimeoutError);
  assert.ok(performance.now() - started < 500);
  assert.equal(calls, 1, 'A timed-out write is not automatically repeated');
  assert.equal(aborted, true);
  globalThis.fetch = async () => new Response(new ReadableStream({ start() {} }));
  await assert.rejects(requestJson('/api/library', {}, 25), RequestTimeoutError, 'A stalled body has the same deadline');
  globalThis.fetch = async () => new Response('<html>Gateway</html>');
  await assert.rejects(requestJson('/api/library'), /unreadable response/);
  globalThis.fetch = async () => Response.json(null);
  await assert.rejects(requestJson('/api/library'), /invalid response/);
  globalThis.fetch = async () => new Response('Gateway unavailable', { status: 503 });
  assert.equal((await requestJson('/api/library')).response.status, 503);
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(requestJson('/api/library'), /Failed to fetch/);
  globalThis.fetch = async () => new Promise(() => {});
  const controller = new AbortController();
  const cancelled = requestJson('/api/library', { signal: controller.signal });
  controller.abort();
  await assert.rejects(cancelled, { name: 'AbortError' });
  globalThis.fetch = async () => Response.json({ revision: 2 });
  assert.equal((await requestJson('/api/library')).data.revision, 2, 'A later request can recover normally');
  console.log('Request replay passed: stalled headers/body, cancellation, HTML/null, 503, network failure and recovery.');
} finally { globalThis.fetch = original; }

const originalXhr = globalThis.XMLHttpRequest;
let current;
let sends = 0;
class SnapshotRequest {
  upload = {};
  headers = new Headers();
  status = 200;
  statusText = 'OK';
  response = new Blob(['{"revision":2}']);
  constructor() { current = this; }
  open(method, path) { this.method = method; this.path = path; }
  setRequestHeader(key, value) { this.headers.set(key, value); }
  send(body) { this.body = body; sends++; }
  getAllResponseHeaders() { return 'content-type: application/json\r\nx-katchamak-request: test\r\n'; }
  abort() { this.aborted = true; this.onabort(); this.onloadend(); }
  finish() { this.onload(); this.onloadend(); }
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  globalThis.XMLHttpRequest = SnapshotRequest;
  const saving = requestJson('/api/library', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }, 250);
  for (const direction of [current.upload, current]) {
    for (const loaded of [8, 16, 24]) {
      await delay(60);
      direction.onprogress({ loaded });
    }
  }
  current.finish();
  const saved = await saving;
  assert.equal(current.body, '{}');
  assert.equal(current.method, 'POST');
  assert.equal(current.headers.get('Content-Type'), 'application/json');
  assert.equal(saved.response.headers.get('X-Katchamak-Request'), 'test');
  assert.equal(saved.data.revision, 2);

  const stalled = assert.rejects(requestJson('/api/library', {}, 100), RequestTimeoutError);
  const stalledRequest = current;
  const heartbeat = setInterval(() => stalledRequest.onprogress({ loaded: 1 }), 20);
  try {
    await Promise.race([stalled, delay(500).then(() => { throw Error('Repeated byte counts kept a stalled transfer alive'); })]);
  } finally { clearInterval(heartbeat); }
  assert.equal(stalledRequest.aborted, true);
  assert.equal(sends, 2, 'A stalled snapshot must not trigger another write');

  const controller = new AbortController();
  const cancelled = requestJson('/api/library', { signal: controller.signal });
  controller.abort();
  await assert.rejects(cancelled, { name: 'AbortError' });
  assert.equal(current.aborted, true);
  console.log('Snapshot transfer passed: slow upload and download, stalled transfer and cancellation.');
} finally {
  if (originalXhr === undefined) delete globalThis.XMLHttpRequest;
  else globalThis.XMLHttpRequest = originalXhr;
}
