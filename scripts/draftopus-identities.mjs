const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanEmail = value => typeof value === 'string' ? value.trim().toLowerCase() : '';

export function legacyDraftopusEmails(env) {
  if (!env.DRAFTOPUS_LEGACY_EMAILS) return null;
  try {
    const list = JSON.parse(env.DRAFTOPUS_LEGACY_EMAILS);
    if (Array.isArray(list) && list.length && list.every(value => emailPattern.test(cleanEmail(value)))) {
      return new Set(list.map(cleanEmail));
    }
  } catch {
    // A malformed access list does not admit other identities.
  }
  return new Set();
}

export function legacyDraftopusAccount(request, emails) {
  const id = request.headers.get('oai-authenticated-user-id');
  const email = cleanEmail(request.headers.get('oai-authenticated-user-email'));
  return id && email && (!emails || emails.has(email)) ? { id, email } : null;
}

export async function independentDraftopusAccount(db, issuer, user, reservedEmails) {
  if (typeof user?.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(user.id)) return null;
  const email = cleanEmail(user.email);
  const find = () => db.prepare(`SELECT a.id,a.email FROM draftopus_identity_accounts i
    JOIN accounts a ON a.id=i.account_id WHERE i.issuer=? AND i.subject=?`).bind(issuer, user.id).first();
  const account = await find();
  if (account) return { ...account, independent: true };
  if (!emailPattern.test(email) || email.length > 254 || reservedEmails.has(email)) return null;

  const id = crypto.randomUUID();
  const now = Date.now();
  await db.batch([
    db.prepare(`INSERT INTO accounts (id,email,created_at,last_seen) SELECT ?,?,?,?
      WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE lower(trim(email))=?)
      AND NOT EXISTS (SELECT 1 FROM licenses WHERE lower(trim(email))=?)
      AND NOT EXISTS (SELECT 1 FROM account_access WHERE lower(trim(email))=?)
      AND NOT EXISTS (SELECT 1 FROM draftopus_identity_accounts WHERE issuer=? AND subject=?)`).bind(id, email, now, now, email, email, email, issuer, user.id),
    db.prepare(`INSERT INTO draftopus_identity_accounts (issuer,subject,account_id,created_at)
      SELECT ?,?,id,? FROM accounts WHERE id=?`).bind(issuer, user.id, now, id),
  ]);
  const created = await find();
  return created ? { ...created, independent: true } : null;
}
