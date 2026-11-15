CREATE TABLE IF NOT EXISTS `account_access` (
  `email` text PRIMARY KEY NOT NULL,
  `display_name` text DEFAULT '' NOT NULL,
  `status` text DEFAULT 'active' NOT NULL,
  `source` text DEFAULT 'manual' NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `updated_by` text NOT NULL
);
