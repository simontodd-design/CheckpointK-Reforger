/**
 * Servers — registered Reforger dedicated server instances.
 *
 * This table holds the CONFIG (name, map, host binding, capacity). The
 * runtime state (running/stopped/players/pid/uptime) lives in-memory in
 * ServersService — it's authoritative on the agent side and ephemeral.
 *
 * Why split: on Core restart we want to remember "server X exists and
 * belongs to host Y on port Z" but we don't trust stale "running" flags
 * — the agent's next state report reconciles.
 */
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const servers = pgTable('servers', {
  id: text('id').primaryKey(), // srv-<map>-<short>
  name: text('name').notNull(),
  mapId: text('map_id').notNull(),
  hostId: text('host_id').notNull(),
  port: integer('port').notNull(),
  capacity: integer('capacity').notNull(),
  modsCount: integer('mods_count').notNull().default(0),
  version: text('version').notNull().default('0.1.0+r190084'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type ServerRow = typeof servers.$inferSelect;
export type NewServerRow = typeof servers.$inferInsert;
