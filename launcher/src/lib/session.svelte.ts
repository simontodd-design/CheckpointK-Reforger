/**
 * Global session store.
 *
 * Svelte 5 class with $state — exported as a singleton so every page
 * sees the same instance. localStorage is the source of truth across
 * launcher restarts; this class just mirrors it into reactive state.
 */
import {
  loadSession,
  saveSession as persistSession,
  clearSession as clearPersisted,
  type CkSession,
  type SteamProfile,
} from './api';

class SessionStore {
  current = $state<CkSession | null>(null);

  load() {
    this.current = loadSession();
  }

  set(token: string, profile: SteamProfile) {
    const next: CkSession = { token, profile, signedInAt: Date.now() };
    persistSession(next);
    this.current = next;
  }

  clear() {
    clearPersisted();
    this.current = null;
  }

  get token(): string | null {
    return this.current?.token ?? null;
  }

  get profile(): SteamProfile | null {
    return this.current?.profile ?? null;
  }

  get isSignedIn(): boolean {
    return this.current !== null;
  }
}

export const session = new SessionStore();
