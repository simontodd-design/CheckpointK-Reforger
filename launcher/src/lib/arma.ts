/**
 * Arma Reforger install detection — JS wrappers around the Rust commands
 * in src-tauri/src/arma.rs.
 *
 * The launcher persists its known-good Arma path to localStorage so we
 * don't re-scan the registry every boot — a fresh detect only runs if:
 *   - the stored path no longer validates (game uninstalled or moved)
 *   - the user clicks "Detect again" in Settings
 */
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

export interface ArmaInstall {
  steam_path: string | null;
  install_dir: string;
  exe_path: string;
}

export type DetectionResult =
  | { status: 'found'; install: ArmaInstall }
  | { status: 'not_found'; reason: string }
  | { status: 'error'; error: string };

export interface ValidationResult {
  valid: boolean;
  exe_path: string | null;
  error: string | null;
}

export async function detectArmaInstall(): Promise<DetectionResult> {
  return invoke<DetectionResult>('detect_arma_install');
}

export async function validateArmaPath(path: string): Promise<ValidationResult> {
  return invoke<ValidationResult>('validate_arma_path', { path });
}

/**
 * Open the OS file picker, scoped to directory selection. Returns null
 * if the user cancels.
 */
export async function pickArmaDirectory(): Promise<string | null> {
  const result = await open({
    directory: true,
    multiple: false,
    title: 'Pick your Arma Reforger install folder',
  });
  if (!result) return null;
  return Array.isArray(result) ? (result[0] ?? null) : result;
}

// ── persistence ──────────────────────────────────────────────────────

const ARMA_KEY = 'ck.arma.v1';

export type ArmaSource = 'auto' | 'manual';

export interface StoredArma {
  install: ArmaInstall;
  source: ArmaSource;
  verifiedAt: number;
}

export function loadStoredArma(): StoredArma | null {
  if (typeof localStorage === 'undefined') return null;
  const raw = localStorage.getItem(ARMA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredArma;
  } catch {
    return null;
  }
}

export function saveStoredArma(install: ArmaInstall, source: ArmaSource): StoredArma {
  const stored: StoredArma = { install, source, verifiedAt: Date.now() };
  localStorage.setItem(ARMA_KEY, JSON.stringify(stored));
  return stored;
}

export function clearStoredArma(): void {
  localStorage.removeItem(ARMA_KEY);
}
