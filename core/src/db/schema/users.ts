/**
 * Users — the Steam-authenticated identity record.
 *
 * Created (or refreshed) every time a Steam OpenID callback succeeds.
 * `is_admin` gates CK Manager access — promoting an operator means
 * flipping this bit. Until the DB-backed admin flow is wired into the
 * Manager's user management UI, set it via a one-off SQL UPDATE or
 * fall back to CK_ADMIN_STEAM_IDS env var.
 */
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  steamId: text('steam_id').notNull().unique(),
  personaName: text('persona_name').notNull(),
  avatarUrl: text('avatar_url').notNull(),
  profileUrl: text('profile_url').notNull().default(''),
  isAdmin: boolean('is_admin').notNull().default(false),
  isBanned: boolean('is_banned').notNull().default(false),
  banReason: text('ban_reason'),
  firstSignedInAt: timestamp('first_signed_in_at').notNull().defaultNow(),
  lastSignedInAt: timestamp('last_signed_in_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
