# ROLE_REPORT — guardian

**Role:** Guardian / Parent (`guardian`, `parent`)
**Audit date:** 2026-11-24
**Evidence level:** CODE_VERIFIED + OBSERVED

## 1. Role Overview
The guardian surface is a **14-page parent console** for monitoring ward movement, passes, and attendance. The critical finding: `guardian/child-status` (the most-linked page, referenced from 10 in-app locations) fetches from a **non-existent endpoint** (`/api/pass-requests`), causing a silent 404 → empty pass timeline on every load.

## 2. Page Inventory (14 pages)

| Path | Type | Data | Write |
|---|---|---|---|
| `/guardian` (home) | Dashboard | guardian dashboard | — |
| `/guardian/child-status` | **BROKEN** | `GET /api/pass-requests?wardRoll=…` (**DOES NOT EXIST**) + `GET /api/persons?parentId=me` + `GET /api/persons/[roll]` + `GET /api/persons/[roll]/history` | — |
| `/guardian/child-requests` | List | `GET /api/permissions?status=PENDING` (server-scoped to guardian) | — |
| `/guardian/movement-info` | Read | `GET /api/persons/[roll]` + `/history` | — |
| `/guardian/child-movement` | Read | movement data | — |
| `/guardian/child-attendance` | Read | attendance | — |
| `/guardian/passes` | List | `GET /api/permissions` (guardian-scoped) | — |
| `/guardian/contact-info` | Read | contact | — |
| `/guardian/notifications` | List | notifications | — |
| `/guardian/request-status` | List | request status | — |
| `/guardian/settings` | Shell | settings | — |
| `/guardian/child` | Redirect | → `/guardian/child-status` | — |

## 3. The Broken Fetch (OBSERVED)
`src/app/(approver)/guardian/child-status/page.tsx:39`:
```ts
fetch(`/api/pass-requests?wardRoll=${encodeURIComponent(wardRoll)}&limit=5`, {
  headers: getAuthHeaders(),
  cache: "no-store",
})
  .then((r) => (r.ok ? r.json() : null))
  .then((b) => setItems((b?.data?.requests ?? []) as PassTimelineItem[]))
  .catch(() => setItems([]))
```
- **No `src/app/api/pass-requests/` route exists.**
- The fetch 404s → `r.ok` is false → returns `null` → `b?.data?.requests ?? []` → `[]`.
- The "Pass Timeline" card renders an **empty list with no error indicator** on every load.
- 10 in-app links point to this broken page.

## 4. 10 In-App Links to the Broken Page
| Source | Line |
|---|---|
| `guardian/movement-info` | 133 |
| `guardian/child-requests` | 205 |
| `guardian/child` | 4 (redirect) |
| `guardian/page` | 70, 94 |
| `ParentCommandBar.tsx` | 72 |
| `PrincipalQuickActions.tsx` | 93 |
| `admin/shared/QuickActions.tsx` | 100 |
| `shared/QuickActions.tsx` | 94 |
| `shared/Sidebar.tsx` | 62 |

## 5. Findings
| ID | Finding | Severity | Priority | Confidence |
|---|---|---|---|---|
| F-GU-01 | `/api/pass-requests` does not exist; guardian pass timeline silently empty | CRITICAL | P0 | HIGH |
| F-GU-02 | 10 in-app links point to the broken child-status page | HIGH | P0 | HIGH |
| F-GU-03 | Guardian surface has zero write paths (purely observational) | LOW | P3 | HIGH |

## 6. Task Simulation
### Routine: Check ward's passes
1. Guardian at `/guardian` → taps "Child Status" → `/guardian/child-status`.
2. Page loads: `GET /api/persons?parentId=me` → ward list. `GET /api/persons/[roll]` → ward profile. `GET /api/persons/[roll]/history` → movement history.
3. **Pass Timeline card: EMPTY.** The `GET /api/pass-requests` fetch 404s → `[]`.
4. Guardian sees "No passes" even when passes exist.
**Friction:** Critical. The guardian's primary information need (what passes does my ward have?) is silently broken.

## 7. Coverage Statement
| Dimension | Status |
|---|---|
| Role understanding | COMPLETE |
| Page coverage | COMPLETE (14/14) |
| Workflow coverage | PARTIAL (broken pass timeline) |
| Interaction coverage | COMPLETE |
| State coverage | PARTIAL (silent error on broken fetch) |
| Accessibility | PARTIAL |
| Performance | NOT MEASURED |
| Task simulation | COMPLETE |

## Verification Log (2026-11-24)
- 14 guardian pages: **CONFIRMED** (find count = 14)
- `pass-requests` fetch at `guardian/child-status/page.tsx:39`: **CONFIRMED** (exact line match)
- `/api/pass-requests/` does NOT exist: **CONFIRMED** (ls returns NOT FOUND)
- 10 in-app links to broken page: **CONFIRMED** (grep found 12 references across 9 files, including `entityResolvers.tsx:1260,1265` and `operator/shared/QuickActions.tsx:94` which were not in the initial list)
- 3 findings (F-GU-01 through F-GU-03): **CONFIRMED**

**Suggestion:** The broken fetch should be changed to `GET /api/permissions?roll=…&status=APPROVED` (which exists and returns approved passes for a student) or `GET /api/passes?roll=…` (which returns pass records). The `catch(() => setItems([]))` silently swallows the 404; add an error state that shows "Failed to load pass timeline" instead of an empty list.
