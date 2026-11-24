# ROLE_REPORT — vice_principal

**Role:** Vice-Principal (`vice_principal`)
**Audit date:** 2026-11-24
**Evidence level:** CODE_VERIFIED

## 1. Role Overview
The VP surface is a **24-page approver console** with the richest action set among approvers: pending-approvals (PATCH), escalated-requests, decision-history, academics, hostel-security-summaries, and examination-coordination. The VP is the **only approver role with an inline PATCH on the pending-approvals page** (line 110), in addition to the detail-panel path shared with HOD.

## 2. Page Inventory (24 pages)

| Path | Type | Data | Write |
|---|---|---|---|
| `/vice-principal` (home) | Dashboard | `GET /api/vp/*` | — |
| `/vice-principal/home` | Dashboard | dashboard widgets | — |
| `/vice-principal/pending-approvals` | **Action** | `GET /api/permissions?status=PENDING&stage=vice_principal` | **`PATCH /api/permissions/[ticket]` (line 110)** |
| `/vice-principal/approvals/pending` | List | `GET /api/permissions?stage=vice_principal&status=PENDING` | Via detail panel |
| `/vice-principal/approvals/escalated` | List | `GET /api/permissions?stage=vice_principal&status=ESCALATED` | Via detail panel |
| `/vice-principal/approvals/all` | List | all approvals | — |
| `/vice-principal/escalated-requests` | List | escalated tickets | — |
| `/vice-principal/decision-history` | List | past decisions | — |
| `/vice-principal/attendance-exceptions` | List | `GET /api/vp/academics` | — |
| `/vice-principal/hostel-security-summaries` | Read | hostel summaries | — |
| `/vice-principal/academics` | Read | `GET /api/vp/academics` | — |
| `/vice-principal/academics/departments` | Read | dept breakdown | — |
| `/vice-principal/academics/exceptions` | Read | exceptions | — |
| `/vice-principal/examination-coordination` | Read | exam coordination | — |
| `/vice-principal/examinations` | Re-export | → examination-coordination | — |
| `/vice-principal/analytics` | Read | analytics | — |
| `/vice-principal/department-performance` | Read | dept performance | — |
| `/vice-principal/delegated-responsibilities` | Read | delegation | — |
| `/vice-principal/history` | List | 30/7/90-day views | — |
| `/vice-principal/history/{7,30,90}-days` | List | filtered history | — |
| `/vice-principal/profile` | Shell | profile | — |

## 3. Write Paths
| Endpoint | UI Consumer | Action |
|---|---|---|
| `PATCH /api/permissions/[ticket]` | `pending-approvals/page.tsx:110` (inline) + detail panel | APPROVE/REJECT/ESCALATE |
| `POST /api/permissions/direct-generate` | **NOT on VP surface** (principal-only) | — |

## 4. Interaction Quality
- **Strength:** VP pending-approvals has BOTH inline PATCH (line 110) AND the detail-panel path. This is the most actionable approver surface.
- **Strength:** `usePolling` on pending-approvals (realtime queue updates).
- **Strength:** `escalationInspection` model for inspector.
- **Weakness:** 24 pages but only 2 have write actions (pending-approvals + detail panel). The rest are read-only.
- **Weakness:** No bulk approval.

## 5. Findings
| ID | Finding | Severity | Priority | Confidence |
|---|---|---|---|---|
| F-VP-01 | No bulk approval for VP (backend exists, unwired) | MEDIUM | P1 | HIGH |
| F-VP-02 | 22/24 VP pages are read-only; only pending-approvals + detail panel are actionable | LOW | P3 | HIGH |
| F-VP-03 | `examinations` page is a re-export of `examination-coordination` (duplicate URL) | LOW | P3 | HIGH |

## 6. Task Simulation
### Routine: Co-sign a pass
1. VP at `/vice-principal/pending-approvals` → sees tickets at VP stage.
2. Inline PATCH (line 110) OR tap ticket → detail panel → APPROVE.
3. `PATCH /api/permissions/[ticket]` → success → ticket moves to next stage.
**Friction:** None for single-ticket actions. Bulk is the gap.

## 7. Coverage Statement
| Dimension | Status |
|---|---|
| Role understanding | COMPLETE |
| Page coverage | COMPLETE (24/24) |
| Workflow coverage | COMPLETE |
| Interaction coverage | COMPLETE |
| State coverage | COMPLETE |
| Accessibility | PARTIAL |
| Performance | NOT MEASURED |
| Task simulation | COMPLETE |

## Verification Log (2026-11-24)
- 24 VP pages: **CONFIRMED** (find count = 24)
- Inline PATCH at `pending-approvals/page.tsx:110`: **CONFIRMED** (exact line match: `method: "PATCH"` at line 110, fetch at line 108)
- `GET /api/permissions?status=PENDING&stage=vice_principal` at line 88: **CONFIRMED**
- 3 findings (F-VP-01 through F-VP-03): **CONFIRMED**
- No bulk approval: **CONFIRMED** (`POST /api/permissions/bulk` exists but has zero UI consumers)
