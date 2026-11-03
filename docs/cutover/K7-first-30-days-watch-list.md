# First-30-days watch list (K7)

One page. On-call reads it every morning. In addition to the drift dashboard (K3) — these are the things that will go wrong in a college deployment that don't show up in generic SRE metrics.

| # | Watch for | Signal | Likely cause | Action |
|---|-----------|--------|--------------|--------|
| 1 | Manual-entry rate climbing | 10% of scans manual, day over day | QR brightness / cracked screens / operator habit | Re-train; check reader; if screens, print QR on card |
| 2 | One gate is slower than others | p95 at Gate X > 2× Gate Y | Network, old tablet, or one operator | Swap hardware; watch |
| 3 | Parent SMS complaints | 5 support tickets/day | Wrong number on file; SMS in DND; language | Clean the number list; add Telugu template |
| 4 | Mess token "not eligible" | 5% of scans rejected | `current_entry_type` stale after gate return | Check the H1 entry-type path; verify operator/entry-type writes |
| 5 | Leave requests stuck at one stage | Any request >SLA at one stage | Approver not trained / on leave | Name a delegate; check `delegation_rules` |
| 6 | Students sharing QR screenshots | Same QR at two gates within 5 min | Screenshot sharing | By design caught by `scan_nonces`/dedupe; confirm it fires |
| 7 | Curfew-acknowledge ignored | <50% ack rate | Flow confusing or notification not delivered | Check student/curfew-acknowledge route and delivery |
| 8 | Audit immutability violated | `trg_audit_logs_immutable` fired / `verify-audit-chain.sh` non-zero | Someone ran a manual DB fix | Stop. §K6.1. |
| 9 | Backup grows faster than expected | 2× baseline in a week | Movement logs + audit logs | Check retention job is running |
| 10 | Login failures spike on Monday | 30% fail, 8–10am | Students forgot credentials over weekend | Not an attack. Reset flow, not lockout. |
| 11 | Faculty/HOD says "I never saw the request" | Request stuck at their stage | Notification email in spam | Check `notification_email_queue` status |
| 12 | Operator bypasses the system | Manual entries with `is_manual=true` at normal rates | Habit, distrust, or training gap | 1:1 with the operator; check the K5 card is at the gate |

**Rule:** any of items 1, 4, 6, 8, or 12 happening for 3 consecutive days is a Sev-2 — it means the system is being worked around, and a workaround is how the old paper register comes back.

---

## K8 — Day 31: the handback

Hypercare ends. The PIR is signed. Ownership transfers from the project team to BAU operations.

What "handback" actually means, in order:

1. The rota stands down. On-call reverts to the standard rotation.
2. The war room channel is archived (read-only, not deleted).
3. The PIR is filed with the Principal, the Registrar, and the DPO.
4. Every open Sev-3/Sev-4 becomes a normal ticket in the standard queue, with an owner.
5. The drift dashboard becomes weekly, not daily.
6. **The drills stay on the cron** — weekly (`run-all.sh`), quarterly (`drill-restore-to-separate-host.sh`). This is the part people drop first, and it's the part that keeps the evidence fresh.
7. The next quarterly restore drill is scheduled, with a named owner and a date. If it has no date, it will not happen.

The handoff is complete when operations accepts it — not when the project closes its tickets.

## What this batch buys

| Before Batch K | After Batch K |
|----------------|---------------|
| "We deployed it" | "The Principal signed a go/no-go memo with 12 evidence-backed criteria" |
| "If something breaks, we'll roll back" | "Rollback triggers are pre-agreed, measurable, and rehearsed to <30 min" |
| "The team will watch it" | "A daily drift dashboard, a severity ladder, and explicit exit criteria — not a calendar date" |
| "Parents will figure it out" | "Four communication templates, sent ≥48h before, in the language they read" |
| "Operators will cope" | "A laminated card at every gate that says: if the system is down, the gate still opens on paper" |
| "We're DPDP compliant" | "Twelve questions, twelve evidence files, a breach playbook with named owners, and a 24-hour notification path" |

**The single sentence:** Batches A–J make the system hard to break; Batch K makes sure that when it does break — and it will — the right person knows within minutes, has a rehearsed action, and can prove afterwards that they did it.
