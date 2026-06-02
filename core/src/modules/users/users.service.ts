/**
 * Users service.
 *
 * Owns the `users` table: upsert on Steam sign-in, admin lookup,
 * ban management. Steam ID is the natural key; we keep a UUID `id`
 * for FK ergonomics.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';

import { DB_TOKEN, type Db } from '../../db/db.module';
import { users, type User } from '../../db/schema';
import type { SteamProfile } from '../auth/steam.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject(DB_TOKEN) private readonly db: Db) {}

  async findBySteamId(steamId: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.steamId, steamId)).limit(1);
    return rows[0] ?? null;
  }

  /**
   * Idempotent: insert a new row on first sign-in, otherwise refresh
   * persona / avatar / lastSignedInAt for existing user.
   */
  async upsertFromSteam(profile: SteamProfile): Promise<User> {
    const now = new Date();
    const existing = await this.findBySteamId(profile.steamId);
    if (existing) {
      const [updated] = await this.db
        .update(users)
        .set({
          personaName: profile.personaName,
          avatarUrl: profile.avatarUrl,
          profileUrl: profile.profileUrl,
          lastSignedInAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, existing.id))
        .returning();
      return updated;
    }

    // First sign-in for this Steam ID. Auto-promote if they're on the
    // env allowlist (CK_ADMIN_STEAM_IDS) — bootstraps the first admin.
    const envAdmins = (process.env.CK_ADMIN_STEAM_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const isAdmin = envAdmins.includes(profile.steamId);

    const [inserted] = await this.db
      .insert(users)
      .values({
        steamId: profile.steamId,
        personaName: profile.personaName,
        avatarUrl: profile.avatarUrl,
        profileUrl: profile.profileUrl,
        isAdmin,
      })
      .returning();
    this.logger.log(
      { steamId: profile.steamId, persona: profile.personaName, isAdmin },
      'new user created',
    );
    return inserted;
  }

  async isAdmin(steamId: string): Promise<boolean> {
    const u = await this.findBySteamId(steamId);
    if (u) return u.isAdmin && !u.isBanned;
    // Fall back to env allowlist for the very first sign-in (before the
    // user row exists yet — admin guard runs on the same request that
    // would create the row).
    const envAdmins = (process.env.CK_ADMIN_STEAM_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return envAdmins.includes(steamId);
  }

  async count(): Promise<number> {
    const [{ value }] = await this.db.select({ value: sql<number>`count(*)::int` }).from(users);
    return value;
  }
}
