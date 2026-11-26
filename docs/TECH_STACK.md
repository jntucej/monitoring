# Technology Stack & Infrastructure Architecture

## ⚡ GATE MONITOR: Core Tech Stack & Infrastructure Guide

**Document Version:** 2.1.0  
**Target Organization:** JNTUH College of Engineering Jagtial (JNTUH CEJ)  
**Status:** Production Stack Specification  
**Classification:** Technical Infrastructure & Dependency Mapping  
**Updated:** 2026-11-21 — self-hosted DB layer (PostgreSQL 17, Supabase-compatible
image) replaces hosted Supabase; teaching/academic capability layer added

---

## 1. Executive Summary & Stack Strategy

The **Gate Monitor** technology stack is engineered for low-latency responsiveness, high concurrency, strict type safety, and seamless mobile responsiveness. By combining **Next.js 16 (App Router)** with **self-hosted PostgreSQL 17 (`supabase/postgres:17.6.1.136`)**, **Redis 7**, **Caddy 2**, and **Tailwind CSS 4**, the platform achieves sub-300ms verification speeds and offline-first capabilities for gate guards.

```
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND & CLIENT LAYER                     │
│  - Next.js 16 (App Router & Server Components)                   │
│  - React 19 & Tailwind CSS 4 & Framer Motion                      │
│  - Zustand 5 (Client & Offline State Management)                │
│  - Lucide React Icons & Radix UI Primitives                      │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                      BACKEND & API LAYER                         │
│  - Next.js API Routes (withApiChain + withAuthorization)         │
│  - TypeScript 5 & Zod 4 (End-to-End Type & Body Validation)      │
│  - @simplewebauthn (FIDO2 / WebAuthn Biometrics)                │
│  - Jose & BcryptJS (JWT & Password Cryptography)                │
│  - Redis Lua EVALSHA Rate Limiting + Postgres Fallback           │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                  DATABASE & INFRASTRUCTURE LAYER                 │
│  - Self-Hosted PostgreSQL 17 (supabase/postgres:17.6.1.136, RLS) │
│  - Redis 7 (Cache & Distributed Rate Limiting)                   │
│  - Caddy 2 (Reverse Proxy, Auto-TLS, SSE Streaming)              │
│  - Node.js Worker (Cron, Backup Maintenance, Optional S3 Offsite)│
│  - Playwright & Vitest (E2E & Unit Test Automation)              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Core Technology Stack

### 2.1 Core Framework & Language

| Category | Technology | Version | Purpose & Architectural Rationale |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js | `^16.4.6` | Next-gen full-stack framework with React Server Components, App Router, and Edge middleware capabilities. |
| **UI Library** | React | `^19.3.1` | Modern concurrent rendering UI engine powering dynamic operator dashboards and interactive views. |
| **Language** | TypeScript | `^5.0.0` | Strict static typing across front-end models, API routes, database schemas, and shared interfaces. |
| **Validation** | Zod | `^4.6.7` | Shared request body validation (`src/lib/validate-body.ts`, `src/lib/schemas/`). |
| **Offsite Backup** | `@aws-sdk/client-s3` | `^3.1160.0` | S3 offsite backup upload + `HeadObjectCommand` verification (`worker/lib/s3-offsite.js`, disabled by default). |

### 2.2 Frontend & UI Libraries

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `tailwindcss` / `@tailwindcss/postcss` | `^4.0.0` | Utility-first CSS framework for rapid responsive component design. |
| `lucide-react` | `^1.31.0` | Comprehensive lightweight icon set for accessible UI elements. |
| `framer-motion` | `^13.1.0` | Fluid animations for modal dialogs, status banners, and scan flashes. |
| `recharts` | `^3.10.1` | Responsive charts for occupancy trends, exit analytics, and hourly traffic. |
| `zustand` | `^5.0.15` | Micro state-management store for auth sessions, operator UI state, and offline queues. |
| `clsx` & `tailwind-merge` | `^2.1.1` / `^3.6.0` | Conditional class name composition and Tailwind CSS class deduplication. |

---

## 3. Security, Authentication & Cryptography

| Package | Version | Architectural Role |
| :--- | :--- | :--- |
| `@simplewebauthn/browser` | `^13.3.0` | Hardware biometric registration & FIDO2 passkey challenge handling on client devices. |
| `@simplewebauthn/server` | `^13.3.3` | Server-side WebAuthn assertion verification and credential validation. |
| `jose` | `^6.2.9` | High-performance JSON Web Token (JWT) signing, verification, and session claims handling. |
| `bcryptjs` | `^3.0.3` | Cryptographic salted hashing for user credentials and operator access PINs. |
| `crypto-js` | `^4.2.0` | Client-side dynamic TOTP and QR signature generation helpers. |
| `rate-limiter-flexible` | `^11.2.0` | In-memory and Redis-ready rate limiting protecting API routes from brute-force attacks. |

---

## 4. Hardware Scanner & QR Utilities

| Package | Version | Architectural Role |
| :--- | :--- | :--- |
| `jsqr` | `^1.4.0` | High-speed JavaScript QR code decoder working directly on camera video frames. |
| `qrcode` / `qrcode.react` | `^1.5.4` / `^4.2.0` | Dynamic SVG/Canvas QR code generation for digital student ID cards. |
| `react-qrcode-logo` | `^4.1.0` | Institutional logo-branded QR code generator for institutional passes. |

---

## 5. Database, Backend & Infrastructure Architecture

### 5.1 PostgreSQL Database (self-hosted, Supabase-compatible image)
* **Database Engine:** PostgreSQL 17 — `supabase/postgres:17.6.1.136` container
  (the `supabase/postgres` image is plain Postgres + Supabase extension stack;
  all cloud Supabase/Vercel dependencies were eliminated).
* **Row Level Security (RLS):** Table-level isolation policies ensuring students
  only read their own passes/submissions, wardens access hostel wards, and
  operators write gate logs. Newer subsystems (e.g. academic `submissions`,
  commit 8201cd1f) use **manual `CREATE POLICY`** on the app role instead of
  `ALTER TABLE … ENABLE RLS` auto-enrollment.
* **Database Driver:** `pg` (node-postgres) via `src/lib/postgres.ts`
  (`query<T>(sql, params)`), `@supabase/supabase-js` retained only for the
  remaining browser-side client.
* **Connection Pooling:** Postgres built-in pooler behind the container;
  the web + worker replicas share one `gate_postgres`.

### 5.2 Server & Middleware Architecture
* **Edge Middleware (`src/middleware/`):** Route guards (`auth.ts`), role authorization (`authorization.ts`), CSRF protection (`csrf.ts`), and metrics collectors (`metrics.ts`).
* **Realtime Streaming:** Server-Sent Events (SSE) route at `/api/occupancy/stream` pushing instant occupancy changes to connected dashboards.

---

## 6. QA Automation & Development Tooling

| Tool | Version | Application |
| :--- | :--- | :--- |
| `@playwright/test` | `^1.62.1` | End-to-end user journey test suite verifying gate scanning, login, and pass workflows. |
| `eslint` / `eslint-config-next` | `^9.0.0` / `16.3.1` | Automated static code quality linting. |
| `clean_md.py` & `fix_types.py` | Python Scripts | Automated workspace code hygiene & documentation formatting tools. |

| `date-fns` | `^4.4.0` | Immutable date arithmetic and formatting for curfew windows and pass expiration. |

## Autonomous layer (added 2026-11)
- **Ed25519** — exam-eligibility manifest signing (keypair in
  `exam_eligibility_keys`; Phase 2 moves the private side to KMS).
- **Host cron + `x-cron-secret`** — the 13-job autonomous surface
  (agents + housekeeping); each job is a `/api/cron/*` POST behind
  `requireCronAuth`.
- **Hash-chain audit** — `audit_chain` / `audit_chain_checkpoints`
  provide the tamper-evident lineage (SHA256, nightly checkpoint).
- **Entity scoping** — `entity_scopes`, `delegations` (TTL),
  `pending_approvals` (maker-checker), `leave_requests` (state
  machine) are the schema behind the 29-role model.

## Teaching / Academic capability (added 2026-11-21)
- **Capability-keyed access** — teaching authorization is by binding, not
  role: any user with an active `faculty_assignments` row keyed on
  `faculty_id = user.id` gets `/faculty/*` via `TeachingBindingGate`
  (`src/lib/teaching-binding.ts` → `GET /api/teaching-bindings`). A
  Principal with a CS-301 binding is scoped to CS-301; without a
  binding they get 403 even with the top institutional role.
- **Action kernel** — `src/lib/action-envelope.ts` (`ActionEnvelope`,
  tiers 0–4), `src/lib/dispatch-action.ts`, `src/lib/useAction.ts`;
  all mutations funnel through `POST /api/actions`
  (auth → idempotency dedupe → binding/role permission check →
  execute + `audit_logs`).
- **Academic subsystem** — `assignments`, `submissions`,
  `extension_requests` (migration `20270128000001_academic_subsystem.sql`),
  `faculty_id`-keyed (not `posted_by`), manual RLS policies on
  `submissions` (idempotent `DO`-block since 877feffc); APIs at
  `/api/faculty/*`, `/api/academic-status`
  (HOD two-person rule for SUSPENDED/DEBARRED/LATERAL_JOIN).
- Design: `docs/teaching-capability-architecture.md`; kernel contract:
  `docs/CONTRACT.md` §"Teaching Capability Addendum".

## AI model layer (added 2026-11-25)
- **3 local workers** behind one `ModelManager` — see `docs/AI_ARCHITECTURE.md`
  + `docs/AI_MODEL_COMPATIBILITY.md` for selection, lifecycle, and measured
  benchmark results.
  - **M1** conversation / tool routing — `qwen3:1.7b` (Ollama, host daemon).
  - **M2** OCR — Tesseract 5 (deployed) / PaddleOCR (auto-selected when
    importable), per-burst Python sidecar (`python3 -m model_runtime.ocr`).
  - **M3** document intelligence — `qwen2.5:3b` (Ollama).
- **Credential isolation** — the LLM never sees customer tokens/keys; a
  deterministic permission engine (RBAC → scope → tenant → credential lookup)
  authorizes each tool request and injects the secret only inside tool
  execution. Raw model output is Zod-validated before use.
- **Entry point** — `POST /api/ai/documents` (base64 PDF → M2 OCR if scanned
  → M3 extraction). Gated by `withAuthorization` + CSRF + the
  `ai_models_enabled` kill-switch.
- **No new infra** — no vector DB, no embeddings service, no reranker, no
  planner, no extra LLM. Ollama runs as a host daemon; M2 is a short-lived
  process. M2 and M3 are serialized so they never hold RAM simultaneously
  (peak resident AI memory ≤ ~2.1 GB on this 15 GiB host).
