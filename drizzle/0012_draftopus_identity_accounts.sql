CREATE TABLE IF NOT EXISTS draftopus_identity_accounts (
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (issuer, subject),
  UNIQUE (issuer, account_id)
);
