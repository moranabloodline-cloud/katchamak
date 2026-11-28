CREATE TABLE IF NOT EXISTS membership_purchases (
  account_id TEXT PRIMARY KEY NOT NULL REFERENCES accounts(id),
  payment_ref TEXT NOT NULL UNIQUE CHECK (length(trim(payment_ref)) > 0),
  edition TEXT NOT NULL CHECK (edition IN ('founder', 'standard')),
  founder_number INTEGER UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('paid', 'refunded')),
  purchased_at INTEGER NOT NULL CHECK (typeof(purchased_at) = 'integer' AND purchased_at > 0),
  amount_minor INTEGER NOT NULL CHECK (typeof(amount_minor) = 'integer' AND amount_minor > 0),
  currency TEXT NOT NULL CHECK (currency GLOB '[A-Z][A-Z][A-Z]'),
  license_id TEXT UNIQUE,
  CHECK (
    (edition = 'founder' AND typeof(founder_number) = 'integer' AND founder_number BETWEEN 1 AND 500)
    OR (edition = 'standard' AND founder_number IS NULL)
  )
);
