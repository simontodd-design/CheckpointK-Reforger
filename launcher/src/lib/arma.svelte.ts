/**
 * Reactive Arma install store. Pages read `armaStore.current` to know
 * whether Reforger is detected, and the Play page guards the Enter
 * button on `armaStore.isReady`.
 */
import {
  detectArmaInstall,
  validateArmaPath,
  loadStoredArma,
  saveStoredArma,
  clearStoredArma,
  type ArmaInstall,
  type ArmaSource,
  type StoredArma,
} from './arma';

type Status = 'unknown' | 'detecting' | 'ready' | 'invalid' | 'not_found';

class ArmaStore {
  current = $state<StoredArma | null>(null);
  status = $state<Status>('unknown');
  lastError = $state<string | null>(null);

  /** Load from localStorage and re-validate the stored path. */
  async load(): Promise<void> {
    const stored = loadStoredArma();
    if (!stored) {
      this.status = 'unknown';
      return;
    }
    this.current = stored;
    // Re-validate cheaply — the user may have uninstalled or moved the game.
    const v = await validateArmaPath(stored.install.install_dir);
    if (v.valid) {
      this.status = 'ready';
    } else {
      this.status = 'invalid';
      this.lastError = v.error;
    }
  }

  /** Auto-detect via Steam registry + libraryfolders.vdf. */
  async detectAuto(): Promise<void> {
    this.status = 'detecting';
    this.lastError = null;
    try {
      const r = await detectArmaInstall();
      if (r.status === 'found') {
        this.current = saveStoredArma(r.install, 'auto');
        this.status = 'ready';
      } else if (r.status === 'not_found') {
        this.status = 'not_found';
        this.lastError = r.reason;
      } else {
        this.status = 'invalid';
        this.lastError = r.error;
      }
    } catch (err) {
      this.status = 'invalid';
      this.lastError = err instanceof Error ? err.message : String(err);
    }
  }

  /** Manually set + validate a user-picked install directory. */
  async setManual(dir: string): Promise<{ ok: boolean; error?: string }> {
    this.status = 'detecting';
    this.lastError = null;
    const v = await validateArmaPath(dir);
    if (!v.valid || !v.exe_path) {
      this.status = 'invalid';
      this.lastError = v.error ?? 'unknown error';
      return { ok: false, error: this.lastError };
    }
    const install: ArmaInstall = {
      steam_path: null,
      install_dir: dir,
      exe_path: v.exe_path,
    };
    this.current = saveStoredArma(install, 'manual');
    this.status = 'ready';
    return { ok: true };
  }

  clear(): void {
    clearStoredArma();
    this.current = null;
    this.status = 'unknown';
    this.lastError = null;
  }

  get isReady(): boolean {
    return this.status === 'ready' && this.current !== null;
  }

  get install(): ArmaInstall | null {
    return this.current?.install ?? null;
  }

  get source(): ArmaSource | null {
    return this.current?.source ?? null;
  }
}

export const armaStore = new ArmaStore();
