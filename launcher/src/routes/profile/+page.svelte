<script lang="ts">
  import { session } from '$lib/session.svelte';

  // Stub data — real stats endpoint lands when DB schema is done.
  const stats = {
    hoursPlayed: 142,
    charactersLost: 7,
    longestLife: '4d 12h',
    favouriteMap: 'Arland',
    pvpKills: 38,
    zombiesKilled: 1247,
    distanceWalked: '418 km',
    transfers: 23,
  };

  const achievements = [
    { id: 'first-blood', name: 'First blood', desc: 'First PvP kill', unlocked: true, date: '2026-03-14' },
    { id: 'transfer-veteran', name: 'Cross-map veteran', desc: 'Survive 10 cross-map transfers', unlocked: true, date: '2026-04-02' },
    { id: 'survivor', name: 'Survivor', desc: 'Stay alive for 7 days', unlocked: false },
    { id: 'collector', name: 'Collector', desc: 'Find one of every rare item', unlocked: false },
  ];
</script>

<div class="page">
  <header class="profile-head">
    <img src={session.profile?.avatarUrl} alt="" class="avatar" />
    <div class="head-text">
      <p class="eyebrow">Operator</p>
      <h1 class="display">{session.profile?.personaName}</h1>
      <p class="steam-id">{session.profile?.steamId}</p>
    </div>
  </header>

  <section class="section">
    <h2 class="section-title">Lifetime stats</h2>
    <div class="stat-grid">
      <div class="stat"><span class="stat-value">{stats.hoursPlayed}</span><span class="stat-label">hours played</span></div>
      <div class="stat"><span class="stat-value">{stats.charactersLost}</span><span class="stat-label">characters lost</span></div>
      <div class="stat"><span class="stat-value">{stats.longestLife}</span><span class="stat-label">longest life</span></div>
      <div class="stat"><span class="stat-value">{stats.favouriteMap}</span><span class="stat-label">favourite map</span></div>
      <div class="stat"><span class="stat-value">{stats.pvpKills}</span><span class="stat-label">PvP kills</span></div>
      <div class="stat"><span class="stat-value">{stats.zombiesKilled.toLocaleString()}</span><span class="stat-label">infected killed</span></div>
      <div class="stat"><span class="stat-value">{stats.distanceWalked}</span><span class="stat-label">distance walked</span></div>
      <div class="stat"><span class="stat-value">{stats.transfers}</span><span class="stat-label">map transfers</span></div>
    </div>
  </section>

  <section class="section">
    <h2 class="section-title">Achievements</h2>
    <div class="ach-grid">
      {#each achievements as a (a.id)}
        <div class="ach" class:unlocked={a.unlocked}>
          <div class="ach-icon">{a.unlocked ? '✓' : '·'}</div>
          <div class="ach-body">
            <div class="ach-name">{a.name}</div>
            <div class="ach-desc">{a.desc}</div>
            {#if a.unlocked && a.date}
              <div class="ach-date">Unlocked {a.date}</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </section>
</div>

<style>
  .page { padding: 48px 56px 80px; max-width: 1120px; }

  .profile-head {
    display: flex;
    align-items: center;
    gap: 24px;
    margin-bottom: 48px;
    padding-bottom: 32px;
    border-bottom: 1px solid #1e3d4f;
  }
  .avatar { width: 96px; height: 96px; border: 1px solid #2e5b72; }
  .head-text { display: flex; flex-direction: column; }
  .eyebrow {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #4fcfdf;
    margin: 0 0 8px;
  }
  .display {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 32px;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0 0 6px;
    color: #f4fafc;
  }
  .steam-id {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: #5fa0bc;
    letter-spacing: 0.08em;
    margin: 0;
  }

  .section { margin-bottom: 40px; }
  .section-title {
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #5fa0bc;
    margin: 0 0 18px;
    font-weight: 500;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1px;
    background: #1e3d4f;
    border: 1px solid #1e3d4f;
  }
  .stat {
    padding: 20px 22px;
    background: rgba(10, 14, 19, 0.7);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .stat-value {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 28px;
    color: #f4fafc;
    line-height: 1;
  }
  .stat-label {
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #5fa0bc;
  }

  .ach-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 10px;
  }
  .ach {
    display: flex;
    gap: 14px;
    padding: 16px 18px;
    background: rgba(10, 14, 19, 0.4);
    border: 1px solid #1e3d4f;
    opacity: 0.4;
  }
  .ach.unlocked { opacity: 1; border-color: #2e5b72; }
  .ach-icon {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border: 1px solid #1e3d4f;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 18px;
    color: #5fa0bc;
  }
  .ach.unlocked .ach-icon {
    border-color: #4fcfdf;
    color: #4fcfdf;
    background: rgba(79, 207, 223, 0.08);
  }
  .ach-body { display: flex; flex-direction: column; gap: 3px; flex: 1; }
  .ach-name { font-size: 13px; color: #f4fafc; }
  .ach-desc { font-size: 11px; color: #b9deeb; }
  .ach-date {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.1em;
    color: #5fa0bc;
    margin-top: 4px;
  }
</style>
