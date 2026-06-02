/**
 * Admin session store for CK Manager.
 *
 * Mirrors the launcher's session.svelte.ts but lives under its own
 * localStorage key so a developer can sign in to both apps as the
 * same Steam account without conflict.
 */
import type { SteamProfile } from './api';

const SESSION_KEY = 'ck.manager.session.v1';

interface StoredSession {
  token: string;
  profile: SteamProfile;
  signedInAt: number;
}

class ManagerSession {
  current = $state<StoredSession | null>(null);

  load() {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    try {
      this.current = JSON.parse(raw) as StoredSession;
    } catch {
      this.current = null;
    }
  }

  set(token: string, profile: SteamProfile) {
    const next: StoredSession = { token, profile, signedInAt: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    this.current = next;
  }

  clear() {
    localStorage.removeItem(SESSION_KEY);
    this.current = null;
  }

  get token(): string | null { return this.current?.token ?? null; }
  get profile(): SteamProfile | null { return this.current?.profile ?? null; }
  get isSignedIn(): boolean { return this.current !== null; }
}

export const session = new ManagerSession();
