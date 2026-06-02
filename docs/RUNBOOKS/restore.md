# Runbook: Restore from backup

**Last drill:** _(date — fill in after Phase 0 deliverable)_

## When to use this

- Production Postgres data loss / corruption
- Need to roll back to a point in time before a bad migration
- DR scenario — main host dead, bringing up on standby

## Prerequisites

- Access to the backup storage (R2 bucket `ck-backups`)
- PostgreSQL bin in PATH (or use full path
  `C:\Program Files\PostgreSQL\16\bin\`)
- AWS CLI installed and configured for R2 endpoint
- `.env` with admin Postgres connection string

## Procedure (Windows Server prod)

```powershell
# 1. Stop CK Core service
nssm stop CKCore
# Wait for clean shutdown
sc query CKCore

# 2. List snapshots in R2
aws s3 ls s3://ck-backups/postgres/ --endpoint-url $env:R2_ENDPOINT

# 3. Download the snapshot to restore from
aws s3 cp s3://ck-backups/postgres/ck-2026-MM-DD.dump.gz . `
    --endpoint-url $env:R2_ENDPOINT

# 4. Decompress (7-Zip or gzip from Git Bash)
& 'C:\Program Files\7-Zip\7z.exe' x ck-2026-MM-DD.dump.gz

# 5. Drop + recreate target DB (CAREFUL — this destroys current data)
psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS ck;"
psql -U postgres -h localhost -c "CREATE DATABASE ck OWNER ck;"

# 6. Restore
pg_restore -U ck -h localhost -d ck -j 4 --no-owner --no-privileges `
    ck-2026-MM-DD.dump

# 7. Replay WAL forward to PITR target (if doing point-in-time)
# See: WAL streaming setup in infra/

# 8. Smoke test
psql -U ck -h localhost -d ck -c "SELECT count(*) FROM characters;"

# 9. Bring CK Core back up
nssm start CKCore
Invoke-RestMethod -Uri "https://core.checkpointk.example/health"

# 10. Verify a player can connect to a server, character state intact
```

## RTO / RPO targets

- **RTO:** 1 hour (time from incident → service restored)
- **RPO:** 5 minutes (max data loss = WAL streaming interval)

## Drill cadence

Quarterly. Last run: _(date)_. Next due: _(date)_.

## Notes

- Restore from R2 is slow (~10 min for first GB) due to single-stream
  download. If you need faster RTO, keep a daily snapshot pre-staged on
  the standby host's local disk (`D:\ck-backups\`).
- The mod chain config (`servers/*/server.json`) is in Git — restoring
  the DB is enough; server configs come from `git pull`.
- NSSM commands: `nssm install CKCore`, `nssm start/stop CKCore`,
  `nssm edit CKCore` to change config, `nssm remove CKCore confirm`
  to uninstall the service.
- PowerShell remoting (`Enter-PSSession`) is the equivalent of SSH for
  remote admin if you're not at the box.
