import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(), email: text('email').notNull(), displayName: text('display_name').notNull().default(''),
  avatar: text('avatar').notNull().default(''), preferences: text('preferences').notNull().default('{}'),
  status: text('status').notNull().default('active'), createdAt: integer('created_at').notNull(), lastSeen: integer('last_seen').notNull(),
});
export const accountAccess = sqliteTable('account_access', {
  email: text('email').primaryKey(), displayName: text('display_name').notNull().default(''),
  status: text('status').notNull().default('active'), source: text('source').notNull().default('manual'),
  createdAt: integer('created_at').notNull(), updatedAt: integer('updated_at').notNull(), updatedBy: text('updated_by').notNull(),
});
export const licenses = sqliteTable('licenses', {
  email: text('email').primaryKey(), plan: text('plan').notNull(), expiresAt: integer('expires_at'),
  updatedAt: integer('updated_at').notNull(), updatedBy: text('updated_by').notNull(),
});
export const accountAudit = sqliteTable('account_audit', {
  id: text('id').primaryKey(), actor: text('actor').notNull(), target: text('target').notNull(),
  action: text('action').notNull(), detail: text('detail').notNull(), createdAt: integer('created_at').notNull(),
});
export const cloudLibraries = sqliteTable('cloud_libraries', {
  accountId: text('account_id').primaryKey().references(() => accounts.id),
  revision: integer('revision').notNull().default(0),
  snapshotKey: text('snapshot_key'),
  updatedAt: integer('updated_at').notNull().default(0),
});
export const adminMailOauth=sqliteTable('admin_mail_oauth',{
  state:text('state').primaryKey(),actor:text('actor').notNull(),verifier:text('verifier').notNull(),expiresAt:integer('expires_at').notNull(),
});
export const adminMailConnection=sqliteTable('admin_mail_connection',{
  provider:text('provider').primaryKey(),email:text('email').notNull(),token:text('token').notNull(),updatedAt:integer('updated_at').notNull(),
});
export const adminMailSends=sqliteTable('admin_mail_sends',{
  requestId:text('request_id').primaryKey(),email:text('email').notNull(),status:text('status').notNull(),providerId:text('provider_id'),createdAt:integer('created_at').notNull(),
});
