# Deferred — pick these up in the relevant phase

Living list of things we deliberately punted. Each has a phase tag so it
surfaces at the right time. Cross things off when done.

## Deferred from Phase 0 (day-one setup)

- [ ] **Discord webhook for `#ck-alerts`** — create channel + webhook,
  paste URL into `.env.local` as `DISCORD_ALERT_WEBHOOK_URL`. Required
  before any Phase 11 polish work (telemetry alerts). Optional but
  recommended earlier.
  → Pick up: **anytime, very low effort**.

- [ ] **Branch protection enforced on `main`** — Settings → Rules →
  Rulesets → Branch protection. Make sure status is *Active*, not just
  saved. Require PR + at least 1 approving review (self-approve OK).
  Require status checks: `lint`, `test`. Require linear history.
  → Pick up: **before any non-trivial PR**.

- [ ] **NestJS 10 → 11 upgrade** — Dependabot opened PRs #4, #5, #6 for
  this. Major version, breaking changes. Do this deliberately as part
  of Phase 1 prep, not as a same-day accept. Read NestJS 11 migration
  guide first.
  → Pick up: **start of Phase 1, before any modules are added**.

- [ ] **Biome 1.9 → 2.4 upgrade** — Dependabot PR #3. Major bump.
  Lint rules may change. Run on a branch first, fix any new violations,
  then merge.
  → Pick up: **start of Phase 1, after NestJS upgrade**.

- [ ] **Safe Dependabot PRs to merge now:**
  - PR #1: `actions/checkout` v4 → v6 (GH Actions)
  - PR #2: minor/patch group (TypeScript 5.9 → 6.0 etc.)
  → Pick up: **today if time, otherwise next dev session**.

- [ ] **GitHub Secrets populated for CI** — `DATABASE_URL_TEST`,
  `STEAM_API_KEY` (the rotated one), `DISCORD_ALERT_WEBHOOK_URL` when
  available. Required when CI starts doing more than lint+typecheck.
  → Pick up: **Phase 1 when test workflow needs DB**.

## Deferred from build guide

- [ ] **Custom font licensing** — designer sprint will pick the final
  display + body + mono fonts; we'll license + drop into
  `design/fonts/`. Until then the launcher uses Cinzel + Inter +
  JetBrains Mono fallbacks. They're fine but not locked.
  → Pick up: **Phase 0 designer sprint (run in parallel with Phase 1)**.

- [ ] **Freelance designer sprint (£1–3k)** — brand bible + finalized
  palette + font pair + ~30 icons + two NPC portraits as style
  templates. Budgeted in build guide §0.12.
  → Pick up: **anytime in Phase 1**, parallel work, 2-week sprint.

- [ ] **STORYLINE.md geography rewrite** — Chernarus → Everon, Vyshka →
  Arland, Namalsk → Kolguyev. Lore and faction structure transfer
  unchanged; only place names and POI references change.
  → Pick up: **anytime before Phase 10 content authoring**.

- [ ] **Workbench mod project creation** — interactive Workbench UI
  step, not templatable. See `mod/README.md` for the click-through.
  → Pick up: **first Phase 1 session, before any mod-side code**.

- [ ] **Tauri launcher init** — `bunx create-tauri-app launcher
  --template svelte-ts`. Replaces the stub.
  → Pick up: **first Phase 1 session**.

- [ ] **SvelteKit manager init** — `bunx sv create manager`. Configured
  to build into a `static/` output that CK Core serves at `/manager/*`.
  → Pick up: **first Phase 1 session**.

## Deferred for later phases

- [ ] **Tauri updater signing key generation** — `bun tauri signer
  generate -w ~/.tauri/checkpointk.key`. Private key into GitHub
  Secrets as `TAURI_SIGNING_PRIVATE_KEY`, public key into
  `TAURI_PUBLIC_KEY` in `.env.example`.
  → Pick up: **Phase 1 when launcher v1 is shipping**.

- [ ] **Cloudflare R2 setup** — launcher binaries + voice clips +
  backup destination. Buckets: `ck-launcher`, `ck-voice`, `ck-backups`.
  → Pick up: **Phase 1 when launcher releases need a download URL**.

- [ ] **Domain + DNS setup for checkpointk.com** — A record to prod
  Windows Server IP, CNAMEs for `core.checkpointk.com`,
  `dl.checkpointk.com`, `www.checkpointk.com`. TLS via Caddy or nginx
  + Let's Encrypt.
  → Pick up: **before public alpha**.

- [ ] **Belgium geo-block on Stripe + launcher** — Stripe
  `country_blocklist: ['BE']` for bag products; launcher hides Supply
  Bags section for BE IPs.
  → Pick up: **Phase 7 monetization**.

- [ ] **Age gate** — first-launch onboarding asks DOB; bag purchases
  blocked under 18.
  → Pick up: **Phase 7 monetization**.

- [ ] **Mod versioning + soft-kick hotfix flow** — full mod redeploy +
  player notification loop.
  → Pick up: **Phase 9 admin tools**.
