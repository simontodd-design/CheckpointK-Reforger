/**
 * Auth service — JWT issuance + pending Steam-auth state.
 *
 * The launcher can't directly observe the browser's Steam callback,
 * so we use a polling handoff:
 *
 *   1. Launcher calls /auth/steam/initiate → we return a `state` UUID
 *      and mark it pending in memory.
 *   2. Launcher opens browser to /auth/steam/start?state=<state>.
 *   3. Browser completes Steam flow, hits /auth/steam/callback?state=...
 *      We verify with Steam, mint a JWT, store it against the state.
 *   4. Launcher has been polling /auth/steam/status?state=<state>.
 *      Next poll returns { status: 'ok', token, profile }.
 *
 * State map is in-memory for v1 (single CK Core process). When we
 * scale to multi-host CK Core, this moves to Memurai with a TTL.
 *
 * Each pending state lives for 10 minutes max. Completed states are
 * one-shot — the launcher's poll deletes the entry after retrieving.
 */
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID, createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';

import type { SteamProfile } from './steam.service';

const STATE_TTL_MS = 10 * 60 * 1000;
const JWT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

type PendingState =
  | { status: 'pending'; createdAt: number }
  | { status: 'ok'; createdAt: number; token: string; profile: SteamProfile }
  | { status: 'error'; createdAt: number; error: string };

export interface CkClaims {
  sub: string; // steam_id
  persona: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly states = new Map<string, PendingState>();
  private readonly jwtSecret: string;

  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must be set and at least 32 chars');
    }
    this.jwtSecret = secret;

    // Periodic GC of expired pending states.
    setInterval(() => this.gc(), 60_000).unref?.();
  }

  /**
   * Begin a new pending auth flow. Returns the state UUID the launcher
   * should pass to /auth/steam/start and poll on /auth/steam/status.
   */
  initiate(): string {
    const state = randomUUID();
    this.states.set(state, { status: 'pending', createdAt: Date.now() });
    return state;
  }

  /**
   * Called from /auth/steam/callback after Steam verification succeeds.
   * Mints a JWT and stores it against the pending state.
   */
  completeAuth(state: string, profile: SteamProfile): string {
    const entry = this.states.get(state);
    if (!entry) {
      throw new Error(`unknown auth state: ${state}`);
    }
    if (entry.status !== 'pending') {
      throw new Error(`auth state already resolved: ${entry.status}`);
    }
    const token = this.signCk(profile);
    this.states.set(state, {
      status: 'ok',
      createdAt: entry.createdAt,
      token,
      profile,
    });
    return token;
  }

  /**
   * Called from /auth/steam/callback if verification fails. Records the
   * error so the launcher's next poll can surface it instead of timing out.
   */
  failAuth(state: string, error: string): void {
    const entry = this.states.get(state);
    if (!entry) return;
    this.states.set(state, {
      status: 'error',
      createdAt: entry.createdAt,
      error,
    });
  }

  /**
   * Read the current status for a state. If status is `ok` or `error`,
   * the entry is consumed (one-shot delivery) so it can't be replayed.
   */
  pollStatus(
    state: string,
  ):
    | { status: 'unknown' }
    | { status: 'pending' }
    | { status: 'ok'; token: string; profile: SteamProfile }
    | { status: 'error'; error: string } {
    const entry = this.states.get(state);
    if (!entry) return { status: 'unknown' };
    if (Date.now() - entry.createdAt > STATE_TTL_MS) {
      this.states.delete(state);
      return { status: 'unknown' };
    }
    if (entry.status === 'pending') return { status: 'pending' };
    // one-shot — consume on read
    this.states.delete(state);
    if (entry.status === 'ok') {
      return { status: 'ok', token: entry.token, profile: entry.profile };
    }
    return { status: 'error', error: entry.error };
  }

  /**
   * Verify a CK session JWT and return its claims. Throws if invalid.
   */
  verifyCk(token: string): CkClaims {
    return jwt.verify(token, this.jwtSecret, {
      algorithms: ['HS256'],
    }) as CkClaims;
  }

  private signCk(profile: SteamProfile): string {
    const now = Math.floor(Date.now() / 1000);
    const claims: CkClaims = {
      sub: profile.steamId,
      persona: profile.personaName,
      iat: now,
      exp: now + JWT_TTL_SECONDS,
    };
    return jwt.sign(claims, this.jwtSecret, { algorithm: 'HS256' });
  }

  private gc() {
    const now = Date.now();
    let dropped = 0;
    for (const [k, v] of this.states) {
      if (now - v.createdAt > STATE_TTL_MS) {
        this.states.delete(k);
        dropped++;
      }
    }
    if (dropped > 0) {
      this.logger.debug({ dropped }, 'GC dropped expired auth states');
    }
  }

  /**
   * Stable, non-reversible fingerprint of a state — only used for
   * logging so we can correlate logs without leaking the state token.
   */
  fingerprint(state: string): string {
    return createHash('sha256').update(state).digest('hex').slice(0, 8);
  }
}
