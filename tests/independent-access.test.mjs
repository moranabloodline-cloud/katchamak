import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Database } from 'bun:sqlite';
import { accountApi } from '../scripts/accounts-runtime.mjs';
import { cloudLibraryApi } from '../scripts/cloud-library-runtime.mjs';
import { independentDraftopusAccount, legacyDraftopusAccount, legacyDraftopusEmails } from '../scripts/draftopus-identities.mjs';

globalThis.accountApi = accountApi;
const sql = new Database(':memory:');
for (const file of readdirSync('drizzle').filter(name => name.endsWith('.sql')).sort()) {
  for (const statement of readFileSync('drizzle/' + file, 'utf8').split('--> statement-breakpoint')) {
    if (statement.trim()) sql.exec(statement);
  }
}
const DB = {
  prepare(text) {
    let values = [];
    const command = {
      bind(...args) { values = args; return command; },
      async first() { return sql.query(text).get(...values); },
      async run() { return sql.query(text).run(...values); },
    };
    return command;
  },
  async batch(statements) { return Promise.all(statements.map(statement => statement.run())); },
};
const env = { DB, KATCHAMAK_ADMIN_EMAIL: 'owner@example.test', DRAFTOPUS_LEGACY_EMAILS: '["owner@example.test","member@example.test"]' };
const emails = legacyDraftopusEmails(env);
const now = Date.now();
sql.query('INSERT INTO accounts (id,email,created_at,last_seen) VALUES (?,?,?,?)').run('legacy-canonical', 'member@example.test', now, now);
sql.query("INSERT INTO licenses (email,plan,updated_at,updated_by) VALUES (?,'lifetime',?,?)").run('member@example.test', now, 'owner');
sql.query('INSERT INTO cloud_libraries (account_id,revision,snapshot_key) VALUES (?,?,?)').run('legacy-canonical', 7, 'original-snapshot');
const legacy = legacyDraftopusAccount(new Request('https://app.example.test', {
  headers: { 'oai-authenticated-user-id': 'legacy-canonical', 'oai-authenticated-user-email': 'member@example.test' },
}), emails);
const issuer = 'https://test-project.supabase.co';
assert.equal(await independentDraftopusAccount(DB, issuer, { id: crypto.randomUUID(), email: legacy.email }, emails), null);

const verified = { id: crypto.randomUUID(), email: 'writer@example.test' };
const signedIn = await independentDraftopusAccount(DB, issuer, verified, emails);
assert.notEqual(signedIn.id, verified.id);
assert.deepEqual(await independentDraftopusAccount(DB, issuer, verified, emails), signedIn);
assert.equal(sql.query('SELECT count(*) AS total FROM membership_purchases').get().total, 0);
assert.equal(sql.query('SELECT count(*) AS total FROM licenses').get().total, 1);

const accountRequest = new Request('https://app.example.test/api/account');
assert.equal((await (await accountApi(accountRequest, env, undefined, signedIn)).json()).license.active, false);
assert.equal((await (await accountApi(accountRequest, env, undefined, legacy)).json()).license.active, true);
const library = new Request('https://app.example.test/api/library');
assert.equal((await cloudLibraryApi(library, env, undefined, signedIn)).status, 403);

sql.query(`INSERT INTO membership_purchases
  (account_id,payment_ref,edition,status,purchased_at,amount_minor,currency,license_id)
  VALUES (?,?,'standard','paid',?,2000,'EUR',?)`).run(signedIn.id, 'paddle:txn_localtest01', now, crypto.randomUUID());
assert.deepEqual((await (await accountApi(accountRequest, env, undefined, signedIn)).json()).license, { plan: 'lifetime', active: true });
assert.equal((await cloudLibraryApi(library, env, undefined, signedIn)).status, 503, 'A verified license passes the entitlement check before storage is accessed.');
assert.equal(sql.query('SELECT snapshot_key FROM cloud_libraries WHERE account_id=?').get(legacy.id).snapshot_key, 'original-snapshot');
console.log('Independent registration, read-only gating, original account preservation and paid license activation passed.');
