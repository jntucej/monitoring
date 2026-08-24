# Operational Runbook

**System:** Gate Monitor (JNTUH CEJ)
**Stack:** Next.js 16 (Vercel) · Supabase (Postgres + Auth)
**Version:** 1.0.0

---

## 1. Health & Monitoring

| Probe | Target | Expected |
|---|---|---|
| Uptime (BetterStack) | `GET /api/health` | HTTP 200, DB reachable |
| Errors (Sentry) | Next.js SDK DSN | Zero critical alerts |
| Logs (Logtail/stdout) | Vercel logs → structured JSON | No repeated 5xx |

**Daily check:** hit `/api/health`; confirm campus count updates on the admin dashboard during morning rush.

## 2. Common Issues → Resolutions

| Symptom | Likely Cause | Resolution |
|---|---|---|
| Login stuck on portal page | Rate limit (5 PIN attempts / 15 min / IP) | Wait 15 min or whitelist office IP |
| `SESSION_ERROR` at login | Auth user missing/unconfirmed | Auto-provisioned by `/api/auth/pin-login`; retry once, else re-run seed script |
| "Duplicate scan detected" | Same person+direction within window | Expected dedupe; no action |
| Exit buttons disabled | No APPROVED pass for student | Guardian/Admin must approve pass first |
| Campus count wrong | Missed OUT scans after curfew | Reconcile via `/gate/history` corrections (supervisor role) |
| 500 on `/api/*` | Supabase env var missing on deploy | Verify `NEXT_PUBLIC_SUPABASE_URL`, anon key, `SUPABASE_SERVICE_ROLE_KEY` in Vercel |

## 3. Escalation Paths

1. **L1 — Operator:** local issues, offline queue handling.
2. **L2 — Supervisor (`SUP-001`):** scan corrections, approvals, gate reconciliation.
3. **L3 — Admin (`ADM-001`):** user management, pass overrides, reports.
4. **L4 — Platform owner:** Vercel/Supabase incidents, secrets rotation, DB restores.

## 4. Backup & Restore

- **Automated:** Supabase Dashboard → Database → Backups (daily, retain ≥ 7 days).
- **Manual export:** `pg_dump` via Supabase CLI:
  ```bash
  supabase db dump -f backup-$(date +%F).sql
  ```
- **Restore drill (quarterly):** restore latest dump into a staging project; run `node scripts/test-db.js` against it; verify counts (~370 users, ~285 student_details, 35 employee_details).
- **Seed reference data:** `node scripts/seed-data.js` (idempotent upserts; safe to re-run).

## 5. Deployment Checklist

- [ ] Migrations applied: `supabase db push`
- [ ] RLS enabled on all tables; policies reviewed
- [ ] Env vars set on Vercel (URL, anon key, service-role key)
- [ ] Supabase Auth → Site URL matches production domain
- [ ] **Default PINs rotated** (`ADM-001`, `SUP-001`, `OP-001`, wardens)
- [ ] `npx playwright test` green
- [ ] Post-deploy smoke test: operator login → scan → history entry visible

## 6. Security Notes

- Service-role key is server-only (never shipped to client bundles).
- Single active session per user: new login invalidates old sessions.
- Security headers set in `next.config.ts` (nosniff, DENY frames, HSTS, referrer policy, permissions policy).
- PIN endpoint rate-limited: 5 attempts / 15 min / IP — identical response for unknown user vs wrong PIN (no oracle).
