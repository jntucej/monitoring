# Stage 4 — Class-Level Issue Aggregation (cron agent)

The "collective problem" lane: when enough students report the *same*
thing, the system promotes it to a class-level issue that HOD/faculty
see as one ticket, not N.

## Detection (agent: `/api/cron/class-issue-aggregation`, */15)

```
FOR each (class_id, category_code) with open|in_progress|escalated
  class_requests in the last 72h:
    IF count >= AGG_N (default 3):
      IF no open class_level_issue exists for this (class, topic):
        CREATE class_level_issues row (status='open')
        SET parent_issue_id on each contributing request
        NOTIFY hod + class_teacher (with the issue, not the N rows)
        audit event, actor_type='agent'
```

**Bounds (same shape as complaint-triage):**
- The agent **creates** issues and links requests; it never resolves or
  closes anything.
- One open issue per (class, topic) — no duplicate spam.
- Writes `actor_type='agent'` + reason into `audit_events`.

## Table

```sql
CREATE TABLE IF NOT EXISTS public.class_level_issues (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  topic         TEXT NOT NULL,               -- category_code (+ optional short label)
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','dismissed')),
  request_ids   UUID[] NOT NULL DEFAULT '{}',-- contributing class_requests
  raised_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,  -- agent or HOD
  resolved_by   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolution    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  UNIQUE (class_id, topic, status) WHERE status IN ('open','in_progress')
);
```
The partial unique index is the no-duplicate guarantee at the DB level
(agent logic can't double-create even under race).

## HOD actions

| action | tier | confirm |
|---|---|---|
| `class_issue.resolve` | 2 | dialog + resolution note |
| `class_issue.dismiss` | 2 | dialog + reason (e.g. "duplicate of existing fix") |

On resolve: all linked `class_requests` flip to `resolved` with
`resolution_note` = the issue's resolution; HOD gets response-time
stats for their dashboard.

## HOD dashboard (surface, stage 5)

- Issues by class (open counts)
- Unresolved requests (oldest first)
- Response time: median time-to-resolve per category
- Escalation log: every `escalate` action with who/when/why

## Decision log

- D2: N=3, window=72h, same (class, category). Both are config, not
  constants — seed in `config_class_comm` (single table:
  `agg_n INT NOT NULL DEFAULT 3, agg_hours INT NOT NULL DEFAULT 72`)
  so HOD can tune without a deploy.
- D5: `URGENT` requests bypass the agent entirely — they page the HOD
  at raise-time, not 15 minutes later.
