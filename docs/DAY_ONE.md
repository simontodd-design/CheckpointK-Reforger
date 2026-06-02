# Day one — bring the dev environment up

Walk through this top to bottom. Tick boxes as you go. About 2–3 hours
end to end if nothing exotic breaks.

By the end you'll have CK Core running on `localhost:3001` with
`/health` returning OK, Postgres + Memurai running as Windows services,
and the repo pushed to GitHub. **Phase 0 smoke test complete.**

---

## 0 · Rotate the Steam API key first

You shared `F875E74563F45C58DF0EA665419A1494` in chat. Treat it as
burned.

- [ ] Open https://steamcommunity.com/dev/apikey
- [ ] Click `Revoke My Steam Web API Key`
- [ ] Generate a new one (any domain, you'll use it for dev only)
- [ ] Save it somewhere safe — you'll paste it into `.env.local` in step 6
- [ ] When you go to prod, rotate again — never commit any key

---

## 1 · Prerequisites

Install via `winget` from an admin PowerShell. Restart any terminal
after each install so PATH refreshes.

- [ ] `winget install Git.Git`
- [ ] `winget install OpenJS.NodeJS.LTS`
- [ ] `winget install GitHub.cli`
- [ ] `winget install Microsoft.VisualStudioCode`
- [ ] **Bun** (no winget package): `irm bun.sh/install.ps1 | iex`
  - Restart PowerShell, then verify: `bun --version`

- [ ] **Arma Reforger Tools** — Steam library → Tools tab → search "Arma Reforger Tools" → Install. Bundled Workbench is what we'll use for the mod.

**Verify everything is on PATH:**
```powershell
git --version
node --version          # should be 20+
bun --version
gh --version
```

---

## 2 · Install PostgreSQL 18

- [ ] Download installer: https://www.postgresql.org/download/windows/
  - Pick PostgreSQL 18 (current — 3× faster I/O than 16, released Sep 2025, on 18.4 since May 2026)
  - EDB installer is the standard one
- [ ] Run installer. Defaults are fine except:
  - **Set a strong superuser (`postgres`) password.** Save it somewhere — you'll use it once in step 5
  - Port: keep `5432`
  - Locale: `Default locale`
  - Skip Stack Builder at the end
- [ ] Verify: open `pgAdmin 4` from the start menu. Connect with the `postgres` user. If it opens and shows databases, you're good.

Optional but useful — add `psql` to PATH so you can use it from any terminal:

```powershell
# Add to user PATH (one-time)
[Environment]::SetEnvironmentVariable(
  "Path",
  [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\Program Files\PostgreSQL\18\bin",
  "User"
)
```

Restart PowerShell. Then `psql --version` should work.

---

## 3 · Install Memurai (Redis for Windows)

- [ ] Download Memurai Developer Edition (free): https://www.memurai.com/get-memurai
- [ ] Run installer. Default install location is fine. Runs as a Windows service automatically.
- [ ] Verify:
  ```powershell
  & 'C:\Program Files\Memurai\memurai-cli.exe' ping
  # Expected output: PONG
  ```
- [ ] (Optional) Add to PATH:
  ```powershell
  [Environment]::SetEnvironmentVariable(
    "Path",
    [Environment]::GetEnvironmentVariable("Path", "User") + ";C:\Program Files\Memurai",
    "User"
  )
  ```

---

## 4 · GitHub auth + repo push

The repo at `simontodd-design/CheckpointK-Reforger` already exists on
GitHub but is empty. We push the scaffold to it.

- [ ] `gh auth login` — pick HTTPS, log in via browser

```powershell
cd F:\ArmaDev

git init -b main
git config user.name "Simon Todd"
git config user.email "simontodd.design@gmail.com"

git remote add origin https://github.com/simontodd-design/CheckpointK-Reforger.git

git add .
git commit -m "chore: initial scaffold (Phase 0 foundation)"
git push -u origin main
```

- [ ] Open https://github.com/simontodd-design/CheckpointK-Reforger and confirm the files are there
- [ ] Enable branch protection on `main`:
  - Settings → Branches → Add rule → branch name `main`
  - Require pull request before merge (you can self-approve — it's the discipline that matters)
  - Require status checks: lint, test (these will populate once the workflows run)
- [ ] Enable: Settings → Code security → Dependabot alerts + security updates, Secret scanning

---

## 5 · Create the CK database + role

Open a PowerShell, run psql as the superuser:

```powershell
psql -U postgres -h localhost
# Enter the postgres password you set in step 2
```

In the psql prompt, paste this:

```sql
CREATE ROLE ck WITH LOGIN PASSWORD 'ck_dev_password';
CREATE DATABASE ck_dev OWNER ck;
CREATE DATABASE ck_test OWNER ck;
GRANT ALL PRIVILEGES ON DATABASE ck_dev TO ck;
GRANT ALL PRIVILEGES ON DATABASE ck_test TO ck;
\q
```

- [ ] Verify the ck user works:
  ```powershell
  psql -U ck -d ck_dev -h localhost -c "SELECT version();"
  # Should print "PostgreSQL 18.x ..." and exit cleanly
  ```

---

## 6 · Set up .env.local

```powershell
cd F:\ArmaDev
Copy-Item infra\env\.env.example .env.local
```

Open `.env.local` in VS Code and fill in **just enough to boot**:

| Variable | Value |
|---|---|
| `JWT_SECRET` | Generate: `-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | % {[char]$_})` in PS, paste output |
| `HMAC_SHARED_SECRET` | Same generator, different value |
| `STEAM_API_KEY` | The new key from step 0 |

Everything else can stay blank for the Phase 0 smoke test. We'll fill
in Discord, mod.io, R2, Stripe as we hit the phases that need them.

- [ ] `.env.local` saved with the three values above

---

## 7 · Install workspace dependencies

```powershell
cd F:\ArmaDev
bun install
```

- [ ] Completes without errors. There should be a `node_modules/` and a `bun.lockb` afterwards.

If it complains about a missing workspace package, that's fine — the
launcher and manager stubs aren't fully initialised yet (Phase 1 work).
Core and manager-agent should resolve cleanly.

---

## 8 · Apply database migrations

```powershell
cd F:\ArmaDev
bun run db:migrate
```

This runs `core/src/db/migrate.ts` against `DATABASE_URL` from your
`.env.local`. Creates the Phase 0 placeholder table.

- [ ] Output ends with `[migrate] done`
- [ ] Verify in psql:
  ```powershell
  psql -U ck -d ck_dev -h localhost -c "\dt"
  # Should list _phase0_placeholder
  ```

---

## 9 · Boot CK Core

```powershell
bun run dev
```

- [ ] Output shows: `[CK Core] listening on http://localhost:3001`

In a second PowerShell:

```powershell
curl http://localhost:3001/health
```

- [ ] Returns JSON: `{"status":"ok","service":"ck-core","version":"0.0.1","uptime_s":N,"timestamp":"..."}`

Open `logs/ck-core.log` — should show structured JSON entries for each
request. If `logs/` doesn't exist yet, that's normal in dev; logs go to
stdout. We wire pino-roll file output in Phase 1.

---

## 10 · Boot the manager agent

In a third PowerShell:

```powershell
cd F:\ArmaDev\manager-agent
bun run dev
```

- [ ] Output shows: `connecting to CK Core` then `connected to CK Core`
- [ ] In CK Core's terminal you should see a corresponding log entry for the WebSocket handshake

Leave both running for the next step.

---

## 11 · Discord alerts wired up (optional but recommended)

If you have a Discord server (you will need one for community
pre-launch anyway):

- [ ] Create a channel `#ck-alerts`
- [ ] Channel settings → Integrations → Webhooks → New Webhook
- [ ] Name it `CK Core`, copy the URL
- [ ] Paste into `.env.local` as `DISCORD_ALERT_WEBHOOK_URL`
- [ ] Restart `bun run dev` (Ctrl+C, re-run)
- [ ] Trigger a test alert (we'll wire this up properly in Phase 1; for now just verifying the webhook URL works):
  ```powershell
  curl -X POST -H "Content-Type: application/json" `
    -d '{"content":"🟢 CK Core test alert from dev"}' `
    $env:DISCORD_ALERT_WEBHOOK_URL
  ```
- [ ] Message appears in `#ck-alerts`

---

## 12 · GitHub Secrets (for CI/CD when we get there)

Not blocking for local dev, but worth doing now while we're in setup mode.

- [ ] Repo Settings → Secrets and variables → Actions → New repository secret
  - `DATABASE_URL_TEST` → `postgres://ck:ck@localhost:5432/ck_test` (used by the test workflow's ephemeral Postgres)
  - `STEAM_API_KEY` → the new key
- [ ] Later (when we have them): `TAURI_SIGNING_PRIVATE_KEY`, `DISCORD_ALERT_WEBHOOK_URL`, `STRIPE_SECRET_KEY`, etc.

---

## 12.5 · Commit any tweaks

If you changed `.env.example` or anything else in repo files during
setup, commit them:

```powershell
cd F:\ArmaDev
git status
git add -A
git commit -m "chore: dev env tweaks from day-one walkthrough"
git push
```

---

## ✓ Phase 0 smoke test PASS criteria

Tick all of these and you're done with day one:

- [x] Postgres 18 + Memurai running as Windows services, both responding
- [x] CK Core boots, `/health` returns OK
- [x] Manager agent connects to CK Core via WebSocket
- [x] Repo pushed to GitHub, branch protection on
- [x] `.env.local` populated with at-minimum JWT_SECRET, HMAC_SHARED_SECRET, STEAM_API_KEY
- [x] Discord webhook fires (if you set one up)
- [x] Old Steam API key revoked, new one in `.env.local` only (not in git)

You are now cleared for Phase 1 work — `bunx create-tauri-app
launcher/`, `bunx sv create manager/`, and the first real Workbench
mod project.

---

## Troubleshooting

**`psql: command not found`** — installer didn't add to PATH. Use full path `C:\Program Files\PostgreSQL\18\bin\psql.exe` or the snippet in step 2.

**`bun: command not found`** — restart the terminal after install.

**Postgres won't start** — Windows Services panel (`services.msc`), find `postgresql-x64-18`, set to Automatic, Start.

**Memurai port 6379 in use** — old Redis install? `services.msc`, stop the conflicting service.

**`/health` returns 404** — wrong port. Default is 3001 (avoids the DayZ stack's 3000). Check `CK_CORE_PORT` in `.env.local`.

**`relation "_phase0_placeholder" does not exist`** — migration didn't run. Re-run `bun run db:migrate`.

**Discord webhook returns 401** — wrong URL or webhook deleted. Regenerate in Discord settings.

**CK Core can't connect to Postgres** — Windows Firewall blocking localhost. Allow inbound on TCP 5432. Or change Postgres to listen only on `localhost` (default is fine).

---

When all 12 steps pass, paste this in chat and we'll move to Phase 1:

> Day-one walkthrough complete. CK Core healthy, agent connected, repo pushed.
