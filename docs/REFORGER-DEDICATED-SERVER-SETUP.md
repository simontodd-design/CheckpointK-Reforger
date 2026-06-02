# Setting up a Reforger Dedicated Server host

This is per-host setup. Run it once on every machine that will host
CK Reforger servers — your local dev box, a VPS, a bare-metal game-host
provider, whatever.

Until you complete this, the CK Manager agent will run in **stub mode**:
spawn/stop commands flip in-memory state and emit fake log lines, but no
Reforger process actually starts. That's fine for UI development; this
walkthrough swaps in a real server.

## What you're installing

| Component | Steam app ID | Purpose |
| --- | --- | --- |
| `Arma Reforger` | `1874880` | the client (you already have this) |
| `Arma Reforger Server` | `1874900` | the headless dedicated server |
| `SteamCMD` | — | Valve's CLI for downloading Steam apps |

## 1. Install SteamCMD

Download from
<https://developer.valvesoftware.com/wiki/SteamCMD#Windows>
and extract `steamcmd.exe` to e.g. `C:\steamcmd\`.

```powershell
mkdir C:\steamcmd
# Drop the steamcmd.exe inside
& C:\steamcmd\steamcmd.exe +quit
# First run downloads helpers and exits.
```

## 2. Install Arma Reforger Server

The dedicated server is a free download under any Steam account that
owns the client (or even anonymous on some setups — try anon first).

```powershell
C:\steamcmd\steamcmd.exe +force_install_dir "C:\ReforgerServer" `
  +login anonymous `
  +app_update 1874900 validate `
  +quit
```

About 15-25 GB. When it finishes you should have:

```
C:\ReforgerServer\ArmaReforgerServer.exe
C:\ReforgerServer\addons\...
C:\ReforgerServer\...
```

If `login anonymous` fails with `Login Failure: No subscription`, use
your Steam account credentials instead. Steam Guard 2FA prompts work
interactively.

## 3. Tell the CK agent where the server is

Two options:

### Option A — env var (recommended)

In `F:\ArmaDev\.env.local`:

```
AGENT_REFORGER_SERVER_PATH=C:\ReforgerServer
```

Restart the agent. On boot it'll log:

```
[ck-manager-agent] Reforger server detected at C:\ReforgerServer
```

### Option B — auto-detect

The agent also probes these paths automatically:

* `C:\ReforgerServer`
* `C:\Program Files\ReforgerServer`
* `D:\ReforgerServer`
* `C:\ArmaReforgerServer`
* `C:\Games\ReforgerServer`

If your install is in one of these the env var isn't necessary.

## 4. Updating the server later

Re-run the same SteamCMD line as in step 2. The agent will eventually
do this on a schedule via a `steamcmd:update` command — for now it's
manual.

## 5. Port assignments

Each CK server reserves a small range starting at its `port`:

| offset | use |
| --- | --- |
| +0 | UDP game traffic (must be open to the world) |
| +1 | A2S — Steam server browser queries |
| +10 | RCON — local admin loopback only |

So if CK Manager assigns a server port 2001, Reforger will also bind
2002 and 2011. Don't put two servers within 11 ports of each other.

## 6. Firewall

```powershell
# Run as admin once per server port range
New-NetFirewallRule -DisplayName "CK Reforger 2001 UDP" `
  -Direction Inbound -Protocol UDP -LocalPort 2001-2002 -Action Allow
```

## 7. BattlEye

`battlEye: true` in the template assumes BE will be auto-installed by
the Reforger server on first run. The first spawn may take 60+ seconds
while BE downloads its components. Subsequent boots are fast.

## What this unlocks

Once `AGENT_REFORGER_SERVER_PATH` resolves to a real install, clicking
**Start** in CK Manager will:

1. Write `<server-id>.json` config to `C:\ReforgerServer\configs\ck\`
   from the matching template, with port/name/capacity filled in
2. Spawn `ArmaReforgerServer.exe -config configs/ck/<server-id>.json
   -logFile -profile profiles/<server-id>`
3. Stream the real Reforger stdout to the Manager live console
4. Track the actual PID, exit code, and crash detection
