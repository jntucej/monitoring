# AUDIT PROMPT — GATE MONITOR HARDENING

You are a senior staff engineer performing a **mechanical, non-negotiable audit** of this
repository. You are not here to advise, suggest, or open a discussion. You are here to
**execute the following steps in order and report what you find or fix.**

## RULES OF ENGAGEMENT

1. **Never** ask a clarifying question before doing the mechanical work. If a step is
   ambiguous, do the deterministic version and note the ambiguity in your final report.
2. **Never** summarize this prompt back to me. Start executing.
3. **Never** say "I recommend." Either fix it, or produce a failing check that makes it
   impossible to ignore.
4. **Never** modify a file you haven't read in full. Read the file, then edit.
5. **Always** run `git diff --stat` after every fix batch. If a batch touches more than
   15 files, split it.
6. **Never** leave a fix unverified. Every fix ends with either a passing test, a green
   CI run, or an explicit "cannot verify — reason: ___" line in the final report.
7. **Never** invent a file, function, or API. If a path in this prompt doesn't exist,
   report it as `MISSING: <path>` and continue.

## EXECUTION ORDER (do not reorder)

### PHASE 0 — Establish truth

```
0.1  Run: git status --porcelain. If non-empty, STOP and report.
0.2  Run: node --version && npm --version. Report.
0.3  Run: docker compose config --quiet. Report exit code.
0.4  Run: grep -rn "SKIP_ENV_VALIDATION" Dockerfile. Report every hit.
0.5  Run: ls .github/workflows 2>&1. Report.
0.6  Produce /tmp/audit-state.json with: { branch, head_sha, dirty, node_version, has_ci }.
```

### PHASE 1 — Deploy pipeline (fixes 1, 7, 8, 5 from registry)

```
1.1  Read docker-compose.yml. Verify each of [postgres, redis, web, worker, caddy]:
     - has healthcheck
     - healthcheck test uses GET (not HEAD / --spider / -I)
     - does NOT contain "127.0.0.1:" on a service that talks to another service
     Report every violation.

1.2  Verify no service lacks depends_on for services it fetches from.
     Report every missing edge.

1.3  Add a `migrations` service to docker-compose.yml:
     - target: worker
     - command: ["npx", "tsx", "scripts/migrate.ts"]
     - depends_on postgres: service_healthy
     - restart: "no"
     Change web.depends_on and worker.depends_on to include
     migrations: service_completed_successfully.
     Commit message: "fix(deploy): run migrations before app start"

1.4  Read Caddyfile. If it does not contain "CF-Connecting-IP" or
     "X-Real-IP", add:
       header_up X-Real-IP {http.request.header.CF-Connecting-IP}
       header_up X-Forwarded-For {http.request.header.CF-Connecting-IP}
     inside every reverse_proxy block.
     Commit message: "fix(deploy): forward real client IP to app"

1.5  Read src/lib/rate-limit.ts. If extractClientIp or checkRateLimit
     contains "isLocalLoopback" or "127.0.0.1" in a branch that runs when
     NODE_ENV === "production", delete that branch.
     Commit message: "fix(rate-limit): remove dev-loopback bypass in prod"

1.6  Read Dockerfile. In every stage that becomes a runtime image
     (runner, worker), prepend the CMD with env validation:
       CMD ["sh","-c","node scripts/validate-env.js && node <original-cmd>"]
     Commit message: "fix(deploy): validate env at container start"

1.7  Read src/middleware.ts. If it does not import and invoke
     metricsRegistry.incHttpRequest + observeHttpRequestDuration, add
     try/finally wrapping the whole handler.
     Commit message: "fix(observability): wire metrics registry into middleware"

1.8  Read src/app/metrics/route.ts. If the function proceeds when
     process.env.METRICS_SECRET is unset, change to return 503.
     Commit message: "fix(security): fail closed when METRICS_SECRET unset"

1.9  Run: docker compose down -v && docker compose up -d && sleep 45.
     Run: docker compose exec -T postgres psql -U postgres -d gate_monitor -c "\dt" | wc -l
     Run: grep -c "CREATE TABLE" database/schema.sql
     If |difference| > 3, report FAIL and stop. Otherwise continue.
```

### PHASE 2 — Database (fixes 5, 6, 4, 3, 7)

```
2.1  Read scripts/migrate.ts. If it does not read database/schema.sql as
     the first baseline, add that logic before the file loop.
     Commit message: "fix(db): load schema.sql as baseline before migrations"

2.2  Read src/app/api/auth/logout/route.ts. If it passes the raw JWT to
     a query that filters on `refresh_hash`, change it to:
       const tokenHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
       UPDATE sessions SET revoked_at = NOW() WHERE refresh_hash = $1
     Also revoke by user_id if x-user-id header present.
     Commit message: "fix(auth): hash token before session revocation lookup"

2.3  Read database/migrations/20260916000000_security_rls_and_function_hardening.sql.
     If it contains "auth.uid()" and no migration numbered lower creates
     auth.uid, add database/migrations/20260915000000_auth_schema_shim.sql:
       CREATE SCHEMA IF NOT EXISTS auth;
       CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
       LANGUAGE sql STABLE AS $$
         SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
       $$;
     Commit message: "fix(db): add auth.uid() shim for self-hosted deploys"

2.4  Read database/migrations/20261008000000_student_registers_and_exit_flows.sql.
     Before every `ADD CONSTRAINT ... CHECK`, insert an `UPDATE ...` that
     sanitizes existing rows to satisfy the constraint.
     Commit message: "fix(db): sanitize rows before narrowing CHECK constraints"

2.5  Read src/lib/types.ts. Extract PermissionStatus.
     Read database/migrations/20261009000000_permission_workflow_additions.sql.
     Extract the CHECK IN (...) list.
     If they differ, align the TypeScript union to the SQL list.
     Commit message: "fix(types): align PermissionStatus with SQL CHECK"

2.6  Grep: `grep -rn "setHours(0, 0, 0, 0)" src/lib/db.ts`
     For every hit, replace with the IST day boundary:
       const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
       const dayStartUTC = `${day}T00:00:00+05:30`;
     Commit message: "fix(db): standardize day boundary on Asia/Kolkata"
```

### PHASE 3 — Auth and error consolidation (fixes 3, 4)

```
3.1  Grep: `grep -rn "sessionStorage.getItem(\"gate-monitor-auth\")" src/`
     For every hit: replace with useAuthStore selector. Delete the
     file's local parse. Commit message: "fix(auth): read session from store, not sessionStorage"

3.2  Grep: `grep -rln "getAuthHeaders" src/`
     For every hit: replace with useApi().get/post/put/del.
     If useApi lacks a needed verb, add it.
     Delete src/lib/utils.ts's getAuthHeaders export and
     src/hooks/useAuthHeaders.ts.
     Commit message: "refactor(auth): consolidate on useApi"

3.3  Grep: `grep -rn 'error: *"[^"]*"' src/app/api/ | grep -v "code:"`
     For every hit: replace with NextResponse.json({
       success: false, error: { code: "<DERIVED>", message: "<string>" }
     }, { status: <existing> }).
     Create src/lib/api-response.ts with the factory if not present.
     Commit message: "refactor(api): standardize error response shape"

3.4  Verify: `grep -rc "code:" src/app/api/ | awk -F: '{s+=$2} END {print s}'`
     Compare to grep for `error: "`. Second should be zero.
```

### PHASE 4 — Role-specific critical fixes (fixes 9–16)

```
4.1  Read src/hooks/useNavigation.ts. Verify every `case` block in
     getDefaultNavigation ends with `break;`. If any is missing, add it.
     Commit message: "fix(nav): add missing break statements"

4.2  Read src/app/api/permissions/[ticket]/route.ts. Add a HOD department
     scope check immediately after canApproveAtStage. If
     authUserRole === "hod", verify the ticket's student is in the same
     department as the HOD. Return 403 otherwise.
     Commit message: "fix(permissions): scope HOD approval to own department"

4.3  Read src/app/api/admin/lockdown/route.ts. If requiredRole for POST
     does not include "warden" and "supervisor", add them.
     Commit message: "fix(lockdown): allow warden/supervisor to broadcast"

4.4  Read src/app/(supervisor)/supervisor/page.tsx. Verify the lockdown
     toggle:
       - sends { scopes: ["all"], message: "..." } not { reason: "..." }
       - does not have a catch block that calls setIsLockdown(next)
       - uses DELETE method when lifting
     Fix all three. Commit message: "fix(supervisor): correct lockdown toggle wire"

4.5  Read src/app/api/students/route.ts. Add "warden" and "supervisor"
     to requiredRole. Commit message: "fix(students): allow warden/supervisor"

4.6  Read src/app/api/passes/route.ts. Add "supervisor" to requiredRole.
     Commit message: "fix(passes): allow supervisor to list"

4.7  Grep: `grep -rn "|| 288\||| 245\|?? \"pa-1\"" src/components/parent/ src/app/(parent)/`
     For every hit: remove the fallback and add an error state.
     Commit message: "fix(parent): remove fabricated fallback values"

4.8  Read src/app/(person)/visitor/page.tsx. Every fetch to /api/ must
     include getAuthHeaders(). Fix.
     Then decide: either add "visitor" to /api/visitors requiredRole, or
     remove /visitor from (person)/layout.tsx and useNavigation.
     Commit message: "fix(visitor): add auth headers to visitor API calls"

4.9  Read src/app/(operator)/gate/[gateId]/page.tsx. Replace:
       window.history.pushState({}, "");
     with:
       const url = new URL(window.location.href);
       url.searchParams.delete("tab");
       window.history.replaceState({}, "", url.toString());
     Commit message: "fix(operator): correct pushState to replaceState with URL"

4.10 Read src/app/(operator)/gate/[gateId]/page.tsx. The lockdown
     polling useEffect must depend on [authenticated]. Fix.
     Commit message: "fix(operator): stop lockdown polling on logout"
```

### PHASE 5 — Integration and notification honesty (fixes 19–23)

```
5.1  Read src/lib/ldap.ts. If authenticateLdapUser returns success
     without an actual bind call, either:
       (a) implement it with ldapts, or
       (b) make it return { success: false, error: "LDAP not implemented" }
     Option (b) is acceptable and preferred until a real LDAP server is
     available. Commit message: "fix(ldap): fail loudly when unimplemented"

5.2  Read src/lib/integrations/hr-sync.ts. If HRMS_API_ENDPOINT is unset,
     return { success: false, errors: ["HRMS_API_ENDPOINT not configured"] }.
     Do not fabricate employee rows.
     Commit message: "fix(hr-sync): refuse to fabricate when endpoint unset"

5.3  Read src/lib/integrations/lms-provider.ts. Every `|| N` fallback
     count must become `|| 0` when the upstream call failed.
     Add a `mode` field to the return type: "live" | "mock".
     Commit message: "fix(lms): return real counts, tag mode"

5.4  Read src/lib/integrations/email.ts and sms.ts. If the "sent" branch
     does not actually call an HTTP provider, change it to:
       status: "failed", error: "PROVIDER_NOT_CONFIGURED"
     Commit message: "fix(notify): fail loud when transport unconfigured"

5.5  Create worker/jobs/retry_notifications.js. It must:
     - Read notification_email_queue, sms_queue, push_queue where
       status = "failed" AND attempts < 5
     - Retry with exponential backoff
     - Increment attempts
     Schedule it in worker/index.mjs at '*/15 * * * *'.
     Commit message: "feat(notify): retry failed notifications"
```

### PHASE 6 — Meta layer (fixes 2, 27, 28, 30)

```
6.1  Create .github/workflows/ci.yml with jobs:
       typecheck:  npm run typecheck
       lint:       npm run lint
       env:        node scripts/validate-env.js (with CI secrets)
       migrate:    npx tsx scripts/migrate.ts
       unit:       npm run test:unit
       e2e:        npx playwright test
     All must pass before merge. Add branch protection note to PR body.
     Commit message: "ci: add baseline CI pipeline"

6.2  Delete scripts/test_additional_remediations.js. It is a source-code
     linter disguised as a test. Any real assertion it makes is covered
     by scripts/run_system_tests.ts.
     Commit message: "test: remove code-string linter"

6.3  Rewrite tests/*.spec.ts. Every test must assert a specific status
     AND a specific response body field. The pattern:
       expect(response.status()).toBe(<exact code>);
       const body = await response.json();
       expect(body.<specific field>).toBe(<specific value>);
     No `expect([a,b,c]).toContain(status)` is permitted.
     Commit message: "test: replace status-agnostic assertions with behavioral"

6.4  Read src/app/api/health/route.ts. Change:
       const statusCodes = { healthy: 200, degraded: 200, unhealthy: 503 };
     to:
       const statusCodes = {
         healthy: 200,
         degraded: uptime > 120 ? 503 : 200,
         unhealthy: 503,
       };
     Commit message: "fix(health): degraded → 503 after warmup"
```

### PHASE 7 — Compliance (fixes 24, 25, 26)

```
7.1  Read src/app/api/admin/compliance/anonymize/route.ts. Add:
       - UPDATE users SET session_version = session_version + 1
       - UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1
     In the same transaction as the anonymize update.
     Commit message: "fix(gdpr): revoke sessions on anonymize"

7.2  Read src/app/api/admin/compliance/anonymize/route.ts. Change the
     data_compliance_logs insert to match schema.sql column names
     (id, action, details). Put target_user_id and performed_by inside
     the `details` JSONB.
     Commit message: "fix(compliance): align log insert with schema"

7.3  Read src/app/api/admin/compliance/export/route.ts. Add a
     data_compliance_logs insert with action "USER_DATA_EXPORT",
     details: { target_user_id, performed_by, payload_hash }.
     payload_hash = sha256(JSON.stringify(exportBundle)).
     Commit message: "fix(gdpr): audit every export"

7.4  Read src/app/api/admin/retention/run/route.ts. Replace the two
     hardcoded DELETEs with a loop over retention_policies rows where
     auto_delete = true. Map data_category → table name:
       movement_logs → movement_logs (timestamp column)
       expired_passes → gate_passes (to_datetime column, final_status = 'APPROVED')
       audit_logs → audit_logs (timestamp column)
       support_tickets → support_tickets (created_at column)
       notifications → notifications (created_at column)
     Add `?dryRun=true` returning counts without deleting.
     Commit message: "fix(retention): read policy table, add dry-run"
```

### PHASE 8 — Documentation (fixes 31, 32)

```
8.1  Read repomix.config.json. Remove "*.md" and "**/*.md" from
     customPatterns. Keep only generated artifacts excluded.
     Commit message: "docs: stop excluding markdown from tooling"

8.2  Generate .env.example from `process.env` references:
       grep -rhoP "process\.env\.\K[A-Z_][A-Z0-9_]*" src/ scripts/ worker/ \
         | sort -u
     For every var not in .env.example, add with a placeholder comment.
     Commit message: "docs: regenerate .env.example from references"

8.3  Verify every link in src/app/help/page.tsx to /docs/*.md resolves
     to an existing file. Report every 404. Do NOT invent files.
```

### PHASE 9 — Verification

```
9.1  Run: npm run typecheck. Report pass/fail.
9.2  Run: npm run lint. Report pass/fail.
9.3  Run: npm run test:unit. Report pass/fail.
9.4  Run: docker compose down -v && docker compose up -d && sleep 60.
9.5  Run: bash scripts/smoke.sh. If it doesn't exist, skip.
9.6  Run: curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/metrics
     Report the code. It must be 401 or 503.
9.7  Run: docker compose exec -T postgres psql -U postgres -d gate_monitor \
       -c "SELECT count(*) FROM schema_migrations;"
     Report the count. It must be ≥ 12 after all migrations run.
9.8  Run: git log --oneline | head -30. Every commit from phases 1–8
     must appear.
```

### PHASE 10 — Final report

Produce `/tmp/audit-report.md` with these sections, in this order:

```markdown
# Audit Report — <date> — <head_sha>

## Summary
- Fixes applied: <n>
- Fixes skipped: <n> (with reasons)
- Verification: <pass | fail | partial>

## Verification Results
<9.1–9.8 output, verbatim>

## Skipped Findings
For each skipped finding:
  - ID: <registry number>
  - Reason: <one line>
  - Manual action required: <one line>

## Files Changed
<git diff --stat HEAD~<n>>

## Remaining Risk
<List of any finding from the 14-layer registry that was NOT fixed in this run, grouped by layer>

## Next Run
<Ordered list of the next 10 registry items>
```

**Print the final report to stdout. Then stop. Do not ask for confirmation.**

## FORBIDDEN BEHAVIORS

- Opening a new tab, screenshot, or web request.
- Modifying files outside `src/`, `scripts/`, `worker/`, `database/migrations/`,
  `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.github/`, `repomix.config.json`.
- Touching `node_modules/`, `.next/`, `coverage/`, `playwright-report/`.
- Running `docker compose down -v` except in phases 1.9 and 9.4.
- Any `git push`, `git rebase`, `git merge`, `git cherry-pick`, or force operation.
- Any `npm publish`, `npm install <pkg>` (adding a dependency without approval).
- Any `DROP TABLE`, `DROP DATABASE`, `TRUNCATE`.
- Any migration file edit after it has been applied to a live DB.

## SUCCESS CRITERIA

This audit is successful if and only if:
1. `docker compose down -v && docker compose up -d` produces a working stack
   with all schema tables present, on a clean host.
2. `npm run typecheck`, `npm run lint`, `npm run test:unit` all pass.
3. `curl /metrics` returns 401 or 503, never 200.
4. `git log` shows one commit per fix batch, no squashed mega-commit.
5. `/tmp/audit-report.md` exists and lists every skipped finding with a reason.
