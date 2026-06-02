# CK Reforger — Architecture

The full architecture and phased build plan lives in the **build guide**:

**[F:\DayZDev\CK_REFORGER_BUILD_GUIDE.md](../../DayZDev/CK_REFORGER_BUILD_GUIDE.md)**

Companion reference for the feature spec (catalog from the DayZ build):

**[F:\DayZDev\CK_DAYZ_INVENTORY.md](../../DayZDev/CK_DAYZ_INVENTORY.md)**

## In short

- **CK Core** — TS / NestJS / Bun backend. REST + WebSocket + auth + jobs.
- **CK Manager** — SvelteKit admin GUI, served by CK Core at `/manager`.
- **ck-manager-agent** — per-host process supervisor. Spawns Reforger servers.
- **CK Launcher** — Tauri app. Player-facing. Coordinates cross-server hops.
- **CheckpointK_Mod** — Reforger mod, authored in Workbench.

## Persistence contract

Two layers, hard rule on authority:

- **CK Core (canonical)** — anything that crosses servers or matters long-term.
- **EPF (per-server)** — entity world state on a specific server. Cache only.

If they diverge, CK Core wins.

## Cluster

v1 ships three native Reforger maps (no workshop dependencies):

- **Arland** — starter, ~6 km², default unlock
- **Everon** — mainland hub, 51 km² land, unlocked via Travel Pass
- **Kolguyev** — cold frontier, 35 km² land, unlocked via late-game arc

All on one beefy box for v1. Multi-host migration path baked into the
agent architecture for later.

## Detailed docs

As they're written:

- `PERSISTENCE_MODEL.md` — Phase 2
- `NETWORK_PROTOCOL.md` — Phase 1
- `LAUNCHER_API.md` — Phase 1
- `ANTI_CHEAT.md` — Phase 11
- `RUNBOOKS/` — operational playbooks (restore, hotfix, crash recovery)
