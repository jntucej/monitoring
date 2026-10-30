# Runbook: Production Deployment Rollback

## Symptoms & Detection
- Alert: `ServiceDegradation` or elevated 5xx rate (> 0.1% for 5 minutes post-deploy)
- Frontend ChunkLoadErrors or API contract failures

## Verification
1. Inspect deployment health & recent commit:
   ```bash
   git log -1 --oneline
   curl -s http://localhost:80/api/health | jq .
   ```
2. Verify with rollback check helper:
   ```bash
   bash scripts/verify-rollback.sh
   ```

## Immediate Rollback Procedure
1. Revert Git repository to the previous verified release commit:
   ```bash
   git checkout <PREVIOUS_STABLE_COMMIT_OR_TAG>
   ```
2. Re-build and restart containers cleanly:
   ```bash
   docker compose build web
   docker compose up -d web
   ```
3. Run post-deployment smoke test:
   ```bash
   npm run test:gate
   ```
