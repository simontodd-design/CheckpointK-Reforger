/**
 * Client-side hooks — runs once on app boot before any page renders.
 *
 * We use this to hydrate the session store from localStorage so every
 * page's first $effect sees the correct auth state. Without this hook,
 * pages mount with session.current = null and immediately redirect to
 * /login before the layout's $effect has a chance to run.
 */
import { session } from '$lib/session.svelte';

session.load();
