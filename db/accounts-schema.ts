import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(), email: text('email').notNull(), displayName: text('display_name').notNull().default(''),
  avatar: text('avatar').notNull().default(''), preferences: text('preferences').notNull().default('{}'),
  status: text('status').notNull().default('active'), createdAt: integer('created_at').notNull(), lastSeen: integer('last_seen').notNull(),
});
export const licenses = sqliteTable('licenses', {
  email: text('email').primaryKey(), plan: text('plan').notNull(), expiresAt: integer('expires_at'),
  updatedAt: integer('updated_at').notNull(), updatedBy: text('updated_by').notNull(),
});
export const accountAudit = sqliteTable('account_audit', {
  id: text('id').primaryKey(), actor: text('actor').notNull(), target: text('target').notNull(),
  action: text('action').notNull(), detail: text('detail').notNull(), createdAt: integer('created_at').notNull(),
});
