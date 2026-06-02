# CheckpointK_Mod

The Arma Reforger mod project. Authored in **Workbench** (Windows only,
bundled with Arma Reforger Tools on Steam).

**Status:** scaffold only. Project created in Workbench during Phase 0.

## Init (Phase 0)

1. Open Steam → Library → Tools → install **Arma Reforger Tools**.
2. Launch Workbench.
3. **File → New Project** → name `CheckpointK_Mod`, location:
   `F:\ArmaDev\mod\CheckpointK_Mod`.
4. Project settings:
   - GUID: auto-generated (record it; needed for `-addons` startup param
     and for the launcher's mod manifest).
   - Project ID: `CheckpointK`.
   - Configurations: enable **PC** and **HEADLESS**. Skip XBOX_ONE,
     XBOX_SERIES, PS4 (PC-only build).
   - Build tags: `ck_prod`, `ck_dev`. Server-only code gets `ck_server`.
5. Add dependencies (order matters):
   - Enforce Script Extensions (NarcoMarshDev)
   - Enfusion Database Framework (Arkensor)
   - Enfusion Persistence Framework (Arkensor)
6. Reserve the mod GUID on mod.io as `CheckpointK_Mod`.
7. Record the GUID in `infra/env/.env.example` as `CK_MOD_ID=`.

## Folder layout (added as code lands)

```
mod/CheckpointK_Mod/
├── scripts/
│   ├── Game/     (Enforce Script — bridge, RPC, net)
│   ├── World/    (entities, components, persistence)
│   └── UI/       (menus, HUDs, layouts)
├── Prefabs/
│   ├── NPCs/Arland/
│   ├── NPCs/Everon/
│   ├── NPCs/Kolguyev/
│   └── Triggers/
├── UI/Layouts/
├── Scenarios/    (CK_Arland.conf, CK_Everon.conf, CK_Kolguyev.conf)
├── WorldLayers/  (overlay layers per scenario)
└── Configs/
```

## .gitignore

Workbench artifacts (build/, profile/, addons/data/) are gitignored at
the repo root. Source files (`.c`, `.h`, `.layout`, `.gproj`, `.conf`,
`.ent`) are tracked.
