# Checkpoint K — Arma Reforger

The next-generation build of Checkpoint K on Arma Reforger.

A persistent multi-region survival cluster (Arland → Everon → Kolguyev)
with seamless cross-server travel via a custom launcher, two-layer
persistence, and 13 enclaves of lore-driven politics.

## Documentation

- **[Build Guide](../DayZDev/CK_REFORGER_BUILD_GUIDE.md)** — full
  architecture + phased implementation plan
- **[Feature Inventory](../DayZDev/CK_DAYZ_INVENTORY.md)** — reference
  catalog from the DayZ build used as the feature spec

## Project structure

```
core/             CK Core — TypeScript + NestJS + Bun (REST + WebSocket + auth + jobs)
manager/          CK Manager — SvelteKit admin GUI (served by CK Core)
manager-agent/    Per-host supervisor process (Node)
launcher/         CK Launcher — Tauri (Rust + SvelteKit), player-facing
mod/              Reforger mod project (CheckpointK_Mod) — Workbench
design/           Design system — tokens, brand bible, assets, audio, fonts
infra/            Deploy scripts, env templates, nginx/caddy configs, NSSM Windows Services
docs/             Architecture, runbooks, internal docs
.github/          CI/CD workflows, issue/PR templates, CODEOWNERS
```

## Quick start (dev)

Prerequisites: Bun, Node 20+, PostgreSQL 16, Memurai (Redis for Windows),
Arma Reforger + Tools (Steam). Full setup in
[docs/DEV_SETUP.md](docs/DEV_SETUP.md).

```powershell
# 1. Install dependencies across the monorepo
bun install

# 2. Apply DB schema (Postgres + Memurai already running as Windows services)
bun run db:migrate

# 3. Start CK Core + Manager UI (dev mode with hot reload)
bun run dev

# 4. Open CK Manager
# http://localhost:3001/manager
```

## License

MIT — see [LICENSE](LICENSE).

## Security

Report vulnerabilities privately — see [SECURITY.md](SECURITY.md).
