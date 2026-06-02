<script lang="ts">
  import {
    listCharacters,
    listMaps,
    type Character,
    type MapInfo,
  } from '$lib/api';
  import { session } from '$lib/session.svelte';
  import { armaStore } from '$lib/arma.svelte';
  import { launchReforger } from '$lib/arma';

  let characters = $state<Character[]>([]);
  let maps = $state<MapInfo[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let selectedCharacterId = $state<string | null>(null);
  let selectedMapId = $state<string | null>(null);
  let launching = $state(false);

  const selectedCharacter = $derived(
    characters.find((c) => c.id === selectedCharacterId) ?? null,
  );
  const selectedMap = $derived(
    maps.find((m) => m.id === selectedMapId) ?? null,
  );
  const canEnter = $derived(
    selectedCharacter !== null &&
      selectedMap !== null &&
      selectedMap.status === 'online' &&
      selectedMap.unlocked &&
      armaStore.isReady,
  );

  $effect(() => {
    void load();
  });

  async function load() {
    loading = true;
    error = null;
    try {
      const [c, m] = await Promise.all([
        listCharacters(session.token),
        listMaps(session.token),
      ]);
      characters = c;
      maps = m;
      // auto-select first character + their last-played map if available
      if (characters.length > 0 && !selectedCharacterId) {
        selectedCharacterId = characters[0].id;
        const lastMap = maps.find((m) => m.id === characters[0].mapId);
        if (lastMap) selectedMapId = lastMap.id;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  let launchError = $state<string | null>(null);

  async function enterWorld() {
    if (!canEnter || launching) return;
    if (!armaStore.install || !selectedMap) return;
    launching = true;
    launchError = null;
    try {
      const r = await launchReforger(
        armaStore.install.exe_path,
        selectedMap.server,
        null,
      );
      if (!r.ok) {
        launchError = r.error ?? 'launch failed';
      }
      // Reforger spawn returns immediately — the game takes its own
      // 30-60s to actually open. Leave the button in "Launching…" state
      // briefly so it feels intentional.
      setTimeout(() => (launching = false), 1500);
    } catch (err) {
      launchError = err instanceof Error ? err.message : String(err);
      launching = false;
    }
  }
</script>

<div class="page">
  <header class="page-header">
    <p class="eyebrow">Foyer</p>
    <h1 class="display">Take the airlock.</h1>
    <p class="sub">Pick who you are. Pick where you're going.</p>
  </header>

  {#if loading}
    <div class="state">
      <div class="spinner" aria-hidden="true"></div>
      <p>Loading characters &amp; maps&hellip;</p>
    </div>
  {:else if error}
    <div class="state error">
      <p>Failed to load: {error}</p>
      <button class="ghost" type="button" onclick={() => void load()}>Retry</button>
    </div>
  {:else}
    <section class="section">
      <h2 class="section-title">Characters</h2>
      {#if characters.length === 0}
        <p class="empty">No characters yet — create one when you enter a map.</p>
      {:else}
        <div class="char-grid">
          {#each characters as char (char.id)}
            <button
              class="char-card"
              class:selected={selectedCharacterId === char.id}
              class:dead={!char.alive}
              type="button"
              onclick={() => (selectedCharacterId = char.id)}
            >
              <div class="char-name">{char.name}</div>
              <div class="char-meta">
                <span>Lvl {char.level}</span>
                <span class="dot">·</span>
                <span>{char.mapName}</span>
              </div>
              <div class="char-stats">
                <span class="hours">{char.hours}h</span>
                <span class="status" class:alive={char.alive}>
                  {char.alive ? 'Alive' : 'Dead'}
                </span>
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </section>

    <section class="section">
      <h2 class="section-title">Maps</h2>
      <div class="map-grid">
        {#each maps as map (map.id)}
          <button
            class="map-card"
            class:selected={selectedMapId === map.id}
            class:locked={!map.unlocked}
            class:offline={map.status !== 'online'}
            type="button"
            disabled={!map.unlocked}
            onclick={() => (selectedMapId = map.id)}
          >
            <div class="map-head">
              <div class="map-name">{map.name}</div>
              <div class="map-meta-top">
                <span class="diff diff-{map.difficulty}">
                  {map.difficulty === 'low' ? 'Low' : map.difficulty === 'medium' ? 'Med' : 'High'} threat
                </span>
              </div>
            </div>
            <div class="map-area">{map.area}</div>
            <p class="map-desc">{map.description}</p>
            <div class="map-foot">
              <span class="players">
                <span class="indicator status-{map.status}" aria-hidden="true"></span>
                {map.status === 'online'
                  ? `${map.players}/${map.capacity}`
                  : map.status === 'maintenance'
                    ? 'Maintenance'
                    : 'Offline'}
              </span>
              {#if !map.unlocked}
                <span class="locked-tag">Locked</span>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </section>

    <footer class="enter-bar">
      <div class="enter-info">
        {#if launchError}
          <span class="info-label warn">Launch failed</span>
          <span class="info-hint launch-error">{launchError}</span>
        {:else if !armaStore.isReady}
          <span class="info-label warn">Reforger</span>
          <span class="info-hint">
            Arma Reforger isn't detected. Set the install path in
            <a href="/settings" class="inline-link">Settings</a>.
          </span>
        {:else if selectedCharacter && selectedMap}
          <span class="info-label">Loadout</span>
          <span class="info-value">
            <strong>{selectedCharacter.name}</strong>
            &nbsp;&rarr;&nbsp;
            <strong>{selectedMap.name}</strong>
            <span class="server-hint">via {selectedMap.server}</span>
          </span>
        {:else}
          <span class="info-hint">Pick a character and a map to continue.</span>
        {/if}
      </div>
      <button
        class="cta enter-btn"
        type="button"
        disabled={!canEnter || launching}
        onclick={enterWorld}
      >
        {#if launching}Launching&hellip;{:else}Enter world{/if}
      </button>
    </footer>
  {/if}
</div>

<style>
  .page { padding: 48px 56px 80px; max-width: 1280px; }

  .page-header { margin-bottom: 36px; }
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
    margin: 0 0 8px;
    color: #f4fafc;
  }
  .sub { font-size: 13px; color: #5fa0bc; font-style: italic; margin: 0; }

  .section { margin-bottom: 32px; }
  .section-title {
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5fa0bc;
    margin: 0 0 14px;
    font-weight: 500;
  }
  .empty { font-size: 13px; color: #5fa0bc; font-style: italic; }

  /* characters */
  .char-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }
  .char-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px 18px;
    background: rgba(10, 14, 19, 0.4);
    border: 1px solid #1e3d4f;
    color: inherit;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: all 120ms ease-out;
  }
  .char-card:hover { border-color: #2e5b72; background: rgba(46, 91, 114, 0.1); }
  .char-card.selected {
    border-color: #4fcfdf;
    background: rgba(79, 207, 223, 0.1);
    box-shadow: inset 0 0 0 1px rgba(79, 207, 223, 0.3);
  }
  .char-card.dead { opacity: 0.5; }
  .char-name { font-size: 15px; color: #f4fafc; font-weight: 500; }
  .char-meta {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #5fa0bc;
    letter-spacing: 0.06em;
    display: flex;
    gap: 6px;
  }
  .char-meta .dot { color: #1e3d4f; }
  .char-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 4px;
  }
  .hours {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #b9deeb;
    letter-spacing: 0.05em;
  }
  .status {
    font-size: 9px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 2px 8px;
    border: 1px solid #8e382c;
    color: #c97b70;
  }
  .status.alive { border-color: #2e5b72; color: #5fa0bc; }

  /* maps */
  .map-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
  .map-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 20px;
    background: rgba(10, 14, 19, 0.4);
    border: 1px solid #1e3d4f;
    color: inherit;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: all 120ms ease-out;
  }
  .map-card:hover:not(:disabled) {
    border-color: #2e5b72;
    background: rgba(46, 91, 114, 0.1);
  }
  .map-card.selected {
    border-color: #4fcfdf;
    background: rgba(79, 207, 223, 0.1);
    box-shadow: inset 0 0 0 1px rgba(79, 207, 223, 0.3);
  }
  .map-card.locked { opacity: 0.4; cursor: not-allowed; }
  .map-card.offline { opacity: 0.65; }

  .map-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
  }
  .map-name {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 17px;
    letter-spacing: 0.04em;
    color: #f4fafc;
  }
  .diff {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 3px 7px;
    border: 1px solid;
    white-space: nowrap;
  }
  .diff-low { border-color: #2e5b72; color: #5fa0bc; }
  .diff-medium { border-color: #5a4f2e; color: #c9a570; }
  .diff-high { border-color: #8e382c; color: #c97b70; }

  .map-area {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    color: #5fa0bc;
  }
  .map-desc {
    font-size: 12px;
    line-height: 1.5;
    color: #b9deeb;
    margin: 4px 0 0;
  }
  .map-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: 12px;
    border-top: 1px solid #1e3d4f;
  }
  .players {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #b9deeb;
    letter-spacing: 0.06em;
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  .indicator { width: 6px; height: 6px; display: inline-block; }
  .status-online { background: #4fcfdf; }
  .status-offline { background: #8e382c; }
  .status-maintenance { background: #c9a570; }
  .locked-tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #5fa0bc;
  }

  /* enter bar */
  .enter-bar {
    position: sticky;
    bottom: 24px;
    margin-top: 32px;
    padding: 18px 24px;
    background: rgba(5, 8, 11, 0.9);
    border: 1px solid #2e5b72;
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }
  .enter-info { flex: 1; min-width: 0; }
  .info-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #4fcfdf;
    margin-right: 12px;
  }
  .info-value { font-size: 13px; color: #b9deeb; }
  .info-value strong { color: #f4fafc; font-weight: 600; }
  .info-hint { font-size: 12px; color: #5fa0bc; font-style: italic; }
  .info-label.warn { color: #c97b70; }
  .inline-link {
    color: #4fcfdf;
    text-decoration: none;
    border-bottom: 1px solid #2e5b72;
  }
  .inline-link:hover { border-color: #4fcfdf; }
  .server-hint {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #5fa0bc;
    margin-left: 16px;
    letter-spacing: 0.06em;
  }
  .launch-error {
    font-family: 'JetBrains Mono', monospace;
    font-style: normal;
    color: #c97b70;
    font-size: 11px;
  }

  .enter-btn {
    padding: 14px 32px;
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    border: 1px solid #4fcfdf;
    color: #f4fafc;
    background: rgba(79, 207, 223, 0.12);
    cursor: pointer;
    font-family: inherit;
    font-weight: 500;
    transition: all 120ms ease-out;
  }
  .enter-btn:hover:not(:disabled) {
    background: rgba(79, 207, 223, 0.2);
    box-shadow: 0 0 24px rgba(79, 207, 223, 0.2);
  }
  .enter-btn:disabled {
    border-color: #1e3d4f;
    color: #5fa0bc;
    background: transparent;
    cursor: not-allowed;
  }

  .ghost {
    padding: 10px 18px;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border: 1px solid #2e5b72;
    color: #b9deeb;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
  }

  .state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 80px 0;
    gap: 16px;
    color: #5fa0bc;
    font-size: 13px;
  }
  .state.error { color: #c97b70; }
  .spinner {
    width: 28px;
    height: 28px;
    border: 2px solid #1e3d4f;
    border-top-color: #4fcfdf;
    animation: spin 1s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
