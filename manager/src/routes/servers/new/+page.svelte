<script lang="ts">
  import { goto } from '$app/navigation';
  import {
    availableMaps,
    createServer,
    listHosts,
    listServers,
    type CkHost,
    type CkServer,
  } from '$lib/api';
  import { session } from '$lib/session.svelte';

  let hosts = $state<CkHost[]>([]);
  let existing = $state<CkServer[]>([]);
  let loading = $state(true);
  let submitting = $state(false);
  let err = $state<string | null>(null);

  let name = $state('');
  let mapId = $state<string>(availableMaps[0]?.id ?? 'arland');
  let hostId = $state('');
  let port = $state(2010);
  let capacity = $state(80);

  $effect(() => {
    if (!session.isSignedIn) session.load();
    if (!session.isSignedIn) { void goto('/login'); return; }
    void load();
  });

  // Suggest the next available port on the chosen host.
  $effect(() => {
    if (!hostId) return;
    const used = existing
      .filter((s) => s.hostId === hostId)
      .map((s) => s.port);
    let next = 2001;
    while (used.includes(next)) next++;
    port = next;
  });

  async function load() {
    if (!session.token) return;
    loading = true;
    try {
      const [h, s] = await Promise.all([
        listHosts(session.token),
        listServers(session.token),
      ]);
      hosts = h;
      existing = s;
      if (!hostId && hosts.length > 0) hostId = hosts[0].hostId;
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  async function submit(event: Event) {
    event.preventDefault();
    if (!session.token) return;
    if (!name.trim()) { err = 'name required'; return; }
    if (!mapId) { err = 'pick a map'; return; }
    if (!hostId) { err = 'pick a host'; return; }
    err = null;
    submitting = true;
    try {
      const created = await createServer(session.token, {
        name: name.trim(),
        mapId,
        hostId,
        port,
        capacity,
      });
      await goto(`/servers/${created.id}`);
    } catch (e) {
      err = e instanceof Error ? e.message : String(e);
    } finally {
      submitting = false;
    }
  }

  const selectedMapName = $derived(
    availableMaps.find((m) => m.id === mapId)?.name ?? '',
  );
  const noHosts = $derived(!loading && hosts.length === 0);
</script>

<div class="page">
  <a href="/servers" class="back">&larr; Servers</a>

  <header class="page-head">
    <p class="eyebrow">New</p>
    <h1 class="display">Create a server.</h1>
    <p class="sub">Configure a new Reforger dedicated server instance. It starts in <code>stopped</code> state.</p>
  </header>

  {#if loading}
    <div class="state"><div class="spinner"></div></div>
  {:else if noHosts}
    <div class="empty">
      <h2>No hosts available.</h2>
      <p>You need at least one <code>ck-manager-agent</code> connected before you can deploy a server.</p>
      <a href="/hosts" class="ghost">Go to Hosts &rarr;</a>
    </div>
  {:else}
    <form class="form" onsubmit={submit}>
      <div class="field">
        <label for="name">Name</label>
        <input
          id="name"
          type="text"
          bind:value={name}
          placeholder="CK {selectedMapName} — EU 1"
          autocomplete="off"
          required
        />
        <p class="hint">Shown to operators in the server list; players see the address only.</p>
      </div>

      <div class="field">
        <label>Map</label>
        <div class="map-grid">
          {#each availableMaps as m (m.id)}
            <button
              type="button"
              class="map-btn"
              class:selected={mapId === m.id}
              onclick={() => (mapId = m.id)}
            >
              <span class="map-name">{m.name}</span>
              <span class="map-diff diff-{m.difficulty}">{m.difficulty}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="row">
        <div class="field">
          <label for="host">Host</label>
          <select id="host" bind:value={hostId} required>
            {#each hosts as h (h.hostId)}
              <option value={h.hostId}>{h.hostId} (agent v{h.version})</option>
            {/each}
          </select>
        </div>

        <div class="field small">
          <label for="port">Port</label>
          <input id="port" type="number" min="1024" max="65535" bind:value={port} required />
        </div>

        <div class="field small">
          <label for="capacity">Capacity</label>
          <input id="capacity" type="number" min="1" max="300" bind:value={capacity} required />
        </div>
      </div>

      <div class="summary">
        <div class="summary-row">
          <span class="k">Public address</span>
          <span class="v">127.0.0.1:{port}</span>
        </div>
        <div class="summary-row">
          <span class="k">Initial state</span>
          <span class="v">stopped</span>
        </div>
      </div>

      {#if err}<p class="err">{err}</p>{/if}

      <div class="actions">
        <a href="/servers" class="ghost">Cancel</a>
        <button class="cta" type="submit" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create server'}
        </button>
      </div>
    </form>
  {/if}
</div>

<style>
  .page { padding: 48px 56px 80px; max-width: 880px; }
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
  .sub code {
    font-family: 'JetBrains Mono', monospace;
    color: #4fcfdf;
    background: rgba(79,207,223,0.05);
    padding: 1px 4px;
    font-style: normal;
  }

  .form { display: flex; flex-direction: column; gap: 24px; }
  .field { display: flex; flex-direction: column; gap: 8px; }
  .field.small { max-width: 160px; }
  .field label {
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5fa0bc;
  }
  .field input[type="text"],
  .field input[type="number"],
  .field select {
    padding: 11px 14px;
    background: rgba(0,0,0,0.4);
    border: 1px solid #2e5b72;
    color: #f4fafc;
    font-family: inherit;
    font-size: 14px;
    outline: none;
    transition: border-color 120ms ease-out;
  }
  .field input:focus,
  .field select:focus { border-color: #4fcfdf; }
  .hint { font-size: 11px; color: #5fa0bc; margin: 0; font-style: italic; }

  .row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 16px;
  }

  .map-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .map-btn {
    padding: 16px;
    background: rgba(10,14,19,0.5);
    border: 1px solid #1e3d4f;
    color: #b9deeb;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: all 120ms ease-out;
  }
  .map-btn:hover { border-color: #2e5b72; }
  .map-btn.selected {
    border-color: #4fcfdf;
    background: rgba(79,207,223,0.08);
  }
  .map-name {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 16px;
    color: #f4fafc;
    letter-spacing: 0.04em;
  }
  .map-diff {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }
  .diff-low { color: #5fa0bc; }
  .diff-medium { color: #c9a570; }
  .diff-high { color: #c97b70; }

  .summary {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 18px;
    background: rgba(0,0,0,0.35);
    border-left: 2px solid #4fcfdf;
  }
  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
  }
  .k {
    color: #5fa0bc;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .v { color: #f4fafc; }

  .err {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #c97b70;
    margin: 0;
    padding: 10px 14px;
    background: rgba(142,56,44,0.08);
    border-left: 2px solid #8e382c;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid #1e3d4f;
  }
  .cta {
    padding: 12px 24px;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    border: 1px solid #4fcfdf;
    color: #f4fafc;
    background: rgba(79,207,223,0.12);
    cursor: pointer;
    font-weight: 500;
  }
  .cta:hover:not(:disabled) { background: rgba(79,207,223,0.2); }
  .cta:disabled { opacity: 0.5; cursor: not-allowed; }
  .ghost {
    padding: 10px 20px;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid #2e5b72;
    color: #b9deeb;
    background: transparent;
    cursor: pointer;
    text-decoration: none;
  }
  .ghost:hover { border-color: #5fa0bc; color: #f4fafc; }

  .empty {
    padding: 50px 30px;
    background: rgba(10,14,19,0.4);
    border: 1px dashed #2e5b72;
    text-align: center;
  }
  .empty h2 {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 20px;
    color: #f4fafc;
    margin: 0 0 12px;
  }
  .empty p { font-size: 13px; color: #5fa0bc; margin: 0 0 18px; }
  .empty code {
    font-family: 'JetBrains Mono', monospace;
    color: #4fcfdf;
    background: rgba(79,207,223,0.05);
    padding: 1px 4px;
  }
  .empty .ghost { display: inline-block; }

  .state {
    display: flex;
    flex-direction: column;
    gap: 14px;
    align-items: center;
    padding: 80px;
    color: #5fa0bc;
  }
  .spinner {
    width: 28px;
    height: 28px;
    border: 2px solid #1e3d4f;
    border-top-color: #4fcfdf;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
