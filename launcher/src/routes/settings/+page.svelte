<script lang="ts">
  import { session } from '$lib/session.svelte';

  // Settings are stored in localStorage for v1. Server-side prefs (cross-device
  // sync) lands when the users table goes in.
  const SETTINGS_KEY = 'ck.settings.v1';

  type Settings = {
    masterVolume: number;
    musicVolume: number;
    voiceVolume: number;
    reduceMotion: boolean;
    hideJoinNotifications: boolean;
    autoStartGame: boolean;
    selectedRegion: 'eu-west' | 'eu-central' | 'us-east' | 'auto';
  };

  const defaults: Settings = {
    masterVolume: 80,
    musicVolume: 60,
    voiceVolume: 90,
    reduceMotion: false,
    hideJoinNotifications: false,
    autoStartGame: false,
    selectedRegion: 'auto',
  };

  let s = $state<Settings>({ ...defaults });
  let saved = $state(false);

  $effect(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      try { s = { ...defaults, ...JSON.parse(raw) }; }
      catch { /* keep defaults */ }
    }
  });

  function save() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
    saved = true;
    setTimeout(() => (saved = false), 1500);
  }

  function reset() {
    s = { ...defaults };
    localStorage.removeItem(SETTINGS_KEY);
  }
</script>

<div class="page">
  <header class="page-header">
    <p class="eyebrow">Config</p>
    <h1 class="display">Settings.</h1>
    <p class="sub">Audio, behaviour, region. Game-side settings live in Reforger.</p>
  </header>

  <section class="section">
    <h2 class="section-title">Audio</h2>
    <div class="settings-block">
      <div class="row">
        <label for="master">Master volume</label>
        <input id="master" type="range" min="0" max="100" bind:value={s.masterVolume} />
        <span class="row-val">{s.masterVolume}%</span>
      </div>
      <div class="row">
        <label for="music">Music</label>
        <input id="music" type="range" min="0" max="100" bind:value={s.musicVolume} />
        <span class="row-val">{s.musicVolume}%</span>
      </div>
      <div class="row">
        <label for="voice">Voice (UI)</label>
        <input id="voice" type="range" min="0" max="100" bind:value={s.voiceVolume} />
        <span class="row-val">{s.voiceVolume}%</span>
      </div>
    </div>
  </section>

  <section class="section">
    <h2 class="section-title">Behaviour</h2>
    <div class="settings-block">
      <label class="toggle">
        <input type="checkbox" bind:checked={s.reduceMotion} />
        <span class="toggle-text">
          <span class="toggle-name">Reduce motion</span>
          <span class="toggle-sub">Disable animated backgrounds and transitions</span>
        </span>
      </label>
      <label class="toggle">
        <input type="checkbox" bind:checked={s.hideJoinNotifications} />
        <span class="toggle-text">
          <span class="toggle-name">Hide join notifications</span>
          <span class="toggle-sub">Don't show toasts when friends come online</span>
        </span>
      </label>
      <label class="toggle">
        <input type="checkbox" bind:checked={s.autoStartGame} />
        <span class="toggle-text">
          <span class="toggle-name">Auto-launch last character</span>
          <span class="toggle-sub">Skip the foyer and drop straight into last map</span>
        </span>
      </label>
    </div>
  </section>

  <section class="section">
    <h2 class="section-title">Region</h2>
    <div class="settings-block">
      <div class="row">
        <label for="region">Preferred region</label>
        <select id="region" bind:value={s.selectedRegion}>
          <option value="auto">Auto (lowest ping)</option>
          <option value="eu-west">EU West (London)</option>
          <option value="eu-central">EU Central (Frankfurt)</option>
          <option value="us-east">US East</option>
        </select>
      </div>
    </div>
  </section>

  <section class="section">
    <h2 class="section-title">Account</h2>
    <div class="settings-block account-row">
      <div>
        <div class="account-name">{session.profile?.personaName}</div>
        <div class="account-id">{session.profile?.steamId}</div>
      </div>
      <button class="ghost" type="button" onclick={() => session.clear()}>Sign out</button>
    </div>
  </section>

  <footer class="footer-bar">
    <button class="ghost" type="button" onclick={reset}>Reset to defaults</button>
    <div class="save-group">
      {#if saved}<span class="saved-flag">Saved &checkmark;</span>{/if}
      <button class="cta" type="button" onclick={save}>Save</button>
    </div>
  </footer>
</div>

<style>
  .page { padding: 48px 56px 80px; max-width: 760px; }
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
  .settings-block {
    padding: 22px 24px;
    background: rgba(10, 14, 19, 0.4);
    border: 1px solid #1e3d4f;
  }

  .row {
    display: grid;
    grid-template-columns: 160px 1fr 60px;
    align-items: center;
    gap: 16px;
    padding: 10px 0;
  }
  .row + .row { border-top: 1px solid #1e3d4f; }
  .row label { font-size: 13px; color: #b9deeb; }
  .row-val {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #4fcfdf;
    text-align: right;
  }
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 2px;
    background: #1e3d4f;
    outline: none;
  }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    background: #4fcfdf;
    cursor: pointer;
  }
  input[type="range"]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: #4fcfdf;
    cursor: pointer;
    border: none;
    border-radius: 0;
  }
  select {
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #2e5b72;
    color: #f4fafc;
    padding: 8px 12px;
    font-family: inherit;
    font-size: 12px;
    cursor: pointer;
  }

  .toggle {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 12px 0;
    cursor: pointer;
  }
  .toggle + .toggle { border-top: 1px solid #1e3d4f; }
  .toggle input { margin-top: 3px; accent-color: #4fcfdf; }
  .toggle-text { display: flex; flex-direction: column; gap: 3px; }
  .toggle-name { font-size: 13px; color: #f4fafc; }
  .toggle-sub { font-size: 11px; color: #5fa0bc; }

  .account-row { display: flex; align-items: center; justify-content: space-between; }
  .account-name { font-size: 14px; color: #f4fafc; margin-bottom: 4px; }
  .account-id {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #5fa0bc;
    letter-spacing: 0.08em;
  }

  .footer-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 24px;
    border-top: 1px solid #1e3d4f;
  }
  .save-group { display: flex; align-items: center; gap: 16px; }
  .saved-flag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #4fcfdf;
    letter-spacing: 0.08em;
  }

  .cta, .ghost {
    padding: 11px 22px;
    font-family: inherit;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    border: 1px solid;
    background: transparent;
    cursor: pointer;
    font-weight: 500;
  }
  .cta { border-color: #9dd0e8; color: #f4fafc; background: rgba(157, 208, 232, 0.08); }
  .cta:hover { border-color: #4fcfdf; background: rgba(79, 207, 223, 0.14); }
  .ghost { border-color: #2e5b72; color: #b9deeb; }
  .ghost:hover { border-color: #5fa0bc; color: #f4fafc; }
</style>
