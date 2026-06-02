/**
 * CK Manager API client.
 *
 * Talks to CK Core's /admin/* endpoints. All calls require a Bearer
 * JWT from the same Steam OAuth flow as the launcher — non-admin
 * steam_ids get 403 Forbidden, which the UI surfaces as "not authorised".
 */
const CORE_URL = 'http://localhost:3001';

export const coreUrl = CORE_URL;

// ── auth flow (mirrors launcher) ─────────────────────────────────────

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
  const res = await fetch(`${CORE_URL}/auth/steam/initiate`, {
    method: 'POST',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`initiate HTTP ${res.status}`);
  const data = (await res.json()) as { state: string };
  return {
    state: data.state,
    startUrl: `${CORE_URL}/auth/steam/start?state=${encodeURIComponent(data.state)}`,
  };
}

export async function pollAuthStatus(state: string): Promise<AuthStatusResponse> {
  const res = await fetch(
    `${CORE_URL}/auth/steam/status?state=${encodeURIComponent(state)}`,
    { headers: { Accept: 'application/json' } },
  );
  if (!res.ok) return { status: 'error', error: `status HTTP ${res.status}` };
  return (await res.json()) as AuthStatusResponse;
}

// ── auth-bearing fetch wrapper ───────────────────────────────────────

async function authed<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${CORE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(5000),
  });
  if (res.status === 403) throw new Error('forbidden: not an admin');
  if (res.status === 401) throw new Error('unauthorised: please sign in again');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

// ── health (public, no auth) ─────────────────────────────────────────

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  uptime_s: number;
  timestamp: string;
}

export async function getHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${CORE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}

// ── servers ──────────────────────────────────────────────────────────

export type ServerState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'crashed'
  | 'updating';

export interface CkServer {
  id: string;
  name: string;
  mapId: string;
  mapName: string;
  hostId: string;
  port: number;
  publicAddress: string;
  state: ServerState;
  players: number;
  capacity: number;
  uptimeS: number;
  pid: number | null;
  version: string;
  lastError: string | null;
  modsCount: number;
}

export async function listServers(token: string): Promise<CkServer[]> {
  const data = await authed<{ servers: CkServer[] }>('/admin/servers', token);
  return data.servers;
}

export interface CreateServerInput {
  name: string;
  mapId: string;
  hostId: string;
  port: number;
  capacity: number;
}

export async function createServer(token: string, input: CreateServerInput): Promise<CkServer> {
  return authed<CkServer>('/admin/servers', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export interface MapOption {
  id: string;
  name: string;
  difficulty: 'low' | 'medium' | 'high';
}

// Hardcoded for v1 — matches /maps but doesn't require player JWT scope.
// When we add a /admin/maps endpoint this becomes a real fetch.
export const availableMaps: MapOption[] = [
  { id: 'arland', name: 'Arland', difficulty: 'low' },
  { id: 'everon', name: 'Everon', difficulty: 'medium' },
  { id: 'kolguyev', name: 'Kolguyev', difficulty: 'high' },
];

export async function getServer(token: string, id: string): Promise<CkServer> {
  return authed<CkServer>(`/admin/servers/${encodeURIComponent(id)}`, token);
}

export async function startServer(token: string, id: string): Promise<CkServer> {
  return authed<CkServer>(`/admin/servers/${encodeURIComponent(id)}/start`, token, {
    method: 'POST',
  });
}

export async function stopServer(token: string, id: string): Promise<CkServer> {
  return authed<CkServer>(`/admin/servers/${encodeURIComponent(id)}/stop`, token, {
    method: 'POST',
  });
}

export async function restartServer(token: string, id: string): Promise<CkServer> {
  return authed<CkServer>(`/admin/servers/${encodeURIComponent(id)}/restart`, token, {
    method: 'POST',
  });
}

// ── hosts ────────────────────────────────────────────────────────────

export interface HostStatus {
  hostId: string;
  agentVersion: string;
  ts: number;
  osInfo: { platform: string; release: string; hostname: string; arch: string };
  metrics: {
    cpuPct: number;
    memTotalMB: number;
    memUsedMB: number;
    memPct: number;
    uptimeS: number;
    diskFreeGB: number;
    diskTotalGB: number;
  };
  reforgerServer: { installed: boolean; path: string | null; exePath: string | null };
  steamcmd: { installed: boolean; path: string | null };
  receivedAt: number;
}

export interface CkHost {
  hostId: string;
  version: string;
  connectedAt: string;
  state: 'online' | 'offline';
  status: HostStatus | null;
}

export async function listHosts(token: string): Promise<CkHost[]> {
  const data = await authed<{ hosts: CkHost[] }>('/admin/hosts', token);
  return data.hosts;
}

export async function getHost(token: string, id: string): Promise<CkHost> {
  return authed<CkHost>(`/admin/hosts/${encodeURIComponent(id)}`, token);
}
