# Checkpoint K — Design System

Single source of truth for the visual, motion, and audio language of
Checkpoint K. Read by:

- **CK Launcher** (Tauri + SvelteKit) — imports `tokens/*.json`, generates
  CSS variables at build time.
- **CK Manager** (SvelteKit) — same imports, same variables.
- **CK Mod** (Reforger Workbench `.layout` files) — generated artifacts.
  `bun run design:sync` rewrites them when tokens change.

## Folder structure

```
design/
├── tokens/                  source of truth — JSON
├── assets/                  SVG icons, illustrations, backgrounds, logos
├── audio/                   UI sound palette, ambient loops, NPC voice fragments
├── fonts/                   licensed display + body font files
├── brand-bible.md           the rules (do / don't, voice, tone)
└── scripts/sync-mod-tokens.ts   propagation script
```

## Status

**Placeholder values.** A freelance designer sprint in Phase 0 replaces
these with finalized choices. See build guide §0.12 (Design System).

The placeholders are functional — the launcher and mod will look
"placeholder dystopian" until the real palette lands, but everything
plumbed and ready.

## Workflow when tokens change

```powershell
# 1. Edit design/tokens/colors.json (or any other token file)
# 2. Sync to mod layout files
bun run design:sync

# 3. Verify launcher picks up changes
cd launcher
bun run dev
# Hot reload should show new colors immediately

# 4. Verify mod picks up changes
# Workbench → reload world → new colors in HUDs/menus

# 5. Commit
git add design/ mod/CheckpointK_Mod/UI/Layouts/
git commit -m "design: update color palette"
```

## CI check

`design:check` runs in lint.yml — fails the build if any
`mod/.../.layout` file references a color that doesn't match a current
token value. Prevents drift.
