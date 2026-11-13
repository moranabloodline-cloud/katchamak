CREATE TABLE `account_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`target` text NOT NULL,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`avatar` text DEFAULT '' NOT NULL,
	`preferences` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `licenses` (
	`email` text PRIMARY KEY NOT NULL,
	`plan` text NOT NULL,
	`expires_at` integer,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL
);
