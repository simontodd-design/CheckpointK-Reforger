/**
 * Thin client for CK Core.
 *
 * Phase 1 scope: /health + Steam auth flow (device-flow style polling).
 * Characters, transfers, store come in later bites.
 *
 * In dev, CK Core is at localhost:3001. In prod the launcher reads
 * the value from a build-time env or a settings file. For now we
 * hard-code; PUBLIC_CK_CORE_URL env support comes when we wire the
 * Tauri updater (Phase 1 later).
 */
const DEFAULT_CORE_URL = 'http://localhost:3001';

export const coreUrl: string = DEFAULT_CORE_URL;

export interface HealthResponse {
  status: 'ok' | string;
  service: string;
  version: string;
  uptime_s: number;
  timestamp: string;
}

export interface HealthResult {
  ok: boolean;
  data?: HealthResponse;
  error?: string;
}

export async function getHealth(): Promise<HealthResult> {
  try {
    const res = await fetch(`${coreUrl}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as HealthResponse;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Steam auth ─────────────────────────────────────────────────────────

export interface SteamProfile {
  steamId: string;
  personaName: string;
  avatarUrl: string;
  profileUrl: string;
}

export type AuthStatusResponse =
  | { status: 'unknown' }
  | { status: 'pending' }
  | { status: 'ok'; token: string; profile: SteamProfile }
  | { status: 'error'; error: string };

export async function initiateSteamAuth(): Promise<{ state: string; startUrl: string }> {
  const res = await fetch(`${coreUrl}/auth/steam/initiate`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`initiate HTTP ${res.status}`);
  }
  const data = (await res.json()) as { state: string };
  return {
    state: data.state,
    startUrl: `${coreUrl}/auth/steam/start?state=${encodeURIComponent(data.state)}`,
  };
}

export async function pollAuthStatus(state: string): Promise<AuthStatusResponse> {
  const res = await fetch(
    `${coreUrl}/auth/steam/status?state=${encodeURIComponent(state)}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) {
    return { status: 'error', error: `status HTTP ${res.status}` };
  }
  return (await res.json()) as AuthStatusResponse;
}

// ── Session store ────────────────────────────────────────────────────

const SESSION_KEY = 'ck.session.v1';

export interface CkSession {
  token: string;
  profile: SteamProfile;
  signedInAt: number;
}

export function loadSession(): CkSession | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CkSession;
  } catch {
    return null;
  }
}

export function saveSession(session: CkSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ── Authed fetch ─────────────────────────────────────────────────────

async function authedFetch(path: string, token: string | null): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${coreUrl}${path}`, { headers, signal: AbortSignal.timeout(5000) });
}

// ── Characters ───────────────────────────────────────────────────────

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

export async function listCharacters(token: string | null): Promise<Character[]> {
  const res = await authedFetch('/characters', token);
  if (!res.ok) throw new Error(`characters HTTP ${res.status}`);
  const data = (await res.json()) as { characters: Character[] };
  return data.characters;
}

// ── Maps ─────────────────────────────────────────────────────────────

export interface MapInfo {
  id: string;
  name: string;
  area: string;
  description: string;
  difficulty: 'low' | 'medium' | 'high';
  players: number;
  capacity: number;
  status: 'online' | 'offline' | 'maintenance';
  unlocked: boolean;
}

export async function listMaps(token: string | null): Promise<MapInfo[]> {
  const res = await authedFetch('/maps', token);
  if (!res.ok) throw new Error(`maps HTTP ${res.status}`);
  const data = (await res.json()) as { maps: MapInfo[] };
  return data.maps;
}

// ── News ─────────────────────────────────────────────────────────────

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  tag: 'patch' | 'event' | 'announcement' | 'devlog';
  publishedAt: string;
}

export async function listNews(): Promise<NewsItem[]> {
  const res = await authedFetch('/news', null);
  if (!res.ok) throw new Error(`news HTTP ${res.status}`);
  const data = (await res.json()) as { items: NewsItem[] };
  return data.items;
}
