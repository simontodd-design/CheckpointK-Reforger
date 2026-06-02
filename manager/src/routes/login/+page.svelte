<script lang="ts">
  import { goto } from '$app/navigation';
  import { initiateSteamAuth, pollAuthStatus } from '$lib/api';
  import { session } from '$lib/session.svelte';

  let phase = $state<'idle' | 'waiting' | 'error'>('idle');
  let err = $state<string | null>(null);
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  $effect(() => {
    // If they're already signed in, send them to the dashboard.
    session.load();
    if (session.isSignedIn) void goto('/');
  });

  async function signIn() {
    if (phase === 'waiting') return;
    err = null;
    phase = 'waiting';
    try {
      const { state, startUrl } = await initiateSteamAuth();
      // Open Steam OAuth in a new browser tab — the user completes there.
      window.open(startUrl, '_blank');
      startPolling(state);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
      phase = 'error';
    }
  }

  function startPolling(state: string) {
    stopPolling();
    const t0 = Date.now();
    const TIMEOUT = 5 * 60 * 1000;
    pollTimer = setInterval(async () => {
      if (Date.now() - t0 > TIMEOUT) {
        stopPolling();
        err = 'sign-in timed out';
        phase = 'error';
        return;
      }
      const r = await pollAuthStatus(state);
      if (r.status === 'ok') {
        stopPolling();
        session.set(r.token, r.profile);
        void goto('/');
      } else if (r.status === 'error') {
        stopPolling();
        err = r.error;
        phase = 'error';
      } else if (r.status === 'unknown') {
        stopPolling();
        err = 'sign-in session expired';
        phase = 'error';
      }
    }, 1500);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  function cancel() {
    stopPolling();
    phase = 'idle';
    err = null;
  }
</script>

<div class="login">
  <div class="card">
    <div class="brand-row">
      <span class="brand-mark">CK</span>
      <div>
        <div class="brand-title">Manager</div>
        <div class="brand-sub">Operator console</div>
      </div>
    </div>

    <p class="lede">
      Sign in with the Steam account on the operator allowlist.
      Players use the regular launcher.
    </p>

    {#if phase === 'waiting'}
      <div class="waiting">
        <div class="spinner"></div>
        <p>Waiting for Steam in your browser&hellip;</p>
        <button class="ghost" type="button" onclick={cancel}>Cancel</button>
      </div>
    {:else}
      <button class="cta" type="button" onclick={signIn}>Sign in with Steam</button>
      {#if err}<p class="err">{err}</p>{/if}
    {/if}

    <p class="footnote">
      Non-admin accounts will be rejected with <code>403 Forbidden</code>.
      Adminship is granted via <code>CK_ADMIN_STEAM_IDS</code> on the Core.
    </p>
  </div>
</div>

<style>
  .login { padding: 40px; }
  .card {
    max-width: 440px;
    padding: 40px 36px;
    background: rgba(10, 14, 19, 0.6);
    border: 1px solid #2e5b72;
  }
  .brand-row { display: flex; align-items: center; gap: 14px; margin-bottom: 28px; }
  .brand-mark {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #4fcfdf 0%, #1e3d4f 100%);
    color: #05080b;
    font-family: 'Cinzel', Georgia, serif;
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .brand-title {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 24px;
    letter-spacing: 0.06em;
    color: #f4fafc;
  }
  .brand-sub {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #5fa0bc;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    margin-top: 4px;
  }
  .lede {
    font-size: 13px;
    color: #b9deeb;
    line-height: 1.6;
    margin: 0 0 28px;
  }
  .cta {
    width: 100%;
    padding: 14px;
    font-family: inherit;
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    border: 1px solid #9dd0e8;
    background: rgba(157, 208, 232, 0.08);
    color: #f4fafc;
    cursor: pointer;
    font-weight: 500;
  }
  .cta:hover { border-color: #4fcfdf; background: rgba(79,207,223,0.16); }
  .ghost {
    padding: 10px 20px;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid #2e5b72;
    background: transparent;
    color: #b9deeb;
    cursor: pointer;
  }
  .waiting {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 8px 0 0;
  }
  .spinner {
    width: 28px;
    height: 28px;
    border: 2px solid #1e3d4f;
    border-top-color: #4fcfdf;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .err {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #c97b70;
    margin: 14px 0 0;
  }
  .footnote {
    font-size: 11px;
    color: #5fa0bc;
    margin: 24px 0 0;
    line-height: 1.5;
  }
  .footnote code {
    font-family: 'JetBrains Mono', monospace;
    color: #4fcfdf;
    background: rgba(79,207,223,0.05);
    padding: 1px 4px;
  }
</style>
