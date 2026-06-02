/**
 * Characters service — DB-backed.
 *
 * In dev, if a freshly-signed-in user has no characters yet, we seed
 * them three stubs so the launcher's Play page has something to show.
 * Real character creation (via in-game NPC) lands when the mod-side
 * authoring is in.
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { DB_TOKEN, type Db } from '../../db/db.module';
import { characters, users } from '../../db/schema';
import { UsersService } from '../users/users.service';

export interface CharacterDto {
  id: string;
  name: string;
  level: number;
  mapId: string;
  mapName: string;
  alive: boolean;
  lastPlayed: string;
  hours: number;
}

const MAP_NAMES: Record<string, string> = {
  arland: 'Arland',
  everon: 'Everon',
  kolguyev: 'Kolguyev',
};

@Injectable()
export class CharactersService {
  private readonly logger = new Logger(CharactersService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Db,
    private readonly usersSvc: UsersService,
  ) {}

  async listForSteamId(steamId: string): Promise<CharacterDto[]> {
    const user = await this.usersSvc.findBySteamId(steamId);
    if (!user) return [];

    let rows = await this.db
      .select()
      .from(characters)
      .where(eq(characters.userId, user.id))
      .orderBy(desc(characters.lastPlayedAt));

    if (rows.length === 0) {
      await this.seedFor(user.id);
      rows = await this.db
        .select()
        .from(characters)
        .where(eq(characters.userId, user.id))
        .orderBy(desc(characters.lastPlayedAt));
    }

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      level: r.level,
      mapId: r.mapId,
      mapName: MAP_NAMES[r.mapId] ?? r.mapId,
      alive: r.alive,
      lastPlayed: r.lastPlayedAt.toISOString(),
      hours: r.hoursPlayed,
    }));
  }

  private async seedFor(userId: string): Promise<void> {
    const now = Date.now();
    await this.db.insert(characters).values([
      {
        userId,
        name: 'Marko Petrov',
        level: 14,
        mapId: 'arland',
        alive: true,
        hoursPlayed: 42,
        lastPlayedAt: new Date(now - 12 * 3600 * 1000),
      },
      {
        userId,
        name: 'Yana',
        level: 7,
        mapId: 'everon',
        alive: true,
        hoursPlayed: 18,
        lastPlayedAt: new Date(now - 5 * 24 * 3600 * 1000),
      },
      {
        userId,
        name: 'Dimitri',
        level: 22,
        mapId: 'kolguyev',
        alive: false,
        hoursPlayed: 81,
        lastPlayedAt: new Date(now - 30 * 24 * 3600 * 1000),
      },
    ]);
    this.logger.log({ userId }, 'seeded stub characters for new user');
  }

  // Reserved — for future create / kill / transfer flows.
  async killCharacter(characterId: string, userId: string): Promise<void> {
    await this.db
      .update(characters)
      .set({ alive: false, updatedAt: new Date() })
      .where(and(eq(characters.id, characterId), eq(characters.userId, userId)));
  }
}
