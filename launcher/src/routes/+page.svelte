<script lang="ts">
  import { getVersion } from '@tauri-apps/api/app';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { getHealth, coreUrl, type HealthResponse } from '$lib/api';

  let launcherVersion = $state('0.0.1');
  let coreState = $state<'connecting' | 'ok' | 'down'>('connecting');
  let coreInfo = $state<HealthResponse | null>(null);
  let coreError = $state<string | null>(null);

  $effect(() => {
    void getVersion()
      .then((v) => (launcherVersion = v))
      .catch(() => {});
  });

  $effect(() => {
    void refreshHealth();
    const interval = setInterval(() => void refreshHealth(), 30_000);
    return () => clearInterval(interval);
  });

  async function refreshHealth() {
    const result = await getHealth();
    if (result.ok && result.data) {
      coreState = 'ok';
      coreInfo = result.data;
      coreError = null;
    } else {
      coreState = 'down';
      coreInfo = null;
      coreError = result.error ?? 'unknown error';
    }
  }

  async function signInWithSteam() {
    // Open Steam OAuth in the user's default browser via Tauri's opener.
    // CK Core handles the redirect to Steam + the callback. Next bite
    // wires a localhost listener here to capture the JWT back.
    await openUrl(`${coreUrl}/auth/steam/start`);
  }
</script>

<main>
  <div class="frame">
    <img src="/CKlogo.png" alt="CK" class="logo" />

    <h1 class="display">Checkpoint K</h1>
    <p class="tagline">The cold is the easy part.</p>

    <div class="actions">
      <button
        class="cta"
        type="button"
        disabled={coreState !== 'ok'}
        onclick={signInWithSteam}
      >
        Sign in with Steam
      </button>
      <button class="ghost" type="button">Continue without account</button>
    </div>

    <div class="footer">
      <span class="version">Launcher v{launcherVersion}</span>
      <span class="dot">·</span>
      <span class="version">Mod &mdash;</span>
      <span class="dot">·</span>

      {#if coreState === 'connecting'}
        <span class="version connecting">Core connecting&hellip;</span>
      {:else if coreState === 'ok' && coreInfo}
        <span class="version ok">
          <span class="indicator" aria-hidden="true"></span>
          Core v{coreInfo.version}
        </span>
      {:else}
        <span class="version down" title={coreError ?? ''}>
          <span class="indicator" aria-hidden="true"></span>
          Core unreachable
        </span>
      {/if}
    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    background: #000000;
    color: #f4fafc;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  main {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: radial-gradient(ellipse at 50% 40%, #0f1b26 0%, #05080b 60%, #000000 100%);
    padding: 32px;
  }

  .frame {
    text-align: center;
    max-width: 480px;
  }

  .logo {
    width: 220px;
    height: 220px;
    object-fit: contain;
    margin-bottom: 24px;
    opacity: 0.95;
  }

  .display {
    font-family: 'Cinzel', 'Spectral SC', Georgia, serif;
    font-size: 40px;
    font-weight: 500;
    letter-spacing: 0.06em;
    color: #f4fafc;
    margin: 0 0 10px;
    line-height: 1;
  }

  .tagline {
    font-size: 14px;
    color: #5fa0bc;
    letter-spacing: 0.04em;
    font-style: italic;
    margin: 0 0 40px;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 280px;
    margin: 0 auto 56px;
  }

  .cta,
  .ghost {
    padding: 12px 20px;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 500;
    font-family: inherit;
    border: 1px solid;
    background: transparent;
    cursor: pointer;
    transition: all 120ms ease-out;
  }

  .cta {
    border-color: #9dd0e8;
    color: #f4fafc;
    background: rgba(157, 208, 232, 0.08);
  }
  .cta:hover:not(:disabled) {
    border-color: #4fcfdf;
    background: rgba(79, 207, 223, 0.12);
  }
  .cta:disabled {
    border-color: #1e3d4f;
    color: #5fa0bc;
    background: transparent;
    cursor: not-allowed;
  }

  .ghost {
    border-color: #2e5b72;
    color: #b9deeb;
  }
  .ghost:hover {
    border-color: #5fa0bc;
    color: #f4fafc;
  }

  .footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-family: 'JetBrains Mono', 'Cascadia Code', monospace;
    font-size: 10px;
    letter-spacing: 0.10em;
    color: #2e5b72;
  }

  .dot {
    color: #1e3d4f;
  }

  .version {
    color: #5fa0bc;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .indicator {
    width: 6px;
    height: 6px;
    display: inline-block;
  }

  .ok .indicator {
    background: #4fcfdf;
  }
  .down .indicator {
    background: #8e382c;
  }
  .down {
    color: #c97b70;
  }
  .connecting {
    color: #5fa0bc;
    opacity: 0.7;
  }
</style>
