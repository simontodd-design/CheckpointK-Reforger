# CK Manager

Admin GUI for cluster ops. SvelteKit app, builds to static, served by
CK Core at `/manager/*`.

**Status:** scaffold only. Full implementation in **Phase 1** of the
[build guide](../../DayZDev/CK_REFORGER_BUILD_GUIDE.md).

## Planned v1 pages
- **Cluster** — grid of servers with live status
- **Server detail** — log tail, RCON, start/stop/restart
- **Add server** — wizard (pick map → install → start)
- **Hosts** — connected agents
- **Audit log**

## Init (Phase 1)
```bash
cd manager
bunx sv create .   # SvelteKit init
```
