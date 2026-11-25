# AI Architecture — Resource-Efficient 3-Model Agent Layer

This document describes the **intended** architecture implemented by
`model-runtime/`. It is the contract the benchmark and tests verify. See
`docs/AI_MODEL_COMPATIBILITY.md` for the hardware-grounded model selection.

## 1. Roles (the three workers)

| Worker | Model | Purpose | Lifecycle |
|---|---|---|---|
| **M1** Conversation / Tool Routing | `qwen3:1.7b` | intent, tool selection, parameter + date extraction, clarification, structured JSON | **Warm pool** — reused across turns, stopped only after a long idle |
| **M2** OCR | Tesseract 5 (deployed) / PaddleOCR (upgrade path) | text/layout from *scanned* PDFs only | **Burst** — started only when a PDF has no usable text layer, sidecar process killed after the OCR batch |
| **M3** Document Intelligence | `qwen2.5:3b` | document text + metadata + schema → structured JSON (classify, entities, dates, validity, numbers, orgs, money) | **Burst** — started after M2 (or after direct text extraction), stopped on idle |

```
                          USER
                            │
                            ▼
                 ┌───────────────────────┐
                 │ M1 Conversation (tiny)│
                 └──────────┬────────────┘
                            │  Intent / Action (structured JSON)
                 ┌──────────┴──────────┐
                 │                     │
            REST/API TOOL CALL       DOCUMENT PIPELINE
                 │                     │
                 │               text extraction
                 │              ┌──────┴───────┐
                 │           digital PDF    scanned PDF
                 │               │               │
                 │               │        M2 OCR worker
                 │               │               │
                 │               └───────┬───────┘
                 │                       │  extracted text
                 │                    M3 document intelligence
                 │                       │
                 └───────────┬───────────┘
                             ▼
                       Structured Result (validated)
                             │
                             ▼
                            M1  →  USER
```

## 2. Credential isolation (hard rule)

The model **never** sees OAuth tokens, API keys, refresh tokens, client
secrets, or passwords. The flow is:

```
LLM  ──tool request──▶  permission engine  ──▶  credential manager  ──▶  customer API
        (tool + params)        (deterministic RBAC + scope + tenant)   (injects secret)
                                        │
                                        └──▶ audit log
```

`model-runtime/` ships a `permission-engine` that is **deterministic**: it does the
RBAC check, the scope check, the tenant check, and the credential lookup. The LLM
only *asks* for a tool; it never decides authorization. The credential is attached
to the outbound API call **inside** the tool-execution layer only, and is redacted
from every log line (pino `redact` already covers `token`/`secret`/`authorization`).

## 3. Structured output (schemas, never raw trust)

- M1 emits `{ action, parameters, clarify?, confidence }` validated against
  `schemas/m1.ts`.
- M3 emits the document-extraction envelope validated against `schemas/doc.ts`
  (document_type, confidence, document_number, issue_date, valid_from/until,
  issuer, recipient, amount, currency, …).
- Validation uses **Zod** (a lightweight, tree-shakeable schema lib that matches the
  Node 20/TypeScript stack). Raw model output is **never** returned to the user —
  it is parsed, schema-validated, and on failure the call is retried once with a
  correction prompt; a second failure returns a typed error.

## 4. Model manager / lifecycle

`model-runtime/manager.ts` implements the required state machine:

```
STOPPED → STARTING → READY → BUSY → IDLE → STOPPED
```

Per-worker behavior:
- **Lazy load** — a worker only starts when its first request arrives.
- **Health check** — `health()` pings the worker (Ollama `/api/tags`, OCR warm call).
- **Idle timeout** — `IDLE` + no requests for `AI_IDLE_STOP_MS` → `STOPPED`
  (Ollama `unload`; OCR process killed). M1 uses a longer idle threshold; M2/M3 stop
  aggressively.
- **Concurrency limit** — `AI_MAX_CONCURRENCY` per worker (default 1 for M2/M3 so the
  serialized M2→M3 guarantee holds; M1 may run a small pool).
- **Request timeout** — every inference call is wrapped in `AbortSignal.timeout`.
- **Automatic restart** — a failed READY call transitions to `STARTING` and retries once.
- **Memory protection** — a `docPipeline` mutex guarantees M2 and M3 never both hold
  resident memory; M2 is released before M3 is loaded.
- **Metrics** — warm/cold start, latency, peak RSS, tokens/sec (see benchmark).

## 5. Integration points (existing project)

- **Entry:** `/api/bot/chat` (conversation, existing RAG) **and**
  `/api/ai/documents` (new) both go through the same `ModelManager` +
  `permission-engine`. The new route is wired in
  `src/app/api/ai/documents/route.ts`: it reuses `withAuthorization`,
  `assertCsrf`, and the `requireEnabled("ai_models_enabled")` kill-switch,
  base64-decodes the PDF, and calls `runDocumentPipeline`. The route imports
  the local `model-runtime/` source via a **relative import**
  (`../../../../../model-runtime`) — not a bundler alias. `tsconfig.json`
  still carries an `@model-runtime` `paths` entry for editor/type-checking,
  but the build (Next 16 Turbopack) resolves the route's relative import
  directly, so no webpack/turbopack alias config is required.
- **Config:** new env vars are read in `model-runtime/config.ts` (see §7).
- **Kill-switch:** reuses the existing `automation_controls` table — a new row
  `ai_models_enabled` so a sysadmin can stop the AI layer with one SQL update, no
  deploy (matches the existing `auto_llm_enabled` pattern in `src/lib/kill-switch.ts`).
- **Logging/observability:** pino child logger `ai-model-runtime`; Prometheus text
  endpoint additions on the `worker` container for `gate_ai_*` gauges.
- **Deployment:** M1/M3 ride the host Ollama service (sidecar `ollama` in compose,
  or the already-running host daemon); M2 is a Python OCR sidecar
  (`python3 -m model_runtime.ocr`, currently Tesseract-backed on this host). All three
  are optional services the `web` container talks to over the internal Docker net.

## 6. Security considerations
1. **No secret in context.** Enforced structurally: tool requests carry only
   `tool` + `parameters`; the credential manager is the only component that touches
   the customer secret, and only to build the outbound request.
2. **Deterministic RBAC.** Authorization is code, not the model. The permission
   engine evaluates role → capability → scope → tenant in a fixed order and fails
   closed on any missing element.
3. **Input-side injection defense.** Reuses `src/lib/rag/guards.ts`
   (`sanitizeRetrieved`, `tagChunk`) so a malicious document cannot inject
   instructions into M3's extraction prompt.
4. **Output-side validation.** Zod schema + content sanitization
   (`sanitizeModelOutput`) before anything is stored or returned.
5. **Egress allowlist.** M1/M3 talk only to the local Ollama port; M2 is a local
   process. No AI worker can reach the public internet.
6. **Audit.** Every tool execution is written to the existing audit log with the
   acting user, tool, params, and outcome — never the credential.
7. **Resource isolation.** Per-worker RAM caps + serialized M2/M3 prevent an AI
   burst from OOM-ing the 1 GiB-capped `web` container.

## 7. Environment variables (new)
| Var | Default | Meaning |
|---|---|---|
| `AI_M1_URL` | `http://ollama:11434` | Ollama base URL for M1 |
| `AI_M1_MODEL` | `qwen3:1.7b` | M1 model tag |
| `AI_M1_CTX` | `4096` | M1 `num_ctx` |
| `AI_M3_URL` | `http://ollama:11434` | Ollama base URL for M3 |
| `AI_M3_MODEL` | `qwen2.5:3b` | M3 model tag |
| `AI_M3_CTX` | `8192` | M3 `num_ctx` |
| `AI_OCR_CMD` | `python3 -m model_runtime.ocr` | M2 launcher (Paddle, Tesseract fallback) |
| `AI_MAX_CONCURRENCY` | `1` | per-worker in-flight cap (M2/M3 serialized) |
| `AI_IDLE_STOP_MS` | `120000` | idle time before a worker is stopped |
| `AI_M1_IDLE_STOP_MS` | `600000` | longer idle for the reused conversation model |
| `AI_REQUEST_TIMEOUT_MS` | `30000` | per-inference timeout |
| `AI_SERIALIZED_DOC` | `true` | enforce M2→M3 never co-resident |
| `AI_KILL_SWITCH` | `ai_models_enabled` | `automation_controls` row that can stop the whole layer |

## 8. Known limitations
- **CPU-only:** M3 (qwen2.5:3b) is the slow path (~6–10 t/s). Whole-document
  extraction of very long PDFs (>~6k tokens) requires chunking; the pipeline chunks
  and merges.
- **OCR accuracy:** Tesseract 5 (deployed) is strong on clean English scans; handwriting
  and Indic scripts degrade it. PaddleOCR PP-OCRv5 (auto-selected when the `paddleocr`
  module is importable) covers Telugu/Tamil/Hindi + tables — install it to unlock those.
- **No GPU:** all figures assume CPU; a GPU would let M3 run un-quantized and faster.
- **M1 size:** 1.7 B is the reliability floor for multi-field JSON on this hardware;
  below ~1 B, JSON/tool reliability drops noticeably (see compatibility report §2).
- **Ollama host service:** M1/M3 require the host Ollama daemon; if it is down the
  AI layer fails closed (503), matching the existing `auto_llm_enabled` behavior.
```
