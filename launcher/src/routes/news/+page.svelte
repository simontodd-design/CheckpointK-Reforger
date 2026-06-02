<script lang="ts">
  import { listNews, type NewsItem } from '$lib/api';

  let items = $state<NewsItem[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  $effect(() => { void load(); });

  async function load() {
    loading = true;
    error = null;
    try {
      items = await listNews();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      loading = false;
    }
  }

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
</script>

<div class="page">
  <header class="page-header">
    <p class="eyebrow">Dispatches</p>
    <h1 class="display">News &amp; patches.</h1>
    <p class="sub">What changed since you last logged in.</p>
  </header>

  {#if loading}
    <div class="state"><div class="spinner"></div><p>Loading&hellip;</p></div>
  {:else if error}
    <div class="state error"><p>Failed: {error}</p></div>
  {:else if items.length === 0}
    <div class="state"><p>No dispatches yet.</p></div>
  {:else}
    <div class="feed">
      {#each items as item (item.id)}
        <article class="post">
          <header class="post-header">
            <span class="tag tag-{item.tag}">{item.tag}</span>
            <time class="post-date">{formatDate(item.publishedAt)}</time>
          </header>
          <h2 class="post-title">{item.title}</h2>
          <p class="post-body">{item.body}</p>
        </article>
      {/each}
    </div>
  {/if}
</div>

<style>
  .page { padding: 48px 56px 80px; max-width: 880px; }
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
  }
  .sub { font-size: 13px; color: #5fa0bc; font-style: italic; margin: 0; }

  .feed { display: flex; flex-direction: column; gap: 16px; }
  .post {
    padding: 24px 28px;
    background: rgba(10, 14, 19, 0.4);
    border: 1px solid #1e3d4f;
    border-left: 2px solid #2e5b72;
  }
  .post-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 12px;
  }
  .tag {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    padding: 3px 8px;
    border: 1px solid;
  }
  .tag-patch { border-color: #4fcfdf; color: #4fcfdf; }
  .tag-event { border-color: #c9a570; color: #c9a570; }
  .tag-announcement { border-color: #c97b70; color: #c97b70; }
  .tag-devlog { border-color: #5fa0bc; color: #5fa0bc; }
  .post-date {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: #5fa0bc;
    letter-spacing: 0.06em;
  }
  .post-title {
    font-family: 'Cinzel', Georgia, serif;
    font-size: 20px;
    font-weight: 500;
    letter-spacing: 0.03em;
    margin: 0 0 10px;
    color: #f4fafc;
  }
  .post-body {
    font-size: 13px;
    line-height: 1.6;
    color: #b9deeb;
    margin: 0;
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
