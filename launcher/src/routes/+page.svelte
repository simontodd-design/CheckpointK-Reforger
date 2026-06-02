<script lang="ts">
  import { getVersion } from '@tauri-apps/api/app';
  import { openUrl } from '@tauri-apps/plugin-opener';
  import {
    getHealth,
    initiateSteamAuth,
    pollAuthStatus,
    loadSession,
    saveSession,
    clearSession,
    type HealthResponse,
    type CkSession,
  } from '$lib/api';

  let launcherVersion = $state('0.0.1');
  let coreState = $state<'connecting' | 'ok' | 'down'>('connecting');
  let coreInfo = $state<HealthResponse | null>(null);
  let coreError = $state<string | null>(null);

  let session = $state<CkSession | null>(null);
  let authState = $state<'idle' | 'waiting' | 'error'>('idle');
  let authError = $state<string | null>(null);
  let authPollTimer: ReturnType<typeof setInterval> | null = null;

  $effect(() => {
    void getVersion()
      .then((v) => (launcherVersion = v))
      .catch(() => {});
  });

  $effect(() => {
    session = loadSession();
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
    if (authState === 'waiting') return;
    authError = null;
    authState = 'waiting';
    try {
      const { state, startUrl } = await initiateSteamAuth();
      await openUrl(startUrl);
      startPolling(state);
    } catch (err) {
      authError = err instanceof Error ? err.message : String(err);
      authState = 'error';
    }
  }

  function startPolling(state: string) {
    stopPolling();
    const start = Date.now();
    const TIMEOUT_MS = 5 * 60 * 1000;
    authPollTimer = setInterval(async () => {
      if (Date.now() - start > TIMEOUT_MS) {
        stopPolling();
        authError = 'sign-in timed out — please try again';
        authState = 'error';
        return;
      }
      const result = await pollAuthStatus(state);
      if (result.status === 'ok') {
        stopPolling();
        const next: CkSession = {
          token: result.token,
          profile: result.profile,
          signedInAt: Date.now(),
        };
        saveSession(next);
        session = next;
        authState = 'idle';
      } else if (result.status === 'error') {
        stopPolling();
        authError = result.error;
        authState = 'error';
      } else if (result.status === 'unknown') {
        // session expired or never existed — bail
        stopPolling();
        authError = 'sign-in session expired';
        authState = 'error';
      }
      // 'pending' → keep polling
    }, 1500);
  }

  function stopPolling() {
    if (authPollTimer) {
      clearInterval(authPollTimer);
      authPollTimer = null;
    }
  }

  function signOut() {
    clearSession();
    session = null;
    authState = 'idle';
    authError = null;
  }

  function cancelSignIn() {
    stopPolling();
    authState = 'idle';
    authError = null;
  }
</script>

<main>
  <div class="frame">
    <img src="/CKlogo.png" alt="CK" class="logo" />

    <h1 class="display">Checkpoint K</h1>
    <p class="tagline">The cold is the easy part.</p>

    {#if session}
      <div class="signed-in">
        <img src={session.profile.avatarUrl} alt="" class="avatar" />
        <div class="who-name">
          Signed in as <strong>{session.profile.personaName}</strong>
          <span class="who-id">{session.profile.steamId}</span>
        </div>
        <div class="actions">
          <button class="cta" type="button" disabled>Choose character</button>
          <button class="ghost" type="button" onclick={signOut}>Sign out</button>
        </div>
      </div>
    {:else if authState === 'waiting'}
      <div class="waiting">
        <div class="spinner" aria-hidden="true"></div>
        <p class="waiting-text">Waiting for Steam&hellip;</p>
        <p class="waiting-sub">Complete the sign-in in your browser.</p>
        <button class="ghost" type="button" onclick={cancelSignIn}>Cancel</button>
      </div>
    {:else}
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
      {#if authError}
        <p class="error">{authError}</p>
      {/if}
    {/if}

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

  /* signed-in */
  .signed-in {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 56px;
  }
  .avatar {
    width: 72px;
    height: 72px;
    border: 1px solid #2e5b72;
    margin-bottom: 14px;
  }
  .who-name {
    font-size: 13px;
    color: #b9deeb;
    margin-bottom: 24px;
  }
  .who-name strong {
    color: #f4fafc;
    font-weight: 600;
  }
  .who-id {
    display: block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #5fa0bc;
    margin-top: 4px;
    letter-spacing: 0.05em;
  }

  /* waiting */
  .waiting {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 56px;
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 2px solid #1e3d4f;
    border-top-color: #4fcfdf;
    border-radius: 0;
    animation: spin 1s linear infinite;
    margin-bottom: 18px;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .waiting-text {
    font-size: 13px;
    color: #f4fafc;
    margin: 0 0 4px;
    letter-spacing: 0.04em;
  }
  .waiting-sub {
    font-size: 11px;
    color: #5fa0bc;
    font-style: italic;
    margin: 0 0 24px;
  }

  .error {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #c97b70;
    margin: 16px 0 0;
    letter-spacing: 0.04em;
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
