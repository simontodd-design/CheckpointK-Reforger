# CK Launcher

Player-facing launcher. Tauri shell (Rust) + SvelteKit frontend.

**Status:** scaffold only. Full implementation in **Phase 1** of the
[build guide](../../DayZDev/CK_REFORGER_BUILD_GUIDE.md).

## Init (Phase 1)
```bash
cd launcher
bunx create-tauri-app@latest . --template sveltekit-ts
```

## Capabilities (v1)
- Steam + Discord OAuth
- Character select
- Server picker (CK cluster only)
- Mod validation against CK Core manifest
- Spawn Reforger via `-client <IP>` + `-addons <ids>`
- Loading overlay during cross-server transitions (file-watcher pattern)
- Anti-bypass session ticket
- Discord Rich Presence
- Friend join
- Offline mode (cached data)
