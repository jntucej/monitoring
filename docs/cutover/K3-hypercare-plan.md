# Hypercare plan — T+48h → T+30d (K3)

Hypercare is a staffed, measurable program governed by exit criteria — not an optional slack budget item. It runs 30 days with a daily drift-dashboard review; the same people who ran cutover stay on point, with on-call covering T-1 → T+7 minimum.

## The daily drift dashboard (run every morning, 08:30 IST)

One SQL block. Paste, read, sign off. The `drills` CTE pulls from the **J5 evidence API**
(`GET /api/sysadmin/drills` with a sysadmin token — batch J writes the evidence
files this endpoint reads), not from a `drill_evidence` table that doesn't exist:

```sql
-- Gate Monitor — Hypercare daily drift dashboard
WITH
scans AS (
  SELECT
    COUNT(*)                                                        AS total,
    COUNT(*) FILTER (WHERE timestamp >= NOW() - INTERVAL '24 hours') AS last_24h,
    COUNT(*) FILTER (WHERE is_manual)                                AS manual,
    COUNT(*) FILTER (WHERE is_correction)                            AS corrections,
    ROUND(100.0 * COUNT(*) FILTER (WHERE is_manual) / NULLIF(COUNT(*),0), 2) AS manual_pct
  FROM movement_logs
  WHERE timestamp >= NOW() - INTERVAL '7 days'
),
auth AS (
  SELECT
    COUNT(*) FILTER (WHERE action = 'LOGIN')        AS logins,
    COUNT(*) FILTER (WHERE action = 'LOGIN_FAILED') AS failures,
    ROUND(100.0 * COUNT(*) FILTER (WHERE action='LOGIN_FAILED')
          / NULLIF(COUNT(*) FILTER (WHERE action IN ('LOGIN','LOGIN_FAILED')),0), 2) AS fail_pct
  FROM audit_logs
  WHERE timestamp >= NOW() - INTERVAL '24 hours'
),
queue AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')    AS pending,
    COUNT(*) FILTER (WHERE status = 'failed')     AS failed,
    COUNT(*) FILTER (WHERE status = 'dead_letter') AS dead
  FROM notification_sms_queue
),
mess AS (
  SELECT
    COUNT(*) FILTER (WHERE used_at IS NOT NULL)   AS served,
    COUNT(*) FILTER (WHERE revoked_at IS NOT NULL) AS revoked,
    COUNT(*)                                       AS issued
  FROM mess_tokens
  WHERE created_at >= NOW() - INTERVAL '24 hours'
)
SELECT
  s.total        AS scans_7d,
  s.last_24h     AS scans_24h,
  s.manual_pct   AS manual_pct,
  s.corrections  AS corrections,
  a.fail_pct     AS login_fail_pct,
  q.pending      AS sms_pending,
  q.failed       AS sms_failed,
  q.dead         AS sms_dead,
  m.served       AS mess_served,
  m.revoked      AS mess_revoked
FROM scans s, auth a, queue q, mess m;
```

Drill status is a second one-liner, run from the shell (it's a file, not a table):

```bash
curl -sk -H "Authorization: Bearer $SYSADMIN_TOKEN" http://localhost:3000/api/sysadmin/drills \
  | jq '{failing: .data.failing, passing: .data.passing, total: .data.total}'
```

Read the SQL against these thresholds:

| Metric | Green | Amber | Red → action |
|--------|-------|-------|--------------|
| manual_pct (scans) | <5% | 5–10% | 10% → QR reader or training issue; investigate before day 5 |
| corrections | 0 | 1–3 | 3+ → operator error or dedupe bug |
| login_fail_pct | <5% | 5–15% | 15% → credential distribution problem, not attack |
| sms_pending | <10 | 10–50 | 50+ → provider down or queue worker stuck |
| sms_dead | 0 | 1–5 | 0 → bad phone numbers; clean the list |
| mess_revoked | <2% of issued | 2–5% | 5% → menu/eligibility bug |
| drills_failing (J5) | 0 | — | any → a control regressed; stop and fix |

Log the numbers daily. By day 30 you have 30 rows that either trend flat or trend up. That's the story you tell the Principal.

## Severity ladder

| Sev | Definition | Response | Who |
|-----|------------|----------|-----|
| Sev-1 | Gate access blocked with no workaround; or confirmed data breach; or audit immutability violated | Page immediately, 24/7 | On-call + SRE lead + Principal |
| Sev-2 | A major function impaired (parent SMS down, mess tokens failing) with a workaround | Same-day, business hours + 2h | On-call |
| Sev-3 | Minor issue, usable workaround | Next business day | Support queue |
| Sev-4 | Cosmetic or enhancement | Logged for future release — not fixed during hypercare | Backlog |

Every Sev-1 and Sev-2 gets a written incident record, even if it resolves in 10 minutes. The record goes into the PIR.

## Exit criteria — not a calendar date

Hypercare ends when **all** of these are true:
- No open Sev-1 for 72 continuous hours
- No Sev-2 open longer than its target for the rolling 7-day window
- MTTR for Sev-1/Sev-2 within target
- Drift dashboard: no unresolved amber for 5 consecutive business days
- The BAU team has completed 2 knowledge-transfer sessions and passed the competency checklist
- Runbook coverage ≥95% for the top-10 alert types; runbook test pass rate ≥90%
- The PIR is written, with assigned owners and dates — not just "lessons learned" bullets

If day 30 arrives and any of these is false, hypercare extends. That is not a failure; ending hypercare early is.

## The PIR (post-implementation review)

One page, 7 days after exit. Sections:
1. What went well (be specific — "the audit drill caught a fail-closed bug on day 2" beats "good teamwork")
2. What broke and how fast it was caught
3. Every Sev-1/Sev-2 with root cause and the fix that shipped
4. What the drills caught vs what the users caught — if users caught more, the drills are wrong
5. Three actions with owners and dates
