<script lang="ts">
  import { goto } from '$app/navigation';
  import { listServers, listHosts, type CkServer, type CkHost } from '$lib/api';
  import { session } from '$lib/session.svelte';

  let servers = $state<CkServer[]>([]);
  let hosts = $state<CkHost[]>([]);
  let loading = $state(true);
  let err = $state<string | null>(null);

  $effect(() => {
    if (!session.isSignedIn) {
      void goto('/login');
      return;
    }
    void load();
  });

  async function load() {
    if (!session.token) return;
    loading = true;
    err = null;
    try {
      const [s, h] = await Promise.all([
        listServers(session.token),
        listHosts(session.token),
      ]);
      servers = s;
      hosts = h;
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
      if (err.startsWith('forbidden')) {
        setTimeout(() => session.clear(), 100);
      }
    } finally {
      loading = false;
    }
  }

  const totalPlayers = $derived(
    servers.reduce((sum, s) => sum + (s.state === 'running' ? s.players : 0), 0),
  );
  const totalCapacity = $derived(
    servers
      .filter((s) => s.state === 'running')
      .reduce((sum, s) => sum + s.capacity, 0),
  );
  const runningCount = $derived(servers.filter((s) => s.state === 'running').length);
  const issueCount = $derived(
    servers.filter((s) => s.state === 'crashed' || s.state === 'stopping').length,
  );

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
    <p class="eyebrow">Status</p>
    <h1 class="display">Dashboard.</h1>
    <p class="sub">Live snapshot of the CK fleet.</p>
  </header>

  {#if loading}
    <div class="state"><div class="spinner"></div></div>
  {:else if err}
    <div class="state errstate">
      <p>{err}</p>
      <button class="ghost" type="button" onclick={() => void load()}>Retry</button>
    </div>
  {:else}
    <section class="stat-row">
      <div class="stat">
        <span class="stat-num">{totalPlayers}<span class="stat-denom"> / {totalCapacity}</span></span>
        <span class="stat-label">Players online</span>
      </div>
      <div class="stat">
        <span class="stat-num">{runningCount}<span class="stat-denom"> / {servers.length}</span></span>
        <span class="stat-label">Servers running</span>
      </div>
      <div class="stat">
        <span class="stat-num">{hosts.length}</span>
        <span class="stat-label">Hosts connected</span>
      </div>
      <div class="stat" class:warn={issueCount > 0}>
        <span class="stat-num">{issueCount}</span>
        <span class="stat-label">Needs attention</span>
      </div>
    </section>

    <section class="block">
      <div class="block-head">
        <h2 class="block-title">Servers</h2>
        <a href="/servers" class="block-link">View all &rarr;</a>
      </div>
      <div class="server-rows">
        {#each servers as s (s.id)}
          <a href="/servers/{s.id}" class="server-row state-{s.state}">
            <div class="server-name">
              <span class="indicator"></span>
              {s.name}
            </div>
            <div class="server-meta">
              <span class="map">{s.mapName}</span>
              <span class="addr">{s.publicAddress}</span>
            </div>
            <div class="server-state">{s.state}</div>
            <div class="server-players">
              {#if s.state === 'running'}
                {s.players}<span class="muted">/{s.capacity}</span>
              {:else}
                <span class="muted">—</span>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    </section>

    <section class="block">
      <div class="block-head">
        <h2 class="block-title">Hosts</h2>
        <a href="/hosts" class="block-link">View all &rarr;</a>
      </div>
      {#if hosts.length === 0}
        <p class="empty">No agents connected. Start <code>ck-manager-agent</code> on at least one host.</p>
      {:else}
        <div class="host-rows">
          {#each hosts as h (h.hostId)}
            <div class="host-row">
              <span class="indicator online"></span>
              <span class="host-id">{h.hostId}</span>
              <span class="host-version">v{h.version}</span>
              <span class="host-since">connected {formatRelative(h.connectedAt)}</span>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}
</div>

<style>
  .page { padding: 48px 56px 80px; max-width: 1200px; }
  .page-head { margin-bottom: 36px; }
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

  .stat-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1px;
    background: #1e3d4f;
    border: 1px solid #1e3d4f;
    margin-bottom: 36px;
  }
  .stat {
    padding: 22px 24px;
    background: rgba(10, 14, 19, 0.75);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .stat.warn { background: rgba(142, 56, 44, 0.1); }
  .stat-num {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 32px;
    color: #f4fafc;
    line-height: 1;
  }
  .stat-denom { color: #5fa0bc; font-size: 18px; }
  .stat.warn .stat-num { color: #c97b70; }
  .stat-label {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5fa0bc;
  }

  .block { margin-bottom: 36px; }
  .block-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }
  .block-title {
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5fa0bc;
    margin: 0;
    font-weight: 500;
  }
  .block-link {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #4fcfdf;
    text-decoration: none;
  }
  .block-link:hover { color: #b9deeb; }

  .server-rows { display: flex; flex-direction: column; gap: 1px; background: #1e3d4f; border: 1px solid #1e3d4f; }
  .server-row {
    display: grid;
    grid-template-columns: 1.6fr 1.6fr 1fr 0.8fr;
    align-items: center;
    gap: 16px;
    padding: 14px 20px;
    background: rgba(10, 14, 19, 0.65);
    color: inherit;
    text-decoration: none;
    transition: background 120ms ease-out;
  }
  .server-row:hover { background: rgba(46, 91, 114, 0.18); }
  .server-name {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: #f4fafc;
  }
  .indicator { width: 7px; height: 7px; display: inline-block; flex-shrink: 0; }
  .state-running .indicator { background: #4fcfdf; }
  .state-stopped .indicator { background: #5fa0bc; opacity: 0.5; }
  .state-crashed .indicator { background: #8e382c; }
  .state-starting .indicator,
  .state-stopping .indicator,
  .state-updating .indicator { background: #c9a570; }

  .server-meta { display: flex; flex-direction: column; gap: 3px; }
  .map {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #b9deeb;
    letter-spacing: 0.06em;
  }
  .addr {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #5fa0bc;
    letter-spacing: 0.04em;
  }
  .server-state {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #5fa0bc;
  }
  .state-running .server-state { color: #4fcfdf; }
  .state-crashed .server-state { color: #c97b70; }
  .state-starting .server-state,
  .state-stopping .server-state,
  .state-updating .server-state { color: #c9a570; }
  .server-players {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: #f4fafc;
    text-align: right;
  }
  .muted { color: #5fa0bc; }

  .host-rows { display: flex; flex-direction: column; gap: 1px; background: #1e3d4f; border: 1px solid #1e3d4f; }
  .host-row {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    gap: 16px;
    align-items: center;
    padding: 12px 20px;
    background: rgba(10, 14, 19, 0.65);
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
  }
  .host-row .online { background: #4fcfdf; }
  .host-id { color: #f4fafc; letter-spacing: 0.06em; }
  .host-version { color: #5fa0bc; }
  .host-since { color: #5fa0bc; }

  .empty { font-size: 12px; color: #5fa0bc; font-style: italic; }
  .empty code {
    font-family: 'JetBrains Mono', monospace;
    color: #4fcfdf;
    background: rgba(79,207,223,0.05);
    padding: 1px 4px;
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

  .ghost {
    padding: 9px 16px;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid #2e5b72;
    background: transparent;
    color: #b9deeb;
    cursor: pointer;
  }
</style>
