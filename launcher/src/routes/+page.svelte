<script lang="ts">
  import { openUrl } from '@tauri-apps/plugin-opener';
  import { initiateSteamAuth, pollAuthStatus } from '$lib/api';
  import { session } from '$lib/session.svelte';

  let authState = $state<'idle' | 'waiting' | 'error'>('idle');
  let authError = $state<string | null>(null);
  let pollTimer: ReturnType<typeof setInterval> | null = null;

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
    const TIMEOUT = 5 * 60 * 1000;
    pollTimer = setInterval(async () => {
      if (Date.now() - start > TIMEOUT) {
        stopPolling();
        authError = 'sign-in timed out — please try again';
        authState = 'error';
        return;
      }
      const r = await pollAuthStatus(state);
      if (r.status === 'ok') {
        stopPolling();
        session.set(r.token, r.profile);
        authState = 'idle';
      } else if (r.status === 'error') {
        stopPolling();
        authError = r.error;
        authState = 'error';
      } else if (r.status === 'unknown') {
        stopPolling();
        authError = 'sign-in session expired';
        authState = 'error';
      }
    }, 1500);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function cancel() {
    stopPolling();
    authState = 'idle';
    authError = null;
  }
</script>

{#if !session.isSignedIn}
  <!-- Welcome screen -->
  <div class="welcome">
    <img src="/CKlogo.png" alt="CK" class="welcome-logo" />
    <h1 class="display">Checkpoint K</h1>
    <p class="tagline">The cold is the easy part.</p>

    {#if authState === 'waiting'}
      <div class="waiting">
        <div class="spinner" aria-hidden="true"></div>
        <p class="waiting-text">Waiting for Steam&hellip;</p>
        <p class="waiting-sub">Complete the sign-in in your browser.</p>
        <button class="ghost" type="button" onclick={cancel}>Cancel</button>
      </div>
    {:else}
      <div class="welcome-actions">
        <button class="cta" type="button" onclick={signInWithSteam}>
          Sign in with Steam
        </button>
        <button class="ghost" type="button" disabled>Continue without account</button>
      </div>
      {#if authError}
        <p class="error">{authError}</p>
      {/if}
    {/if}
  </div>
{:else}
  <!-- Signed-in dashboard -->
  <div class="dashboard">
    <header class="dash-header">
      <p class="eyebrow">Briefing</p>
      <h1 class="display">Welcome back, {session.profile?.personaName}.</h1>
      <p class="tagline">The cold is the easy part.</p>
    </header>

    <div class="grid">
      <a href="/play" class="card hero">
        <span class="card-eyebrow">Continue</span>
        <h2 class="card-title">Take the airlock</h2>
        <p class="card-body">
          Pick a character. Pick a map. Boots on the ground in under a minute.
        </p>
        <span class="card-cta">Enter foyer &rarr;</span>
      </a>

      <a href="/news" class="card">
        <span class="card-eyebrow">Latest</span>
        <h3 class="card-subtitle">News &amp; patches</h3>
        <p class="card-body">Read what changed since last drop.</p>
      </a>

      <a href="/store" class="card">
        <span class="card-eyebrow">Store</span>
        <h3 class="card-subtitle">Subscriptions &amp; bags</h3>
        <p class="card-body">Bronze, Silver, Gold &mdash; or roll a supply bag.</p>
      </a>

      <a href="/profile" class="card">
        <span class="card-eyebrow">Profile</span>
        <h3 class="card-subtitle">Your record</h3>
        <p class="card-body">Stats, achievements, kill log.</p>
      </a>

      <a href="/settings" class="card">
        <span class="card-eyebrow">Config</span>
        <h3 class="card-subtitle">Settings</h3>
        <p class="card-body">Audio, video, controls, account.</p>
      </a>
    </div>
  </div>
{/if}

<style>
  /* welcome (signed out) */
  .welcome {
    text-align: center;
    max-width: 480px;
    padding: 32px;
  }
  .welcome-logo {
    width: 220px;
    height: 220px;
    object-fit: contain;
    margin-bottom: 24px;
    opacity: 0.95;
  }
  .display {
    font-family: 'Cinzel', Georgia, serif;
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

  .welcome-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 280px;
    margin: 0 auto;
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
  .cta:disabled { border-color: #1e3d4f; color: #5fa0bc; cursor: not-allowed; }
  .ghost {
    border-color: #2e5b72;
    color: #b9deeb;
  }
  .ghost:hover:not(:disabled) { border-color: #5fa0bc; color: #f4fafc; }
  .ghost:disabled { opacity: 0.4; cursor: not-allowed; }

  .waiting {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .spinner {
    width: 32px;
    height: 32px;
    border: 2px solid #1e3d4f;
    border-top-color: #4fcfdf;
    animation: spin 1s linear infinite;
    margin-bottom: 18px;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .waiting-text { font-size: 13px; color: #f4fafc; margin: 0 0 4px; letter-spacing: 0.04em; }
  .waiting-sub { font-size: 11px; color: #5fa0bc; font-style: italic; margin: 0 0 24px; }

  .error {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #c97b70;
    margin: 16px 0 0;
    letter-spacing: 0.04em;
  }

  /* dashboard */
  .dashboard {
    padding: 48px 56px;
    max-width: 1120px;
  }
  .dash-header { margin-bottom: 40px; }
  .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #4fcfdf;
    margin: 0 0 12px;
  }
  .dash-header .display { font-size: 32px; margin: 0 0 8px; }
  .dash-header .tagline { font-size: 13px; margin: 0; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 16px;
  }
  .card {
    display: flex;
    flex-direction: column;
    padding: 24px;
    border: 1px solid #1e3d4f;
    background: rgba(10, 14, 19, 0.4);
    text-decoration: none;
    color: inherit;
    transition: all 160ms ease-out;
  }
  .card:hover {
    border-color: #4fcfdf;
    background: rgba(79, 207, 223, 0.06);
    transform: translateY(-1px);
  }
  .card.hero {
    grid-column: 1 / -1;
    background: linear-gradient(135deg, rgba(79, 207, 223, 0.08) 0%, rgba(10, 14, 19, 0.4) 100%);
    border-color: #2e5b72;
    min-height: 180px;
    justify-content: center;
  }
  .card-eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #4fcfdf;
    margin-bottom: 8px;
  }
  .card-title {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 28px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0 0 12px;
    color: #f4fafc;
  }
  .card-subtitle {
    font-size: 16px;
    margin: 0 0 10px;
    color: #f4fafc;
    font-weight: 500;
  }
  .card-body {
    font-size: 13px;
    color: #b9deeb;
    line-height: 1.5;
    margin: 0;
  }
  .card-cta {
    margin-top: 16px;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #4fcfdf;
  }
</style>
