<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { getVersion } from '@tauri-apps/api/app';
  import { getHealth, type HealthResponse } from '$lib/api';
  import { session } from '$lib/session.svelte';
  import { armaStore } from '$lib/arma.svelte';

  let { children } = $props();

  let launcherVersion = $state('0.0.1');
  let coreState = $state<'connecting' | 'ok' | 'down'>('connecting');
  let coreInfo = $state<HealthResponse | null>(null);

  // Load session from localStorage on mount.
  $effect(() => {
    session.load();
  });

  // Boot-time Arma detection: try the stored path first (re-validates),
  // and if nothing is stored, kick off an auto-detect scan once.
  $effect(() => {
    void (async () => {
      await armaStore.load();
      if (armaStore.status === 'unknown') {
        await armaStore.detectAuto();
      }
    })();
  });

  // Read Tauri version.
  $effect(() => {
    void getVersion()
      .then((v) => (launcherVersion = v))
      .catch(() => {});
  });

  // Poll core health every 30s.
  $effect(() => {
    void refreshHealth();
    const interval = setInterval(() => void refreshHealth(), 30_000);
    return () => clearInterval(interval);
  });

  async function refreshHealth() {
    const r = await getHealth();
    if (r.ok && r.data) {
      coreState = 'ok';
      coreInfo = r.data;
    } else {
      coreState = 'down';
      coreInfo = null;
    }
  }

  // Nav items — hidden until signed in.
  const navItems: { href: string; label: string }[] = [
    { href: '/', label: 'Home' },
    { href: '/play', label: 'Play' },
    { href: '/news', label: 'News' },
    { href: '/store', label: 'Store' },
    { href: '/profile', label: 'Profile' },
    { href: '/settings', label: 'Settings' },
  ];

  function isActive(href: string): boolean {
    if (href === '/') return page.url.pathname === '/';
    return page.url.pathname.startsWith(href);
  }

  function signOut() {
    session.clear();
    void goto('/');
  }
</script>

<div class="app">
  {#if session.isSignedIn}
    <aside class="sidebar">
      <a href="/" class="brand">
        <img src="/CKlogo.png" alt="CK" />
        <div class="brand-text">
          <span class="brand-name">Checkpoint K</span>
          <span class="brand-sub">v{launcherVersion}</span>
        </div>
      </a>

      <nav class="nav">
        {#each navItems as item (item.href)}
          <a
            href={item.href}
            class="nav-item"
            class:active={isActive(item.href)}
          >
            {item.label}
          </a>
        {/each}
      </nav>

      <div class="user-chip">
        <img src={session.profile?.avatarUrl} alt="" class="user-avatar" />
        <div class="user-text">
          <span class="user-name">{session.profile?.personaName}</span>
          <button class="signout" type="button" onclick={signOut}>Sign out</button>
        </div>
      </div>
    </aside>
  {/if}

  <main class:no-sidebar={!session.isSignedIn}>
    {@render children()}
  </main>
</div>

<div class="statusbar">
  <span class="status-item">Launcher v{launcherVersion}</span>
  <span class="dot">·</span>
  {#if armaStore.status === 'ready'}
    <span class="status-item ok" title={armaStore.install?.install_dir ?? ''}>
      <span class="indicator" aria-hidden="true"></span>
      Reforger detected
    </span>
  {:else if armaStore.status === 'detecting'}
    <span class="status-item connecting">Reforger&hellip;</span>
  {:else}
    <span class="status-item down" title={armaStore.lastError ?? 'Reforger install not found'}>
      <span class="indicator" aria-hidden="true"></span>
      Reforger missing
    </span>
  {/if}
  <span class="dot">·</span>
  {#if coreState === 'connecting'}
    <span class="status-item connecting">Core connecting&hellip;</span>
  {:else if coreState === 'ok' && coreInfo}
    <span class="status-item ok">
      <span class="indicator" aria-hidden="true"></span>
      Core v{coreInfo.version}
    </span>
  {:else}
    <span class="status-item down">
      <span class="indicator" aria-hidden="true"></span>
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

  .app {
    display: flex;
    min-height: 100vh;
    background: radial-gradient(ellipse at 20% 10%, #0f1b26 0%, #05080b 50%, #000 100%);
  }

  .sidebar {
    width: 220px;
    flex-shrink: 0;
    background: rgba(5, 8, 11, 0.6);
    border-right: 1px solid #1e3d4f;
    display: flex;
    flex-direction: column;
    padding: 24px 0 16px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 20px 24px;
    text-decoration: none;
    color: inherit;
    border-bottom: 1px solid #1e3d4f;
  }
  .brand img {
    width: 36px;
    height: 36px;
    object-fit: contain;
  }
  .brand-text { display: flex; flex-direction: column; gap: 1px; }
  .brand-name {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 14px;
    letter-spacing: 0.08em;
    color: #f4fafc;
  }
  .brand-sub {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: #5fa0bc;
    letter-spacing: 0.1em;
  }

  .nav {
    display: flex;
    flex-direction: column;
    padding: 16px 0;
    flex: 1;
  }
  .nav-item {
    padding: 11px 24px;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #5fa0bc;
    text-decoration: none;
    border-left: 2px solid transparent;
    transition: all 120ms ease-out;
  }
  .nav-item:hover {
    color: #b9deeb;
    background: rgba(79, 207, 223, 0.04);
  }
  .nav-item.active {
    color: #f4fafc;
    border-left-color: #4fcfdf;
    background: rgba(79, 207, 223, 0.08);
  }

  .user-chip {
    padding: 16px 20px;
    border-top: 1px solid #1e3d4f;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .user-avatar {
    width: 36px;
    height: 36px;
    border: 1px solid #2e5b72;
  }
  .user-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
    flex: 1;
  }
  .user-name {
    font-size: 12px;
    color: #f4fafc;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .signout {
    font-family: inherit;
    font-size: 9px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #5fa0bc;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    text-align: left;
  }
  .signout:hover { color: #c97b70; }

  main {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding-bottom: 32px;
  }
  main.no-sidebar { display: flex; align-items: center; justify-content: center; }

  .statusbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 24px;
    background: rgba(0, 0, 0, 0.75);
    border-top: 1px solid #1e3d4f;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 16px;
    gap: 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.1em;
    color: #2e5b72;
    z-index: 100;
    backdrop-filter: blur(4px);
  }
  .status-item {
    color: #5fa0bc;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .dot { color: #1e3d4f; }
  .indicator { width: 5px; height: 5px; display: inline-block; }
  .ok .indicator { background: #4fcfdf; }
  .down { color: #c97b70; }
  .down .indicator { background: #8e382c; }
  .connecting { color: #5fa0bc; opacity: 0.6; }
</style>
