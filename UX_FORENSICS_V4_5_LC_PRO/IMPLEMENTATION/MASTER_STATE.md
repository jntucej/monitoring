# MASTER_STATE.md — V4.5-AFX Execution Engine

- **Project:** mycampus (GATE MONITOR) — `/opt/monitoring/compose`
- **Branch:** `ux-v45/afx-execution` (branched from `main` at `44706eb3`)
- **Started:** 2026-11-24
- **Current Phase:** INITIALIZED -> EXECUTING QUEUE
- **Active Issue:** `F-OIE-01` (OIE Kanban Queue `/oie/queue` inline actionability)
- **Baseline Gates (at `44706eb3`):**
  - `npx unslop-ui . --strict --quiet`: `100/100 - Clean; 0 findings in 2427 files`
  - `npx tsc --noEmit`: 0 errors
  - `gate_web`: `Up (healthy)` at `http://localhost:80`
- **Standing Rules:**
  - Single-issue execution loop: FIND -> INVESTIGATE -> PLAN -> FIX -> TEST -> BACKTRACK -> VERIFY -> REPORT -> NEXT.
  - Never bypass pre-commit (`unslop-ui --strict`).
  - Never deploy to production or merge PR without explicit user authorization.
  - Never expose credentials from `/root/monitoring/scripts/smoke-creds.json` or `README_CREDENTIALS.md`.
