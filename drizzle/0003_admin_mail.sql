CREATE TABLE IF NOT EXISTS admin_mail_oauth (state TEXT PRIMARY KEY, actor TEXT NOT NULL, verifier TEXT NOT NULL, expires_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS admin_mail_connection (provider TEXT PRIMARY KEY, email TEXT NOT NULL, token TEXT NOT NULL, updated_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS admin_mail_sends (request_id TEXT PRIMARY KEY, email TEXT NOT NULL, status TEXT NOT NULL, provider_id TEXT, created_at INTEGER NOT NULL);
