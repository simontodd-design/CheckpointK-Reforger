# Dev Environment Setup

One-time setup for a fresh dev machine. No Docker.

## Prerequisites (install in this order)

1. **Git** — `winget install Git.Git`
2. **Bun** — `irm bun.sh/install.ps1 | iex` → restart terminal → `bun --version`
3. **Node.js 20+** — `winget install OpenJS.NodeJS.LTS` (needed by some tooling)
4. **GitHub CLI** — `winget install GitHub.cli` → `gh auth login`
5. **VS Code** — `winget install Microsoft.VisualStudioCode`
6. **PostgreSQL 16** — see *PostgreSQL setup* below
7. **Memurai** (Redis-compatible for Windows) — see *Memurai setup* below
8. **Arma Reforger** + **Arma Reforger Tools** — Steam library (Tools tab for Workbench)

Recommended VS Code extensions:
- Svelte for VS Code
- Biome
- ESLint (Tauri/Rust later)
- GitLens
- Astro (for v2 web frontend)

## PostgreSQL setup

**Install:**
- Download the EDB installer: https://www.postgresql.org/download/windows/
- Run it. Defaults are fine. Set a strong `postgres` superuser password —
  remember it, you'll use it once to create the CK role.
- Installs as a Windows service. Starts on boot. Default port 5432.

**One-time CK database + role:**

```powershell
# Open psql as the postgres superuser
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -U postgres
```

```sql
CREATE ROLE ck WITH LOGIN PASSWORD 'ck_dev_password';
CREATE DATABASE ck_dev OWNER ck;
CREATE DATABASE ck_test OWNER ck;  -- used by `bun run test`
GRANT ALL PRIVILEGES ON DATABASE ck_dev TO ck;
GRANT ALL PRIVILEGES ON DATABASE ck_test TO ck;
\q
```

Verify from a normal shell:
```powershell
& 'C:\Program Files\PostgreSQL\16\bin\psql.exe' -U ck -d ck_dev -h localhost -c "SELECT version();"
```

## Memurai setup (Redis-compatible)

Memurai is the recommended Redis-on-Windows. Free Developer Edition is fine
for CK at any scale we'll hit.

- Download: https://www.memurai.com/get-memurai (Developer Edition)
- Default install. Runs as Windows service. Default port 6379.

Verify:
```powershell
& 'C:\Program Files\Memurai\memurai-cli.exe' ping
# → PONG
```

Alternative: if you already use **WSL2**, `sudo apt install redis-server`
in Ubuntu also works — point `REDIS_URL` at it.

## Repo

```powershell
cd F:\
git clone https://github.com/simontodd-design/CheckpointK-Reforger.git ArmaDev
cd ArmaDev
bun install
```

## Local env

```powershell
Copy-Item infra\env\.env.example .env.local
# Edit .env.local — minimum for Phase 0 smoke test:
#   - DATABASE_URL (defaults to localhost:5432, ck/ck_dev_password/ck_dev)
#   - REDIS_URL (defaults to localhost:6379)
#   - SENTRY_DSN_CORE (optional; free Sentry account)
#
# OAuth keys (Steam, Discord) come in Phase 1.
```

## Smoke test (Phase 0 deliverable)

```powershell
# 1. Apply schema (Phase 0 placeholder)
bun run db:migrate

# 2. Boot CK Core
bun run dev

# 3. In a second terminal — verify health
curl http://localhost:3001/health
# → {"status":"ok","service":"ck-core",...}

# 4. In a third terminal — start the agent
cd manager-agent
bun run dev
# → "connecting to CK Core" → "connected to CK Core"
```

All three pass → **Phase 0 foundation works.** Move to Phase 1.

## Daily workflow

```powershell
# Pull latest
git pull
bun install   # if any deps changed

# Postgres + Memurai already running as Windows services — nothing to start

# Start dev
bun run dev

# Hot-reload picks up edits instantly.
```

Postgres and Memurai stay running as services even when CK Core is stopped.
Zero startup overhead.

## Troubleshooting

- **`psql` not found** — installer doesn't add to PATH by default. Either
  add `C:\Program Files\PostgreSQL\16\bin` to PATH or call the full path.
- **CK Core can't connect to Postgres** — Windows Firewall is the usual
  culprit. Allow inbound on TCP 5432 (or just trust localhost).
- **Memurai port in use** — old Redis install on the same port. Stop the
  other Redis service.
- **`bun: command not found`** — restart terminal after install.
- **Workbench won't open** — verify Steam → Library → Tools → Arma
  Reforger Tools is installed.
- **Need to reset the DB completely:**
  ```sql
  DROP DATABASE ck_dev;
  CREATE DATABASE ck_dev OWNER ck;
  ```
  Then `bun run db:migrate` again.

## Backup (local dev)

Not strictly needed for dev work, but worth knowing for muscle memory
before prod:

```powershell
& 'C:\Program Files\PostgreSQL\16\bin\pg_dump.exe' -U ck -d ck_dev -F c -f ck_dev.dump
```

Restore:
```powershell
& 'C:\Program Files\PostgreSQL\16\bin\pg_restore.exe' -U ck -d ck_dev -c ck_dev.dump
```
