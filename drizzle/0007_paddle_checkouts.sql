CREATE TABLE IF NOT EXISTS paddle_checkouts (
  id TEXT PRIMARY KEY NOT NULL,
  account_id TEXT NOT NULL UNIQUE REFERENCES accounts(id),
  edition TEXT NOT NULL CHECK (edition IN ('founder', 'standard')),
  price_id TEXT NOT NULL,
  transaction_id TEXT UNIQUE,
  created_at INTEGER NOT NULL
);
