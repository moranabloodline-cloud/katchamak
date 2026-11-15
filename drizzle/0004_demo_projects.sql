CREATE TABLE IF NOT EXISTS demo_catalog (demo_key TEXT PRIMARY KEY,object_key TEXT NOT NULL,title TEXT NOT NULL,version INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS account_demos (account_id TEXT NOT NULL,demo_key TEXT NOT NULL,project_id TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(account_id,demo_key));
