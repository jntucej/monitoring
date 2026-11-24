# ROLE_REPORT — principal

**Role:** Principal (`principal`)
**Audit date:** 2026-11-24
**Evidence level:** CODE_VERIFIED

## 1. Role Overview
The principal surface is a **27-page command center** — the richest approver console in the app. Unique capability: `POST /api/permissions/direct-generate` (line 67 of `/principal/passes/page.tsx`), which lets the principal mint a pass without a student request. This is the only approver role with direct-generate.

## 2. Write Pages
| Page | Write Path |
|---|---|
| `/principal/passes` | `POST /api/permissions/direct-generate` (line 67) |
| `/principal/decisions` | Read (decisions log) |
| `/principal/escalations` | Read (open escalations) |

## 3. Read-Only Pages (24+)
attention, governance/*, examinations, operations/*, people/*, + redirects.

## 4. Findings
| ID | Finding | Severity | Priority | Confidence |
|---|---|---|---|---|
| F-PR-01 | Principal is the only role with `direct-generate` capability; no other approver can mint a pass without a student request | INFORMATIONAL | P3 | HIGH |
| F-PR-02 | 24/27 principal pages are read-only | LOW | P3 | HIGH |

## 5. Coverage Statement
| Dimension | Status |
|---|---|
| Page coverage | COMPLETE (27/27) |
| Workflow coverage | COMPLETE (1 unique write path) |
| Task simulation | NOT PERFORMED (deferred) |

## Verification Log (2026-11-24)
- 27 principal pages: **CONFIRMED** (find count = 27)
- `POST /api/permissions/direct-generate` at `principal/passes/page.tsx:67`: **CONFIRMED** (exact line match)
- 2 findings (F-PR-01, F-PR-02): **CONFIRMED**
