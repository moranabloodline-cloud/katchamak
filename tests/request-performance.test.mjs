import assert from 'node:assert/strict';
import { Database } from 'bun:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { accountApi } from '../scripts/accounts-runtime.mjs';
import { cloudLibraryApi } from '../scripts/cloud-library-runtime.mjs';
import { traceApiRequest } from '../scripts/request-trace.mjs';
globalThis.accountApi = accountApi;
const sql = new Database(':memory:');
for (const file of readdirSync('drizzle').filter(f => f.endsWith('.sql')).sort())
  for (const statement of readFileSync('drizzle/' + file, 'utf8').split('--> statement-breakpoint')) if (statement.trim()) sql.exec(statement);
let queries = 0, reads = 0, writes = 0;
const DB = { prepare(query) {
  let values = [];
  const run = async fn => { queries++; await Bun.sleep(1); return fn(); };
  const stmt = { bind(...v) { values = v; return stmt; },
    run() { return run(() => ({ meta: { changes: sql.query(query).run(...values).changes } })); },
    first() { return run(() => sql.query(query).get(...values)); },
    all() { return run(() => ({ results: sql.query(query).all(...values) })); } };
  return stmt;
} };
const body = JSON.stringify({ novels: [], collections: [] });
const env = { DB, KATCHAMAK_ADMIN_EMAIL: 'owner@test.local', BUCKET: { async get() { reads++; return { text: async () => body }; } } };
const headers = { 'oai-authenticated-user-id': 'owner', 'oai-authenticated-user-email': 'owner@test.local', 'X-Katchamak-Account': 'owner' };
const request = path => new Request('https://test.local' + path, { headers });
await accountApi(request('/api/account'), env);
sql.exec("INSERT INTO cloud_libraries (account_id,snapshot_key,revision,updated_at) VALUES ('owner','test-snapshot',7,123)");
queries = 0;
await accountApi(request('/api/account'), env);
const hotAccountQueries = queries;
queries = 0;
const refreshRequest = request('/api/library?revision=7');
const refresh = await traceApiRequest(refreshRequest, measure => cloudLibraryApi(refreshRequest, env, measure));
const refreshQueries = queries, refreshBody = await refresh.text();
env.KATCHAMAK_INVITED_USERS = JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ email: `invited-${i}@test.local`, name: `Writer ${i}` })));
queries = 0; const started = performance.now();
await accountApi(request('/api/admin/users'), env);
const invitationQueries = queries, invitationMs = Math.round(performance.now() - started);
writes = sql.query('SELECT total_changes() AS n').get().n;
await accountApi(request('/api/admin/users'), env);
const repeatedWrites = sql.query('SELECT total_changes() AS n').get().n - writes;
const emailPlan = sql.query('EXPLAIN QUERY PLAN SELECT 1 FROM accounts WHERE email=?').all('owner@test.local').map(r => r.detail).join(' ');
console.log(JSON.stringify({ hotAccountQueries, refreshQueries, snapshotReads: reads, refreshBytes: refreshBody.length, invitationQueries, invitationMs, repeatedWrites, emailPlan }));
if (process.env.AUDIT_BASELINE !== '1') {
  assert.equal(hotAccountQueries, 1, 'Warm account check uses one fresh joined authorization query');
  assert.equal(refreshQueries, 2, 'Idle refresh checks authorization and revision only');
  assert.match(refresh.headers.get('Server-Timing'), /2 queries/);
  assert.equal(reads, 0, 'Unchanged library never loads a full R2 snapshot');
  assert.equal(JSON.parse(refreshBody).unchanged, true);
  assert.equal(invitationQueries, 3, '1000 invitations use one set-based upsert, not 1000 round trips');
  assert.equal(repeatedWrites, 0, 'Unchanged imports do not rewrite rows');
  assert.match(emailPlan, /SEARCH.*INDEX/, 'Email joins avoid correlated full scans');
  headers['X-Katchamak-Account'] = 'another-account';
  assert.equal((await cloudLibraryApi(request('/api/library?revision=7'), env)).status, 409, 'Conditional requests still enforce account isolation');
  headers['X-Katchamak-Account'] = 'owner';
  for (const suffix of ['', '?revision=6', '?revision=bad']) {
    const result = await (await cloudLibraryApi(request('/api/library' + suffix), env)).json();
    assert.deepEqual(result.snapshot, { novels: [], collections: [] });
  }
  assert.equal(reads, 3);
  headers['oai-authenticated-user-id'] = 'member'; headers['oai-authenticated-user-email'] = 'member@test.local';
  await accountApi(request('/api/account'), env);
  sql.exec("INSERT INTO account_access VALUES ('member@test.local','','suspended','manual',0,0,'owner')");
  assert.equal((await accountApi(request('/api/account'), env)).status, 403, 'No cached account decision can bypass immediate suspension');
  console.log('Request performance and isolation checks passed.');
}
