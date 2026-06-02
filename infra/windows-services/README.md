# Windows Services for prod

CK Core runs as a Windows Service in prod via NSSM. Postgres + Memurai
register their own services on install.

## Install NSSM

```powershell
# Download NSSM (https://nssm.cc/download) and place in PATH, or:
choco install nssm -y
```

## Register CK Core

```powershell
# Path to the bundled Bun binary (built by CI)
$ckCoreExe = "C:\Program Files\CheckpointK\ck-core.exe"

nssm install CKCore $ckCoreExe
nssm set CKCore DisplayName "Checkpoint K Core"
nssm set CKCore Description "CK backend — REST + WebSocket + jobs + admin"
nssm set CKCore Start SERVICE_AUTO_START
nssm set CKCore AppDirectory "C:\Program Files\CheckpointK"
nssm set CKCore AppEnvironmentExtra `
    "NODE_ENV=production" `
    "DOTENV_PATH=C:\ProgramData\CheckpointK\.env"
nssm set CKCore AppStdout "C:\ProgramData\CheckpointK\logs\ck-core.log"
nssm set CKCore AppStderr "C:\ProgramData\CheckpointK\logs\ck-core.err.log"
nssm set CKCore AppRotateFiles 1
nssm set CKCore AppRotateBytes 104857600   # 100MB rotation
nssm set CKCore AppExit Default Restart
nssm set CKCore AppRestartDelay 5000        # 5s between restarts
nssm set CKCore AppThrottle 60000           # circuit breaker: don't restart if up < 60s

nssm start CKCore
```

## Register the manager agent

```powershell
$agentExe = "C:\Program Files\CheckpointK\ck-manager-agent.exe"

nssm install CKManagerAgent $agentExe
nssm set CKManagerAgent DisplayName "Checkpoint K Manager Agent"
nssm set CKManagerAgent Start SERVICE_AUTO_START
nssm set CKManagerAgent AppDirectory "C:\Program Files\CheckpointK"
nssm set CKManagerAgent AppEnvironmentExtra `
    "NODE_ENV=production" `
    "DOTENV_PATH=C:\ProgramData\CheckpointK\.env"
nssm set CKManagerAgent AppStdout "C:\ProgramData\CheckpointK\logs\agent.log"
nssm set CKManagerAgent AppStderr "C:\ProgramData\CheckpointK\logs\agent.err.log"
nssm set CKManagerAgent AppRotateFiles 1
nssm set CKManagerAgent AppRotateBytes 104857600
nssm set CKManagerAgent AppExit Default Restart
nssm set CKManagerAgent AppRestartDelay 5000

nssm start CKManagerAgent
```

## Reforger servers

**Not registered as Windows Services.** They are spawned by
ck-manager-agent (the CK Manager supervisor pattern). Adding them as
their own services would conflict with the agent's lifecycle control.

## Common commands

```powershell
# Status
sc query CKCore
sc query CKManagerAgent

# Stop / start
nssm stop CKCore
nssm start CKCore

# Edit config (opens GUI)
nssm edit CKCore

# Uninstall
nssm remove CKCore confirm

# View live log
Get-Content C:\ProgramData\CheckpointK\logs\ck-core.log -Wait -Tail 50
```
