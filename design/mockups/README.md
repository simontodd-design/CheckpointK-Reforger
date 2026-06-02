# CK design mockups

Static HTML reference visuals. Open in a browser (no server needed).
All use the actual `../CKlogo.png` and pull tokens from
`design/tokens/`.

## In-game HUD

- **`hud-v1.html`** — full HUD with top-left status (premium icon, name, HP, stamina, scrip, crew), top-right active quest, bottom-right survival vitals, bottom-center interaction prompt. NPC dialog, DBNO, invite, confirmation, and journal windows shown in the [in-chat mockup widget](../../docs/ARCHITECTURE.md) too.

## Launcher

Five connected pages. The left rail nav links them; clicking through gives you a feel for the full experience.

- **`launcher/index.html`** — Refuge / Character select. Default landing. Featured character with portrait, level/XP/days, "Wake up — return to Arland" CTA. Other survivor slots below. **Click Play drops them into the region they were last on. No map picker.**
- **`launcher/news.html`** — Radio / Broadcasts. In-fiction news feed (Refuge announcements, field events, system notices). Upcoming events sidebar. Cluster status indicators.
- **`launcher/store.html`** — Sponsorship + scrip packs + field kits + cosmetics. Stripe integration. Pending-delivery callout when items are queued. Cosmetic/QoL only — never pay-to-win.
- **`launcher/profile.html`** — Field log. Level/XP/skills tree, enclave reputation, leaderboard standings, achievements, recent activity log.
- **`launcher/settings.html`** — Account, audio, notifications, display, about. Conservative.
- **`launcher/loading.html`** — Cross-server transition overlay. Cinematic, in-fiction status ("Boarding the An-2"), live status feed.

## How to view

Open `launcher/index.html` in any browser. Cross-page links work via relative paths. The logo loads from `../CKlogo.png`.

## How they get used

These are **reference** for the Phase 1 launcher build (Tauri + SvelteKit). The token values used here come from `design/tokens/colors.json` — when the freelance designer sprint locks the final palette, both this HTML and the launcher Svelte components update together.

## Status

- ✓ Color palette extracted from `CKlogo.png` and applied throughout
- ✓ All pages use the real logo file
- ✓ Brand-bible rules respected (pure black base, sharp corners, no rounded buttons, sentence case, mono for technical data, ember for warmth/money only, blood red for catastrophe only)
- ◯ Final fonts pending (placeholder Cinzel / Inter / JetBrains Mono)
- ◯ NPC portraits pending (silhouette placeholders)
- ◯ Custom icons pending (using inline SVG paths matching outline style)
- ◯ Sound design pending
- ◯ Background video loops pending (Phase 11 polish)
