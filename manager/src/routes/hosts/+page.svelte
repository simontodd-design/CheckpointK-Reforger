<script lang="ts">
  import { goto } from '$app/navigation';
  import { listHosts, type CkHost } from '$lib/api';
  import { session } from '$lib/session.svelte';

  let hosts = $state<CkHost[]>([]);
  let loading = $state(true);
  let err = $state<string | null>(null);

  $effect(() => {
    if (!session.isSignedIn) { void goto('/login'); return; }
    void load();
    const t = setInterval(() => void load(false), 5_000);
    return () => clearInterval(t);
  });

  async function load(showSpinner = true) {
    if (!session.token) return;
    if (showSpinner) loading = true;
    err = null;
    try {
      hosts = await listHosts(session.token);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  function formatRelative(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
</script>

<div class="page">
  <header class="page-head">
    <p class="eyebrow">Infrastructure</p>
    <h1 class="display">Hosts.</h1>
    <p class="sub">Each host runs <code>ck-manager-agent</code> and reports up via WebSocket on :3002.</p>
  </header>

  {#if loading}
    <div class="state"><div class="spinner"></div></div>
  {:else if err}
    <div class="state errstate"><p>{err}</p></div>
  {:else if hosts.length === 0}
    <div class="empty">
      <h2>No agents connected.</h2>
      <p>Start the agent on at least one host:</p>
      <pre>cd manager-agent
bun run dev</pre>
      <p>You'll see it appear here within a second.</p>
    </div>
  {:else}
    <div class="cards">
      {#each hosts as h (h.hostId)}
        <div class="card">
          <div class="card-head">
            <span class="indicator online"></span>
            <h2 class="card-title">{h.hostId}</h2>
            <span class="online-tag">Online</span>
          </div>
          <div class="card-meta">
            <div><span class="k">Agent version</span><span class="v">v{h.version}</span></div>
            <div><span class="k">Connected</span><span class="v">{formatRelative(h.connectedAt)}</span></div>
            <div><span class="k">Reforger servers</span><span class="v">—</span></div>
            <div><span class="k">CPU</span><span class="v">—</span></div>
            <div><span class="k">Memory</span><span class="v">—</span></div>
            <div><span class="k">Disk</span><span class="v">—</span></div>
          </div>
          <p class="card-footnote">Host metrics arrive in the next agent protocol bump.</p>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { padding: 48px 56px 80px; max-width: 1200px; }
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
  .sub code {
    font-family: 'JetBrains Mono', monospace;
    color: #4fcfdf;
    background: rgba(79,207,223,0.05);
    padding: 1px 4px;
    font-style: normal;
  }

  .cards { display: flex; flex-direction: column; gap: 14px; }
  .card {
    padding: 22px 26px;
    background: rgba(10, 14, 19, 0.55);
    border: 1px solid #1e3d4f;
  }
  .card-head {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
    padding-bottom: 14px;
    border-bottom: 1px solid #1e3d4f;
  }
  .indicator { width: 8px; height: 8px; display: inline-block; }
  .indicator.online { background: #4fcfdf; }
  .card-title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    color: #f4fafc;
    margin: 0;
    letter-spacing: 0.04em;
    flex: 1;
  }
  .online-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #4fcfdf;
    border: 1px solid #4fcfdf;
    padding: 3px 8px;
  }

  .card-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px 24px;
  }
  .card-meta > div { display: flex; flex-direction: column; gap: 4px; }
  .k {
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5fa0bc;
  }
  .v { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #f4fafc; }

  .card-footnote {
    font-size: 10px;
    color: #2e5b72;
    margin: 18px 0 0;
    font-style: italic;
  }

  .empty {
    padding: 60px 36px;
    background: rgba(10, 14, 19, 0.4);
    border: 1px dashed #2e5b72;
    text-align: center;
  }
  .empty h2 {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 20px;
    color: #f4fafc;
    margin: 0 0 14px;
  }
  .empty p {
    font-size: 13px;
    color: #5fa0bc;
    margin: 0 0 14px;
  }
  .empty pre {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #4fcfdf;
    background: rgba(0,0,0,0.4);
    border: 1px solid #1e3d4f;
    padding: 12px 16px;
    text-align: left;
    display: inline-block;
    margin: 0 0 14px;
  }

  .state {
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
    padding: 80px;
    color: #5fa0bc;
    font-size: 13px;
  }
  .errstate { color: #c97b70; }
  .spinner {
    width: 28px;
    height: 28px;
    border: 2px solid #1e3d4f;
    border-top-color: #4fcfdf;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
