import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Phase 0 placeholder. Lets `bun run db:migrate` succeed against an empty
 * DB so the smoke test passes. Deleted in Phase 1 when the real character /
 * inventory / quest schema lands.
 */
export const schemaMigrations = pgTable('_phase0_placeholder', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
