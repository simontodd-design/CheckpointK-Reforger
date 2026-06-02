<script lang="ts">
  import { goto } from '$app/navigation';
  import { coreUrl } from '$lib/api';
  import { session } from '$lib/session.svelte';

  $effect(() => {
    if (!session.isSignedIn) void goto('/login');
  });
</script>

<div class="page">
  <header class="page-head">
    <p class="eyebrow">Console</p>
    <h1 class="display">Settings.</h1>
    <p class="sub">Manager-side configuration. Server-side settings live in CK Core's env file.</p>
  </header>

  <section class="block">
    <h2 class="block-title">Operator</h2>
    <div class="kv">
      <div><span class="k">Persona</span><span class="v">{session.profile?.personaName}</span></div>
      <div><span class="k">Steam ID</span><span class="v mono">{session.profile?.steamId}</span></div>
      <div><span class="k">Role</span><span class="v">Admin</span></div>
    </div>
  </section>

  <section class="block">
    <h2 class="block-title">CK Core</h2>
    <div class="kv">
      <div><span class="k">API base</span><span class="v mono">{coreUrl}</span></div>
      <div><span class="k">Admin allowlist</span><span class="v mono">CK_ADMIN_STEAM_IDS (env)</span></div>
    </div>
    <p class="footnote">
      Add operators by appending Steam IDs to <code>CK_ADMIN_STEAM_IDS</code> in
      <code>.env.local</code> and restarting CK Core. We'll move this to a DB-backed
      list with audit log once the schema is in.
    </p>
  </section>

  <section class="block">
    <h2 class="block-title">Danger zone</h2>
    <div class="danger">
      <button class="ghost danger-btn" type="button" onclick={() => session.clear()}>
        Sign out
      </button>
    </div>
  </section>
</div>

<style>
  .page { padding: 48px 56px 80px; max-width: 900px; }
  .page-head { margin-bottom: 32px; }
  .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #4fcfdf;
    margin: 0 0 12px;
  }
  .display {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 32px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0 0 6px;
    color: #f4fafc;
  }
  .sub { font-size: 13px; color: #5fa0bc; font-style: italic; margin: 0; }

  .block { margin-bottom: 36px; }
  .block-title {
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5fa0bc;
    margin: 0 0 14px;
    font-weight: 500;
  }

  .kv {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1px;
    background: #1e3d4f;
    border: 1px solid #1e3d4f;
  }
  .kv > div {
    padding: 16px 20px;
    background: rgba(10, 14, 19, 0.6);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .k {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5fa0bc;
  }
  .v { font-size: 14px; color: #f4fafc; }
  .v.mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }

  .footnote {
    font-size: 11px;
    color: #5fa0bc;
    margin: 14px 0 0;
    line-height: 1.6;
  }
  .footnote code {
    font-family: 'JetBrains Mono', monospace;
    color: #4fcfdf;
    background: rgba(79,207,223,0.05);
    padding: 1px 4px;
  }

  .danger {
    padding: 22px 24px;
    background: rgba(142, 56, 44, 0.06);
    border: 1px solid #5a2823;
  }
  .ghost {
    padding: 10px 18px;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    background: transparent;
    border: 1px solid;
    cursor: pointer;
  }
  .danger-btn { border-color: #5a2823; color: #c97b70; }
  .danger-btn:hover { border-color: #8e382c; color: #f4fafc; }
</style>
