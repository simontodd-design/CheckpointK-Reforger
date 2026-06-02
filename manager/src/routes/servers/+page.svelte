<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    listServers,
    startServer,
    stopServer,
    restartServer,
    type CkServer,
  } from '$lib/api';
  import { session } from '$lib/session.svelte';

  let servers = $state<CkServer[]>([]);
  let loading = $state(true);
  let err = $state<string | null>(null);
  let busy = $state<Record<string, boolean>>({});

  $effect(() => {
    if (!session.isSignedIn) session.load();
    if (!session.isSignedIn) { void goto('/login'); return; }
    void load();
    const t = setInterval(() => void load(false), 8_000);
    return () => clearInterval(t);
  });

  async function load(showSpinner = true) {
    if (!session.token) return;
    if (showSpinner) loading = true;
    err = null;
    try {
      servers = await listServers(session.token);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  async function act(id: string, action: 'start' | 'stop' | 'restart') {
    if (!session.token) return;
    busy = { ...busy, [id]: true };
    try {
      const fn = action === 'start' ? startServer : action === 'stop' ? stopServer : restartServer;
      const next = await fn(session.token, id);
      servers = servers.map((s) => (s.id === id ? next : s));
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      busy = { ...busy, [id]: false };
    }
  }

  function fmtUptime(s: number): string {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ${m % 60}m`;
    return `${Math.floor(h / 24)}d ${h % 24}h`;
  }
</script>

<div class="page">
  <header class="page-head">
    <div>
      <p class="eyebrow">Fleet</p>
      <h1 class="display">Servers.</h1>
      <p class="sub">Reforger dedicated server instances. Click a row for detail.</p>
    </div>
    <a href="/servers/new" class="cta">+ New server</a>
  </header>

  {#if loading}
    <div class="state"><div class="spinner"></div></div>
  {:else if err}
    <div class="state err">
      <p>{err}</p>
      <button class="ghost" type="button" onclick={() => void load()}>Retry</button>
    </div>
  {:else}
    <table class="grid">
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th>Map</th>
          <th>Host</th>
          <th>Address</th>
          <th>State</th>
          <th>Players</th>
          <th>Uptime</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each servers as s (s.id)}
          <tr class="row state-{s.state}">
            <td class="indicator-cell"><span class="indicator"></span></td>
            <td>
              <a href="/servers/{s.id}" class="row-name">{s.name}</a>
              {#if s.lastError}
                <div class="row-error">{s.lastError}</div>
              {/if}
            </td>
            <td class="muted-mono">{s.mapName}</td>
            <td class="muted-mono">{s.hostId}</td>
            <td class="muted-mono">{s.publicAddress}</td>
            <td>
              <span class="state-pill">{s.state}</span>
            </td>
            <td class="mono">
              {#if s.state === 'running'}
                {s.players}<span class="muted">/{s.capacity}</span>
              {:else}
                <span class="muted">—</span>
              {/if}
            </td>
            <td class="mono">
              {#if s.state === 'running'}{fmtUptime(s.uptimeS)}{:else}<span class="muted">—</span>{/if}
            </td>
            <td class="actions">
              {#if s.state === 'running'}
                <button class="row-btn" type="button" disabled={busy[s.id]} onclick={() => act(s.id, 'restart')}>Restart</button>
                <button class="row-btn danger" type="button" disabled={busy[s.id]} onclick={() => act(s.id, 'stop')}>Stop</button>
              {:else if s.state === 'crashed' || s.state === 'stopped'}
                <button class="row-btn" type="button" disabled={busy[s.id]} onclick={() => act(s.id, 'start')}>Start</button>
              {:else}
                <span class="busy">working&hellip;</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .page { padding: 48px 56px 80px; max-width: 1400px; }
  .page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 32px;
  }
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
  .cta {
    padding: 11px 18px;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    border: 1px solid #9dd0e8;
    background: rgba(157, 208, 232, 0.08);
    color: #f4fafc;
    cursor: pointer;
    font-weight: 500;
    text-decoration: none;
    display: inline-block;
  }
  .cta:hover { border-color: #4fcfdf; background: rgba(79,207,223,0.16); }
  .cta:disabled { opacity: 0.5; cursor: not-allowed; }

  .grid {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #1e3d4f;
    background: rgba(10, 14, 19, 0.5);
  }
  thead tr {
    background: rgba(5, 8, 11, 0.7);
    border-bottom: 1px solid #1e3d4f;
  }
  th {
    text-align: left;
    padding: 12px 14px;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #5fa0bc;
    font-weight: 500;
  }
  td {
    padding: 13px 14px;
    border-bottom: 1px solid #1e3d4f;
    vertical-align: middle;
    font-size: 13px;
  }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:hover { background: rgba(46, 91, 114, 0.1); }
  .row-name {
    color: #f4fafc;
    text-decoration: none;
    font-size: 14px;
  }
  .row-name:hover { color: #4fcfdf; }
  .row-error {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #c97b70;
    margin-top: 4px;
  }
  .indicator-cell { width: 22px; padding-right: 0; }
  .indicator { width: 7px; height: 7px; display: inline-block; }
  .state-running .indicator { background: #4fcfdf; }
  .state-stopped .indicator { background: #5fa0bc; opacity: 0.5; }
  .state-crashed .indicator { background: #8e382c; }
  .state-starting .indicator,
  .state-stopping .indicator,
  .state-updating .indicator { background: #c9a570; }

  .state-pill {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #5fa0bc;
  }
  .state-running .state-pill { color: #4fcfdf; }
  .state-crashed .state-pill { color: #c97b70; }
  .state-starting .state-pill,
  .state-stopping .state-pill,
  .state-updating .state-pill { color: #c9a570; }

  .muted-mono,
  .mono {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
  }
  .muted-mono { color: #5fa0bc; }
  .mono { color: #f4fafc; }
  .muted { color: #5fa0bc; }

  .actions { text-align: right; white-space: nowrap; }
  .row-btn {
    padding: 6px 12px;
    margin-left: 4px;
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid #2e5b72;
    background: transparent;
    color: #b9deeb;
    cursor: pointer;
  }
  .row-btn:hover:not(:disabled) { border-color: #4fcfdf; color: #f4fafc; }
  .row-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .row-btn.danger { border-color: #5a2823; color: #c97b70; }
  .row-btn.danger:hover:not(:disabled) { border-color: #8e382c; color: #f4fafc; }
  .busy {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #c9a570;
    letter-spacing: 0.12em;
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
  .state.err { color: #c97b70; }
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
