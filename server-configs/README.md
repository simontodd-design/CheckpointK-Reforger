# CK dedicated-server config templates

Each `*.template.json` here is a Bohemia-spec Reforger server config with
CK-specific defaults. The agent reads the matching template at spawn time,
fills in dynamic fields (port, capacity, server name), and writes the
resulting config to a per-server work directory before launching
`ArmaReforgerServer.exe -config <path>`.

## Template fields the agent substitutes

| placeholder | replaced with |
| --- | --- |
| `__SERVER_NAME__` | The server's display name (CkServer.name) |
| `__SERVER_ID__` | The server's id (e.g. `srv-arland-abc123`) |
| `__BIND_PORT__` | `CkServer.port` (UDP) |
| `__A2S_PORT__` | `port + 1` (Steam server browser) |
| `__RCON_PORT__` | `port + 10` |
| `__CAPACITY__` | `CkServer.capacity` |
| `__ADMIN_PASSWORD__` | `RCON_ADMIN_PASSWORD` env on the host |

## Scenario IDs

The `scenarioId` field is the asset ID of the scenario to load.
For each native CK map the agent passes:

| mapId | scenarioId (placeholder — fill in once mod is published) |
| --- | --- |
| `arland` | `{ECC61978EDCC2B5A}Missions/__CK_ARLAND__.conf` |
| `everon` | `{ECC61978EDCC2B5A}Missions/__CK_EVERON__.conf` |
| `kolguyev` | `{ECC61978EDCC2B5A}Missions/__CK_KOLGUYEV__.conf` |

Real scenario IDs land when the Workbench mod project ships its first
mission asset.
