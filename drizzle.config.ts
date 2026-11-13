import { defineConfig } from 'drizzle-kit';
export default defineConfig({ dialect: 'sqlite', schema: './db/accounts-schema.ts', out: './drizzle' });
