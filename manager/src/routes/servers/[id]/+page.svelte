<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import {
    getServer,
    startServer,
    stopServer,
    restartServer,
    type CkServer,
  } from '$lib/api';
  import { session } from '$lib/session.svelte';
  import { logStream, type LogLine } from '$lib/logs.svelte';

  let server = $state<CkServer | null>(null);
  let loading = $state(true);
  let err = $state<string | null>(null);
  let busy = $state(false);

  const id = $derived(page.params.id);

  $effect(() => {
    if (!session.isSignedIn) session.load();
    if (!session.isSignedIn) { void goto('/login'); return; }
    void load();
    const t = setInterval(() => void load(false), 5_000);
    return () => clearInterval(t);
  });

  // Live log subscription. Re-subscribes if the page navigates between
  // server detail pages without unmounting (Svelte preserves the component).
  $effect(() => {
    if (!session.isSignedIn) return;
    const sid = id;
    logStream.subscribe(sid);
    return () => logStream.unsubscribe(sid);
  });

  // Auto-scroll the console to the bottom when new lines arrive, unless
  // the operator has scrolled up to read history.
  let consoleEl: HTMLDivElement | null = $state(null);
  let autoScroll = $state(true);
  const lines = $derived(logStream.linesFor(id));

  $effect(() => {
    // Tracking the array length is enough to fire on new lines.
    void lines.length;
    if (autoScroll && consoleEl) {
      consoleEl.scrollTop = consoleEl.scrollHeight;
    }
  });

  function onConsoleScroll() {
    if (!consoleEl) return;
    const atBottom =
      consoleEl.scrollTop + consoleEl.clientHeight >= consoleEl.scrollHeight - 8;
    autoScroll = atBottom;
  }

  function fmtTs(ms: number): string {
    const d = new Date(ms);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function classifyLine(line: string): string {
    if (line.includes('(E)') || /error|failed|exception/i.test(line)) return 'err';
    if (line.includes('(W)') || /warn/i.test(line)) return 'warn';
    if (/ENGINE|RESOURCES|PHYSICS|NETWORK|GAMECODE|AUDIO|AI|SAVE|STREAM/.test(line)) return 'sys';
    return '';
  }

  async function load(showSpinner = true) {
    if (!session.token) return;
    if (showSpinner) loading = true;
    err = null;
    try {
      server = await getServer(session.token, id);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  async function act(action: 'start' | 'stop' | 'restart') {
    if (!session.token || !server) return;
    busy = true;
    try {
      const fn = action === 'start' ? startServer : action === 'stop' ? stopServer : restartServer;
      server = await fn(session.token, server.id);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      busy = false;
    }
  }

  function fmtUptime(s: number): string {
    if (s < 60) return `${s} seconds`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} minutes`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ${m % 60}m`;
    return `${Math.floor(h / 24)}d ${h % 24}h`;
  }
</script>

<div class="page">
  <a href="/servers" class="back">&larr; Servers</a>

  {#if loading}
    <div class="state"><div class="spinner"></div></div>
  {:else if err}
    <div class="state err"><p>{err}</p></div>
  {:else if server}
    <header class="page-head">
      <div>
        <p class="eyebrow">Server</p>
        <h1 class="display">{server.name}</h1>
        <p class="sub">
          <span class="map-pill">{server.mapName}</span>
          <span class="addr">{server.publicAddress}</span>
          <span class="host">host {server.hostId}</span>
        </p>
      </div>
      <div class="ctl state-{server.state}">
        <span class="ctl-state">
          <span class="indicator"></span>
          {server.state}
        </span>
        <div class="ctl-buttons">
          {#if server.state === 'running'}
            <button class="ctl-btn" disabled={busy} onclick={() => act('restart')}>Restart</button>
            <button class="ctl-btn danger" disabled={busy} onclick={() => act('stop')}>Stop</button>
          {:else if server.state === 'stopped' || server.state === 'crashed'}
            <button class="ctl-btn primary" disabled={busy} onclick={() => act('start')}>Start</button>
          {:else}
            <span class="ctl-busy">working&hellip;</span>
          {/if}
        </div>
      </div>
    </header>

    {#if server.lastError}
      <div class="error-box">
        <div class="error-label">Last error</div>
        <pre class="error-body">{server.lastError}</pre>
      </div>
    {/if}

    <section class="kv">
      <div><span class="k">Players</span><span class="v">{server.state === 'running' ? `${server.players} / ${server.capacity}` : '—'}</span></div>
      <div><span class="k">Uptime</span><span class="v">{server.state === 'running' ? fmtUptime(server.uptimeS) : '—'}</span></div>
      <div><span class="k">PID</span><span class="v">{server.pid ?? '—'}</span></div>
      <div><span class="k">Port</span><span class="v">{server.port}</span></div>
      <div><span class="k">Version</span><span class="v mono">{server.version}</span></div>
      <div><span class="k">Mods</span><span class="v">{server.modsCount}</span></div>
    </section>

    <section class="block">
      <header class="log-head">
        <h2 class="block-title">Live console</h2>
        <div class="log-status">
          <span class="ws ws-{logStream.status}">
            <span class="ws-dot" aria-hidden="true"></span>
            {logStream.status}
          </span>
          {#if logStream.lastError}<span class="ws-err">{logStream.lastError}</span>{/if}
          <span class="autoscroll" class:on={autoScroll}>
            {autoScroll ? 'auto-scroll on' : 'paused — scroll to bottom to resume'}
          </span>
        </div>
      </header>
      <div
        class="console"
        bind:this={consoleEl}
        onscroll={onConsoleScroll}
        tabindex="0"
      >
        {#if lines.length === 0}
          <p class="empty">No log lines yet. Start the server to see output.</p>
        {:else}
          {#each lines as ln (ln.ts + '|' + ln.line)}
            <div class="line {classifyLine(ln.line)}">
              <span class="line-ts">{fmtTs(ln.ts)}</span>
              <span class="line-body">{ln.line}</span>
            </div>
          {/each}
        {/if}
      </div>
    </section>
  {/if}
</div>

<style>
  .page { padding: 48px 56px 80px; max-width: 1200px; }
  .back {
    display: inline-block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #5fa0bc;
    text-decoration: none;
    margin-bottom: 20px;
  }
  .back:hover { color: #4fcfdf; }

  .page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 32px;
    padding-bottom: 28px;
    border-bottom: 1px solid #1e3d4f;
    margin-bottom: 28px;
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
    font-size: 28px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0 0 12px;
    color: #f4fafc;
  }
  .sub {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin: 0;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    color: #5fa0bc;
    letter-spacing: 0.06em;
  }
  .map-pill {
    border: 1px solid #2e5b72;
    color: #b9deeb;
    padding: 3px 9px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-size: 10px;
  }
  .addr { color: #f4fafc; }
  .host { color: #5fa0bc; }

  .ctl {
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: flex-end;
  }
  .ctl-state {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #5fa0bc;
  }
  .indicator { width: 8px; height: 8px; display: inline-block; }
  .state-running .ctl-state,
  .state-running { color: #4fcfdf; }
  .state-running .indicator { background: #4fcfdf; }
  .state-crashed .ctl-state,
  .state-crashed { color: #c97b70; }
  .state-crashed .indicator { background: #8e382c; }
  .state-starting .ctl-state,
  .state-stopping .ctl-state,
  .state-updating .ctl-state { color: #c9a570; }
  .state-starting .indicator,
  .state-stopping .indicator,
  .state-updating .indicator { background: #c9a570; }
  .state-stopped .indicator { background: #5fa0bc; opacity: 0.5; }

  .ctl-buttons { display: flex; gap: 8px; }
  .ctl-btn {
    padding: 10px 16px;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid #2e5b72;
    background: transparent;
    color: #b9deeb;
    cursor: pointer;
    font-weight: 500;
  }
  .ctl-btn:hover:not(:disabled) { border-color: #4fcfdf; color: #f4fafc; }
  .ctl-btn.primary {
    border-color: #4fcfdf;
    color: #f4fafc;
    background: rgba(79,207,223,0.1);
  }
  .ctl-btn.primary:hover { background: rgba(79,207,223,0.18); }
  .ctl-btn.danger { border-color: #5a2823; color: #c97b70; }
  .ctl-btn.danger:hover:not(:disabled) { border-color: #8e382c; color: #f4fafc; }
  .ctl-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .ctl-busy {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #c9a570;
    letter-spacing: 0.12em;
  }

  .error-box {
    padding: 16px 20px;
    background: rgba(142, 56, 44, 0.1);
    border: 1px solid #5a2823;
    border-left: 3px solid #8e382c;
    margin-bottom: 28px;
  }
  .error-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #c97b70;
    margin-bottom: 8px;
  }
  .error-body {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #c97b70;
    margin: 0;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .kv {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1px;
    background: #1e3d4f;
    border: 1px solid #1e3d4f;
    margin-bottom: 36px;
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
  .v {
    font-size: 15px;
    color: #f4fafc;
  }
  .v.mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }

  .block { margin-bottom: 36px; }
  .block-title {
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5fa0bc;
    margin: 0 0 14px;
    font-weight: 500;
  }
  .log-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }
  .log-status {
    display: inline-flex;
    align-items: center;
    gap: 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    color: #5fa0bc;
  }
  .ws {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }
  .ws-dot {
    width: 6px;
    height: 6px;
    display: inline-block;
    background: currentColor;
  }
  .ws-open { color: #4fcfdf; }
  .ws-connecting { color: #c9a570; }
  .ws-closed, .ws-error, .ws-idle { color: #c97b70; }
  .ws-err { color: #c97b70; }
  .autoscroll {
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .autoscroll.on { color: #4fcfdf; }

  .console {
    height: 420px;
    overflow-y: auto;
    background: #02060a;
    border: 1px solid #1e3d4f;
    padding: 12px 14px;
    font-family: 'JetBrains Mono', 'Cascadia Code', Consolas, monospace;
    font-size: 11.5px;
    line-height: 1.55;
    color: #b9deeb;
    outline: none;
  }
  .console:focus { border-color: #4fcfdf; }
  .empty {
    color: #2e5b72;
    font-style: italic;
    margin: 0;
    padding: 24px 0;
    text-align: center;
  }
  .line {
    display: grid;
    grid-template-columns: 70px 1fr;
    gap: 12px;
    padding: 0;
    word-break: break-all;
  }
  .line-ts { color: #2e5b72; }
  .line-body { color: #b9deeb; }
  .line.sys .line-body { color: #d3e9f0; }
  .line.warn .line-body { color: #c9a570; }
  .line.err .line-body { color: #c97b70; }

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
</style>
