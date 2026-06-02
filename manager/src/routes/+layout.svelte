<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { getHealth, type HealthResponse } from '$lib/api';
  import { session } from '$lib/session.svelte';

  let { children } = $props();

  let core = $state<HealthResponse | null>(null);
  let coreState = $state<'connecting' | 'ok' | 'down'>('connecting');

  $effect(() => {
    session.load();
  });

  $effect(() => {
    void refreshHealth();
    const t = setInterval(() => void refreshHealth(), 20_000);
    return () => clearInterval(t);
  });

  async function refreshHealth() {
    const r = await getHealth();
    if (r) {
      core = r;
      coreState = 'ok';
    } else {
      core = null;
      coreState = 'down';
    }
  }

  const nav: { href: string; label: string }[] = [
    { href: '/', label: 'Dashboard' },
    { href: '/servers', label: 'Servers' },
    { href: '/hosts', label: 'Hosts' },
    { href: '/settings', label: 'Settings' },
  ];

  function isActive(href: string): boolean {
    if (href === '/') return page.url.pathname === '/';
    return page.url.pathname.startsWith(href);
  }

  function signOut() {
    session.clear();
    void goto('/login');
  }
</script>

<svelte:head>
  <title>CK Manager</title>
</svelte:head>

<div class="app">
  {#if session.isSignedIn}
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">CK</span>
        <div class="brand-text">
          <span class="brand-name">Manager</span>
          <span class="brand-sub">Operator console</span>
        </div>
      </div>

      <nav class="nav">
        {#each nav as item (item.href)}
          <a href={item.href} class="nav-item" class:active={isActive(item.href)}>
            {item.label}
          </a>
        {/each}
      </nav>

      <div class="user">
        <img src={session.profile?.avatarUrl} alt="" class="user-avatar" />
        <div class="user-meta">
          <span class="user-name">{session.profile?.personaName}</span>
          <span class="user-role">Admin</span>
        </div>
        <button class="signout" type="button" onclick={signOut}>Sign out</button>
      </div>
    </aside>
  {/if}

  <main class:full={!session.isSignedIn}>
    {@render children()}
  </main>
</div>

<div class="statusbar">
  <span class="env-tag">DEV</span>
  <span class="dot">·</span>
  {#if coreState === 'ok' && core}
    <span class="status ok">
      <span class="indicator"></span>
      Core v{core.version} ({Math.round(core.uptime_s)}s)
    </span>
  {:else if coreState === 'connecting'}
    <span class="status connecting">Core connecting&hellip;</span>
  {:else}
    <span class="status down">
      <span class="indicator"></span>
      Core unreachable
    </span>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    background: #000;
    color: #f4fafc;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }
  :global(*) { box-sizing: border-box; }

  :global(::-webkit-scrollbar) { width: 10px; height: 10px; }
  :global(::-webkit-scrollbar-track) { background: rgba(0,0,0,0.4); border-left: 1px solid #1e3d4f; }
  :global(::-webkit-scrollbar-thumb) { background: #2e5b72; border: 2px solid transparent; background-clip: padding-box; }
  :global(::-webkit-scrollbar-thumb:hover) { background: #4fcfdf; background-clip: padding-box; border: 2px solid transparent; }
  :global(*) { scrollbar-width: thin; scrollbar-color: #2e5b72 rgba(0,0,0,0.4); }

  .app {
    display: flex;
    height: 100vh;
    background: radial-gradient(ellipse at 15% 5%, #0f1b26 0%, #05080b 50%, #000 100%);
  }

  .sidebar {
    width: 240px;
    flex-shrink: 0;
    background: rgba(5, 8, 11, 0.7);
    border-right: 1px solid #1e3d4f;
    display: flex;
    flex-direction: column;
    padding: 28px 0 16px;
    overflow-y: auto;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 24px 24px;
    border-bottom: 1px solid #1e3d4f;
  }
  .brand-mark {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #4fcfdf 0%, #1e3d4f 100%);
    color: #05080b;
    font-family: 'Cinzel', Georgia, serif;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.04em;
  }
  .brand-text { display: flex; flex-direction: column; gap: 2px; }
  .brand-name {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 15px;
    letter-spacing: 0.08em;
    color: #f4fafc;
  }
  .brand-sub {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: #5fa0bc;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .nav { display: flex; flex-direction: column; flex: 1; padding: 16px 0; }
  .nav-item {
    padding: 11px 26px;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #5fa0bc;
    text-decoration: none;
    border-left: 2px solid transparent;
    transition: all 120ms ease-out;
  }
  .nav-item:hover { color: #b9deeb; background: rgba(79,207,223,0.04); }
  .nav-item.active {
    color: #f4fafc;
    border-left-color: #4fcfdf;
    background: rgba(79,207,223,0.08);
  }

  .user {
    padding: 16px 22px;
    border-top: 1px solid #1e3d4f;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .user-avatar { width: 40px; height: 40px; border: 1px solid #2e5b72; }
  .user-meta { display: flex; flex-direction: column; gap: 3px; }
  .user-name { font-size: 13px; color: #f4fafc; }
  .user-role {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: #4fcfdf;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .signout {
    background: none;
    border: 1px solid #2e5b72;
    color: #b9deeb;
    font-family: inherit;
    font-size: 10px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 7px 12px;
    cursor: pointer;
    text-align: center;
    transition: all 120ms ease-out;
  }
  .signout:hover { border-color: #c97b70; color: #c97b70; }

  main {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: 48px;
  }
  main.full { display: flex; align-items: center; justify-content: center; }

  .statusbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 28px;
    background: rgba(0,0,0,0.8);
    border-top: 1px solid #1e3d4f;
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.1em;
    color: #5fa0bc;
    z-index: 100;
    backdrop-filter: blur(6px);
  }
  .env-tag {
    color: #c9a570;
    border: 1px solid #c9a570;
    padding: 2px 7px;
    letter-spacing: 0.18em;
    font-size: 9px;
  }
  .dot { color: #1e3d4f; }
  .status {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .indicator { width: 6px; height: 6px; display: inline-block; }
  .ok .indicator { background: #4fcfdf; }
  .ok { color: #4fcfdf; }
  .down .indicator { background: #8e382c; }
  .down { color: #c97b70; }
  .connecting { color: #5fa0bc; opacity: 0.7; }
</style>
