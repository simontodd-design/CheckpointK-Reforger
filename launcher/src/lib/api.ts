/**
 * Thin client for CK Core.
 *
 * Phase 1 scope: just /health. Auth, characters, transfers come next.
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
