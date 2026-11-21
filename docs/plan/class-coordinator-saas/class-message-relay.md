# Stage 3 — Class Notice Relay (`class_messages`)

The table exists (migration 20270118000001 §5): `class_messages` +
`class_message_receipts` with relay/direct modes, urgency,
`auto_release_at`, and per-user receipts (`delivered/read/acked`).
What's missing: **the publish + tap-release APIs and the surfaces**.

## Modes (recap, verified in schema)

| mode | path | human in the loop? |
|---|---|---|
| `direct` | author → all students in `class_ids` (receipts fanned out) | no — instant delivery |
| `relay` | author → **coordinator taps Release** (or `auto_release_at` fires → cron agent releases with `released_by=system`) | yes — bounded window |

## Schema delta

```sql
ALTER TABLE public.class_messages
  ADD COLUMN IF NOT EXISTS relay_role TEXT CHECK (relay_role IN ('cr','icr')) NULL;
  -- who is the named relay for this message; NULL in direct mode
```

## Actions (via `/api/actions`)

| action | tier | confirm | authority |
|---|---|---|---|
| `class_message.publish` | 2 | dialog | faculty with a binding in one of `class_ids`, OR HOD (dept-scoped), OR admin. `mode='relay'` requires `relay_role` = an active coordinator of at least one target class |
| `class_message.release` | 1 | none | the named coordinator (`canRelay`), OR the author (self-release in relay mode = "just send it"), OR cron auto-release (system) |
| `class_message.supersede` | 3 | dialog + reason | original author or admin; sets `supersede_of` and re-fans out |

## Release paths — exactly two, one table

```
human tap:   POST /api/class-messages/[id]/release
             → released_by = coordinator id, released_at = now()
auto:        /api/cron/class-message-release (*/5, exists)
             → released_by = 'system', auto_released = TRUE
```

The receipts table (`class_message_receipts`) already has
`delivered_at/read_at/acked_at` — delivery tracking works today;
`requires_ack` drives the ack prompt.

## Delivery

The cron agent already fans out via `sendTelegramMessage`
(`src/lib/telegram.ts`). The tap-release path calls the **same**
release routine (extracted into `class-message-release.ts` kernel) so
human and auto paths share one code path — no forked fan-out logic.

## Surfaces

- **faculty:** "Publish class notice" — text, target classes, urgency,
  mode toggle (direct / via CR). In relay mode the UI shows the named
  coordinator + the release window.
- **coordinator:** relay inbox — unreleased relay messages, release
  buttons, release history.
- **student:** notices land as Telegram + in-app notification
  (`notifications` table + receipt row); "Class notices" list in the
  campus section with read/ack state.

## Decision log

- D4: `auto_release_at` default **4h** normal / **1h** urgent. A relay
  that nobody taps still ships — the coordinator is a *fast path*,
  not a gate. This is the anti-bottleneck property.
