# Gate Monitor — Quality Audit Baseline

**Date (IST):** 2026-10-12 ~18:10
**Git:** `main` @ `14948f8` (fix: exam permissions page — remove minTier=80 blocking oie)
**Working tree:** clean (0 uncommitted changes at baseline)

## Environment
| Item | Value |
|---|---|
| Node | v24.21.0 |
| Package manager | npm (package.json + package-lock.json present) |
| Typecheck | `npx tsc --noEmit -p tsconfig.json` → **0 errors** (verified this session) |
| Deploy root | `/opt/monitoring/compose` |
| Repo root | `/root/monitoring` |

## Live service state at baseline (read-only, `docker compose ps`)
| Service | State | Status |
|---|---|---|
| caddy | running | Up 33 hours |
| postgres | running | Up ~1h (healthy) |
| redis | running | Up ~1h (healthy) |
| web | running | Up 25m (healthy) |
| worker | running | Up 59m (healthy) |

All 5 containers up + healthy at baseline. Caddy owns 80/443 (TLS); `monitor.ucej.in` is the public app URL.

## Known-recently-fixed defects (context for regression focus)
- `DATABASE_URL`/`POSTGRES_PASSWORD` wiring into `gate_web` (was literal `$$`-escaped → empty-PW 500s).
- JSONB `stage_history` serialization in `src/lib/postgres.ts` (was `invalid input syntax for type json` on every permission approve).
- `permission_requests` VIEW: now has a real `student_user_id` column (was aliasing `requester_user_id` → `multiple assignments` 500s on INSERT).
- Permission workflow chains: exam `[hod,oie,vice_principal,principal,completed]`; memo `[faculty,hod,vice_principal,principal,completed]` (PR #296/#298).
- Principal stage gating: sees `warden_or_principal` hostel + `principal`-stage exam/memo/staff-leave.
- Exam/permissions page: `minTier=80` removed so `oie` (tier 75) can open it (PR #299).
- `/api/students?scope=active`: `checked_out_at` column + `.or()` filter fixed (PR #297).
- Harbor RAG: `RAG_LLM_API_KEY`/`RAG_EMBEDDING_*` now set in compose `.env` (OmniRoute endpoint).

## Baseline test inventory
- No dedicated test framework found at baseline (jest/vitest/playwright not present in scripts).
- Verification so far has been manual: `tsc`, live HTTP curls, direct psql/redis-cli.

## Commands run at baseline
```
git rev-parse --abbrev-ref HEAD          # main
git rev-parse --short HEAD               # 14948f8
git status --short                        # clean
node --version                            # v24.21.0
cd /opt/monitoring/compose && docker compose ps
```

## Tests NOT yet executed (pending agent results)
- Full API integration suite (Agent: BACKEND/API) — in progress.
- Security/RBAC negative tests (Agent: SECURITY) — in progress.
- DB/Redis/migration audit (Agent: DATABASE) — in progress.
- Worker/realtime verification (Agent: WORKER/REALTIME) — in progress.
- Production build (`npm run build`) + full static sweep (Agent: STATIC) — in progress.
- Architecture/coverage-gap map (Agent: ARCHITECTURE) — in progress.

## Known limitations
- Browser/UI-level testing not yet performed; UI claims pending Agent 3-style verification.
- Load/performance benchmarking not yet run.
- Production-restart operations deliberately deferred (maintenance authorization required per policy).

## Audit directory
Created: `/root/monitoring/docs/quality/` (this file + the agent deliverables as they land).
