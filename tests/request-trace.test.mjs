import assert from 'node:assert/strict';
import { traceApiRequest, measuredQuery, measuredBatch } from '../scripts/request-trace.mjs';
const logs = [], warn = console.warn;
console.warn = (...args) => logs.push(args);
try {
  let rawStatement;
  const DB = { prepare() { rawStatement = { bind() { return this; }, async first() { return { name: 'private prose' }; } }; return rawStatement; }, async batch(statements) { assert.equal(statements[0], rawStatement); return []; } };
  const request = new Request('https://test.local/api/library/files/private-project/private-file?secret=hidden');
  const response = await traceApiRequest(request, async measure => {
    const q = measuredQuery(DB, 'SELECT * FROM accounts WHERE email=?', ['private-email'], measure);
    assert.deepEqual(await q.first(), { name: 'private prose' });
    await measuredBatch(DB, [q], measure);
    return Response.json({ error: 'simulated' }, { status: 503 });
  });
  assert.equal(response.status, 503);assert.match(response.headers.get('Server-Timing'), /2 queries/);
  assert.equal(logs.length, 1);assert.equal(logs[0][1].requestId, response.headers.get('X-Katchamak-Request'));
  assert.equal(logs[0][1].route, '/api/library/files/:attachment');
  assert.ok(!/private|hidden|secret/.test(JSON.stringify(logs)), 'Tracing never exposes query strings, keys, values or contents');
  assert.equal(logs[0][1].operations[0].operation, 'db.SELECT.accounts');
  const failed = await traceApiRequest(request, async () => { throw new Error('private DB details'); });
  assert.equal(failed.status, 503);assert.ok(!(await failed.text()).includes('private'));
  console.log('Request traces passed: query timing, batch identity, safe failure, correlation and redaction.');
} finally { console.warn = warn; }
