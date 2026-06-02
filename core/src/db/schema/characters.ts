/**
 * Characters — a player's avatar on a given map.
 *
 * One user can have multiple characters; in Phase 1 we cap to 3, with
 * subscription tiers granting +1 or +2 extra slots. Death sets `alive`
 * to false and a fresh character is rolled.
 *
 * Inventory, position, stats, and effects are heavy and per-map — those
 * live in separate tables added in Phase 2. The dedicated server is the
 * authority on per-character runtime state; Core stores the long-lived
 * metadata.
 */
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { users } from './users';

export const characters = pgTable(
  'characters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    level: integer('level').notNull().default(1),
    mapId: text('map_id').notNull(),
    alive: boolean('alive').notNull().default(true),
    hoursPlayed: doublePrecision('hours_played').notNull().default(0),
    lastPlayedAt: timestamp('last_played_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('characters_user_idx').on(t.userId),
    aliveIdx: index('characters_alive_idx').on(t.userId, t.alive),
  }),
);

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;
