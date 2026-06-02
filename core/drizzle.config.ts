import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/*.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://ck:ck_dev_password@localhost:5432/ck_dev',
  },
  verbose: true,
  strict: true,
} satisfies Config;
