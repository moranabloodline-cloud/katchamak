CREATE TABLE IF NOT EXISTS clerk_prototype_identities (
  issuer TEXT NOT NULL,
  subject TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  linked_at INTEGER NOT NULL,
  PRIMARY KEY (issuer, subject),
  UNIQUE (issuer, account_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS clerk_prototype_link_intents (
  token_hash TEXT PRIMARY KEY NOT NULL,
  legacy_account_id TEXT NOT NULL REFERENCES accounts(id),
  legacy_email TEXT NOT NULL,
  clerk_issuer TEXT NOT NULL,
  clerk_subject TEXT NOT NULL,
  clerk_session_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  claim_id TEXT UNIQUE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS clerk_prototype_link_expiry ON clerk_prototype_link_intents (expires_at);
