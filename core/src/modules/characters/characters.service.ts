/**
 * Characters service.
 *
 * Phase 1 bite 3 (now): in-memory stub seeded per signed-in steam_id.
 * Bite 4: backed by Drizzle ORM against `characters` table in Postgres.
 */
import { Injectable } from '@nestjs/common';

export interface Character {
  id: string;
  name: string;
  level: number;
  mapId: string;
  mapName: string;
  alive: boolean;
  lastPlayed: string;
  hours: number;
}

@Injectable()
export class CharactersService {
  // steam_id → characters
  private readonly chars = new Map<string, Character[]>();

  list(steamId: string): Character[] {
    if (!this.chars.has(steamId)) {
      // Seed fresh players with one stub character so the foyer isn't
      // empty during dev. DB-backed version lets them create on first
      // map entry instead.
      this.chars.set(steamId, this.seedFor(steamId));
    }
    return this.chars.get(steamId) ?? [];
  }

  private seedFor(steamId: string): Character[] {
    const seed: Character[] = [
      {
        id: `char-${steamId}-1`,
        name: 'Marko Petrov',
        level: 14,
        mapId: 'arland',
        mapName: 'Arland',
        alive: true,
        lastPlayed: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        hours: 42,
      },
      {
        id: `char-${steamId}-2`,
        name: 'Yana',
        level: 7,
        mapId: 'everon',
        mapName: 'Everon',
        alive: true,
        lastPlayed: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        hours: 18,
      },
      {
        id: `char-${steamId}-3`,
        name: 'Dimitri',
        level: 22,
        mapId: 'kolguyev',
        mapName: 'Kolguyev',
        alive: false,
        lastPlayed: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
        hours: 81,
      },
    ];
    return seed;
  }
}
