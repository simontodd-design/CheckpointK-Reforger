<script lang="ts">
  import { goto } from '$app/navigation';
  import { listHosts, type CkHost } from '$lib/api';
  import { session } from '$lib/session.svelte';

  let hosts = $state<CkHost[]>([]);
  let loading = $state(true);
  let err = $state<string | null>(null);

  $effect(() => {
    if (!session.isSignedIn) session.load();
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

  function fmtRel(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  function fmtUptime(s: number): string {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 48) return `${h}h ${m % 60}m`;
    return `${Math.floor(h / 24)}d`;
  }

  function readiness(h: CkHost): 'ready' | 'partial' | 'missing' {
    if (!h.status) return 'missing';
    if (h.status.reforgerServer.installed && h.status.steamcmd.installed) return 'ready';
    if (h.status.reforgerServer.installed || h.status.steamcmd.installed) return 'partial';
    return 'missing';
  }

  function readinessLabel(r: 'ready' | 'partial' | 'missing'): string {
    return r === 'ready' ? 'Ready to deploy'
      : r === 'partial' ? 'Partial setup'
      : 'Needs setup';
  }
</script>

<div class="page">
  <header class="page-head">
    <p class="eyebrow">Infrastructure</p>
    <h1 class="display">Hosts.</h1>
    <p class="sub">
      Each host runs <code>ck-manager-agent</code>. Reforger Server +
      SteamCMD must be installed for the host to accept spawn commands.
    </p>
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
      <p>It'll appear here within a second.</p>
    </div>
  {:else}
    <div class="cards">
      {#each hosts as h (h.hostId)}
        {@const r = readiness(h)}
        <div class="card readiness-{r}">
          <div class="card-head">
            <span class="indicator online"></span>
            <h2 class="card-title">{h.hostId}</h2>
            <span class="ready-pill ready-{r}">{readinessLabel(r)}</span>
          </div>

          <div class="card-meta">
            <div>
              <span class="k">Agent version</span>
              <span class="v">v{h.status?.agentVersion ?? h.version}</span>
            </div>
            <div>
              <span class="k">Connected</span>
              <span class="v">{fmtRel(h.connectedAt)}</span>
            </div>
            <div>
              <span class="k">Hostname / OS</span>
              <span class="v">
                {#if h.status}
                  {h.status.osInfo.hostname}
                  <span class="v-sub">{h.status.osInfo.platform} {h.status.osInfo.arch}</span>
                {:else}—{/if}
              </span>
            </div>
            <div>
              <span class="k">Uptime</span>
              <span class="v">{h.status ? fmtUptime(h.status.metrics.uptimeS) : '—'}</span>
            </div>
          </div>

          <div class="metrics">
            <div class="metric">
              <div class="metric-head">
                <span class="metric-k">CPU</span>
                <span class="metric-v">{h.status ? `${h.status.metrics.cpuPct}%` : '—'}</span>
              </div>
              <div class="bar">
                <div
                  class="bar-fill bar-{h.status && h.status.metrics.cpuPct > 80 ? 'hi' : 'ok'}"
                  style:width="{h.status?.metrics.cpuPct ?? 0}%"
                ></div>
              </div>
            </div>

            <div class="metric">
              <div class="metric-head">
                <span class="metric-k">Memory</span>
                <span class="metric-v">
                  {#if h.status}
                    {h.status.metrics.memPct}%
                    <span class="metric-sub">
                      {Math.round(h.status.metrics.memUsedMB / 1024)} /
                      {Math.round(h.status.metrics.memTotalMB / 1024)} GB
                    </span>
                  {:else}—{/if}
                </span>
              </div>
              <div class="bar">
                <div
                  class="bar-fill bar-{h.status && h.status.metrics.memPct > 85 ? 'hi' : 'ok'}"
                  style:width="{h.status?.metrics.memPct ?? 0}%"
                ></div>
              </div>
            </div>

            <div class="metric">
              <div class="metric-head">
                <span class="metric-k">Disk (install drive)</span>
                <span class="metric-v">
                  {#if h.status && h.status.metrics.diskTotalGB > 0}
                    {Math.round((1 - h.status.metrics.diskFreeGB / h.status.metrics.diskTotalGB) * 100)}%
                    <span class="metric-sub">
                      {h.status.metrics.diskFreeGB} GB free of {h.status.metrics.diskTotalGB} GB
                    </span>
                  {:else}—{/if}
                </span>
              </div>
              <div class="bar">
                {#if h.status && h.status.metrics.diskTotalGB > 0}
                  {@const pct = (1 - h.status.metrics.diskFreeGB / h.status.metrics.diskTotalGB) * 100}
                  <div
                    class="bar-fill bar-{pct > 90 ? 'hi' : 'ok'}"
                    style:width="{pct}%"
                  ></div>
                {/if}
              </div>
            </div>
          </div>

          <div class="installs">
            <div class="install" class:install-ok={h.status?.reforgerServer.installed}>
              <span class="install-dot"></span>
              <span class="install-name">Reforger Dedicated Server</span>
              <span class="install-path">
                {h.status?.reforgerServer.path ?? 'not detected'}
              </span>
            </div>
            <div class="install" class:install-ok={h.status?.steamcmd.installed}>
              <span class="install-dot"></span>
              <span class="install-name">SteamCMD</span>
              <span class="install-path">
                {h.status?.steamcmd.path ?? 'not detected'}
              </span>
            </div>
          </div>

          {#if r === 'missing' || r === 'partial'}
            <p class="install-hint">
              See <code>docs/REFORGER-DEDICATED-SERVER-SETUP.md</code>.
              In-Manager install lands in the next bite.
            </p>
          {/if}
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
  .sub {
    font-size: 13px;
    color: #5fa0bc;
    font-style: italic;
    margin: 0;
    max-width: 800px;
    line-height: 1.55;
  }
  .sub code {
    font-family: 'JetBrains Mono', monospace;
    color: #4fcfdf;
    background: rgba(79,207,223,0.05);
    padding: 1px 4px;
    font-style: normal;
  }

  .cards { display: flex; flex-direction: column; gap: 16px; }
  .card {
    padding: 24px 28px;
    background: rgba(10, 14, 19, 0.55);
    border: 1px solid #1e3d4f;
  }
  .card.readiness-ready { border-left: 3px solid #4fcfdf; }
  .card.readiness-partial { border-left: 3px solid #c9a570; }
  .card.readiness-missing { border-left: 3px solid #5a2823; }

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
  .ready-pill {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 4px 10px;
    border: 1px solid;
  }
  .ready-pill.ready-ready    { color: #4fcfdf; border-color: #4fcfdf; }
  .ready-pill.ready-partial  { color: #c9a570; border-color: #c9a570; }
  .ready-pill.ready-missing  { color: #c97b70; border-color: #5a2823; }

  .card-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 14px 24px;
    margin-bottom: 22px;
  }
  .card-meta > div { display: flex; flex-direction: column; gap: 4px; }
  .k {
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5fa0bc;
  }
  .v {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #f4fafc;
  }
  .v-sub {
    display: block;
    color: #5fa0bc;
    font-size: 10px;
    margin-top: 2px;
  }

  .metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 16px 24px;
    margin-bottom: 22px;
  }
  .metric { display: flex; flex-direction: column; gap: 6px; }
  .metric-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  .metric-k {
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5fa0bc;
  }
  .metric-v {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: #f4fafc;
  }
  .metric-sub {
    color: #5fa0bc;
    margin-left: 8px;
    font-size: 10px;
  }
  .bar {
    width: 100%;
    height: 3px;
    background: #1e3d4f;
    overflow: hidden;
  }
  .bar-fill { height: 100%; transition: width 200ms ease-out; }
  .bar-fill.bar-ok { background: #4fcfdf; }
  .bar-fill.bar-hi { background: #c97b70; }

  .installs {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    background: rgba(0,0,0,0.3);
    border: 1px solid #1e3d4f;
  }
  .install {
    display: grid;
    grid-template-columns: auto auto 1fr;
    gap: 10px;
    align-items: center;
    font-size: 11px;
    color: #5fa0bc;
  }
  .install-dot {
    width: 6px;
    height: 6px;
    background: #5a2823;
    display: inline-block;
  }
  .install.install-ok .install-dot { background: #4fcfdf; }
  .install.install-ok { color: #b9deeb; }
  .install-name {
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.04em;
  }
  .install.install-ok .install-name { color: #f4fafc; }
  .install-path {
    font-family: 'JetBrains Mono', monospace;
    color: #2e5b72;
    font-size: 10px;
    overflow-wrap: anywhere;
  }
  .install.install-ok .install-path { color: #5fa0bc; }

  .install-hint {
    font-size: 11px;
    color: #5fa0bc;
    margin: 14px 0 0;
    font-style: italic;
    line-height: 1.5;
  }
  .install-hint code {
    font-family: 'JetBrains Mono', monospace;
    color: #4fcfdf;
    background: rgba(79,207,223,0.05);
    padding: 1px 4px;
    font-style: normal;
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
  .empty p { font-size: 13px; color: #5fa0bc; margin: 0 0 14px; }
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
