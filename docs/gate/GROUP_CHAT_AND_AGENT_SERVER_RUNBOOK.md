# Group Chat, Authority Bridge & Role-Scoped Agent — Server Deployment Runbook

## 1. What Is Implemented in the Repo

- **Database Migrations (`database/migrations/`):**
  - `20270131000040_group_chat.sql` (+ `.down.sql`): `chat_groups`, `chat_group_members`, `chat_messages`, `chat_message_receipts` with RLS policies.
  - `20270131000041_class_authority_bridge.sql` (+ `.down.sql`): `class_id` / `is_single_class_room` on `chat_groups` and `class_doubt_escalations` with RLS.
  - `20270131000042_confirmed_knowledge_and_announcements.sql` (+ `.down.sql`): `confirmed_knowledge` with RLS and `also_applies_to` / `subject_code` on `class_doubt_escalations`.
  - `20270131000043_agent_traces.sql` (+ `.down.sql`): `agent_traces` observability table with RLS (`sysadmin`/`admin` read).
  - `20270131000044_chat_moderation_and_mute.sql` (+ `.down.sql`): `deleted_at`, `deleted_by`, `redaction_reason` on `chat_messages`.
  - `20270131000045_chat_recall_and_tombstone.sql` (+ `.down.sql`): `recalled_at`, `recalled_by`, `recall_reason`, `superseded_by_id` on `chat_messages`.
- **Agent Gateway, Context & Guardrails (`src/lib/agent/`, `model-runtime/`):**
  - `src/lib/agent/redactor.ts`: `sanitizeAgentPayload` (strips secrets for all roles; strips internal UUIDs/IDs unless `isSuperAdmin(role)`).
  - `src/lib/agent/toolGateway.ts`: `get_pending_items`, `get_unnoted_circulars`, `explain_workflow_status`, `draft_action`.
  - `src/lib/agent/classBridge.ts`: topic-based authority routing + `isPersonalStudentQuery` privacy guard.
  - `src/lib/agent/knowledgeMatcher.ts`: `matchConfirmedKnowledge` + `buildPreAnnouncementConfig`.
  - `src/lib/agent/contextEnvelope.ts`: `resolveStudentCapabilities` + `buildRequestContextEnvelope`.
  - `model-runtime/permission-engine.ts`: `canInvokeAgentTool`.
- **API Routes (`src/app/api/`):**
  - `GET/POST /api/chat/groups`
  - `GET/POST /api/chat/groups/[groupId]/messages`
  - `POST /api/chat/messages/[messageId]/noted`
  - `GET/POST /api/chat/groups/[groupId]/doubts`
  - `POST /api/chat/doubts/[doubtId]/route`
  - `POST /api/chat/doubts/[doubtId]/reply`
  - `GET/POST /api/chat/knowledge`
  - `POST /api/chat/announcements/prepare`
  - `POST /api/chat/announcements/dispatch`
  - `GET /api/chat/capabilities`
  - `POST /api/bot/chat` (wired with `buildRequestContextEnvelope`, `executeAgentTool`, `sanitizeAgentPayload`)
  - `POST /api/circulars/ocr-classify` (wired with `suggested_groups` + `pre_announcement`)
- **UI (`src/app/chat/page.tsx`, `src/components/bot/AgentConsoleDrawer.tsx`, `src/components/shell/RoleResponsiveShell.tsx`):**
  - `/chat` 3-pane Group Chat + Authority Bridge + Pre-Send Announcement + Scan Notice upload.
  - `AgentConsoleDrawer` mounted in `RoleResponsiveShell` across all role consoles.
- **Evals (`tests/ai/agent-evals.test.ts`):**
  - 9/9 unit/eval tests passing locally.

---

## 2. What Needs to Be Done on the Server

### Step 1: Apply Database Migrations (in order)
Run against the live `gate_postgres` container (`gate_monitor` DB):

```bash
docker exec -i gate_postgres psql -U postgres -d gate_monitor < database/migrations/20270131000040_group_chat.sql
docker exec -i gate_postgres psql -U postgres -d gate_monitor < database/migrations/20270131000041_class_authority_bridge.sql
docker exec -i gate_postgres psql -U postgres -d gate_monitor < database/migrations/20270131000042_confirmed_knowledge_and_announcements.sql
docker exec -i gate_postgres psql -U postgres -d gate_monitor < database/migrations/20270131000043_agent_traces.sql
docker exec -i gate_postgres psql -U postgres -d gate_monitor < database/migrations/20270131000044_chat_moderation_and_mute.sql
docker exec -i gate_postgres psql -U postgres -d gate_monitor < database/migrations/20270131000045_chat_recall_and_tombstone.sql
```

Verify tables and RLS policies exist:

```bash
docker exec -i gate_postgres psql -U postgres -d gate_monitor -c "\dt public.chat_* public.class_doubt_escalations public.confirmed_knowledge"
```

### Step 2: Seed Initial Class & Hierarchy Groups
`chat_groups` and `chat_group_members` start empty after migration. On the server:
1. Create one canonical `group_type = 'class'` row per active class (`is_single_class_room = TRUE`, `class_id = '<class_id>'`).
2. Sync active students and assigned class faculty into `chat_group_members` (`membership_source = 'roster_sync'`, `member_role = 'member'` for students, `'moderator'` for class reps/faculty).
3. Create hierarchy/operational groups (`group_type IN ('hierarchy', 'shift', 'incident')`) for HODs, Deputy Wardens/Hostel Manager, and Gate Operators/Supervisors.

### Step 3: Verify LLM Proxy & Kill Switch Env
1. Confirm `gate_llm_proxy` is healthy and reachable from the Next.js container (`RAG_LLM_URL` / `RAG_LLM_API_KEY` set in server `.env`).
2. Confirm `auto_llm_enabled = TRUE` in `system_settings` / kill-switch table when enabling live `/api/bot/chat` responses.

### Step 4: Rebuild & Restart App Container
```bash
docker compose build app && docker compose up -d app
```

### Step 5: Live Server Smoke Checks
1. `GET /api/chat/groups` as a student and as faculty -> `200`, no raw UUIDs in response for non-`sysadmin`.
2. `POST /api/chat/groups/<slug>/messages` with `@agent What is pending?` -> `201` with `agent_reply`.
3. `POST /api/chat/groups/<slug>/messages` as a student with `@agent What is my attendance?` -> `201` with `privacy_redirect` (no personal data leaked in class room).
4. `POST /api/chat/groups/<slug>/doubts` -> `POST /api/chat/doubts/<id>/route` -> `POST /api/chat/doubts/<id>/reply` (`publish_to_class: true`) -> verify private reply + class `status_card`.
5. `POST /api/bot/chat` -> verify `tool_result` / `draft_action` SSE events and `503` when `auto_llm_enabled = FALSE`.

---

## 3. Security, Privacy & Fail-Safe Controls (Implemented)

- **Prompt-Injection & Group-Context Guard:** `/api/bot/chat` treats user/OCR text as untrusted data and blocks personal tools (`get_pending_items`, `get_unnoted_circulars`) when `groupId` is set.
- **Class Privacy & Rate Limiting:** `@agent` in `group_type = 'class'` redirects personal student queries (`isPersonalStudentQuery`) to the private Student Console; `@agent` mentions are rate-limited to 10/min per group (`429 RATE_LIMITED`).
- **UUID & Secret Redaction:** `sanitizeAgentPayload` strips secrets for all roles and strips internal UUIDs/IDs for all non-`sysadmin` roles (`isSuperAdmin`).
- **Cross-Scope Dispatch Guard:** `/api/chat/announcements/dispatch` verifies active membership on `target_group_slug` and every `also_applies_to` target (`403` on unauthorized targets).
- **Mandatory Knowledge Expiry:** `/api/chat/knowledge` defaults `effective_to` to 180 days when omitted; `matchConfirmedKnowledge` separates exact vs. partial constraint matches.
- **Moderation Tombstone & Recall/Corrigendum:**
  - `POST /api/chat/messages/[messageId]/redact` soft-deletes messages (`deleted_at`, `deleted_by`, `redaction_reason`); `GET` returns `'[Message removed]'` with `metadata: {}`.
  - `POST /api/chat/messages/[messageId]/recall` freezes mistaken announcements (`recalled_at`, `recalled_by`, `recall_reason`) and optionally posts a linked `[CORRIGENDUM]` card (`superseded_by_id`).
- **Student Capability Gating:** `resolveStudentCapabilities` fails closed on `detained`/`debarred`/`suspended`/`graduated` standings.
- **Observability:** `agent_traces` (`GET /api/sysadmin/agent-traces`) logs `request_id`, `session_id`, `actor_role`, `lane`, `tool_name`, `tool_status`, `knowledge_match_type`, `draft_emitted`, and `latency_ms` without raw secrets.

