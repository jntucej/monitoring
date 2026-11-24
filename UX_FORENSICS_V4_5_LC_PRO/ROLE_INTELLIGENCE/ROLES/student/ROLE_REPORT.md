# ROLE_REPORT — student

**Role:** Student (`student`)
**Audit date:** 2026-11-24
**Evidence level:** CODE_VERIFIED + OBSERVED

## 1. Role Overview
The student surface is the **most coherent role area** in the app. 45 pages, every one either fetches real data or is an explicit redirect. Write paths (pass create, meal opt-out, attendance dispute, complaint CRUD, mess review, special-event interest, theme) are all wired. Two `alert()` calls are the sole blemish.

## 2. Page Inventory (45 pages)

| Path | Type | Data | Write |
|---|---|---|---|
| `/student` (home) | Dashboard | `TodayStatus`, `ActivePassCard`, `CampusPulseStrip`, `MyDayStrip`, `ActionItemsStrip` | — |
| `/student/permissions/new` | **Form** | `PassCreateFormV2` | `POST /api/permissions` (line 150) |
| `/student/permissions` | List | `GET /api/permissions` | — |
| `/student/passes` | Hub | `PassHub` + `PassHistory` + `ExtendPassModal` | extend via modal |
| `/student/passes/[ticket]` | Detail | `GET /api/permissions/[ticket]` | — |
| `/student/gate-pass` | Redirect | → `/student/passes` | — |
| `/student/pass-application` | Redirect | → `/student/permissions/new` | — |
| `/student/mess-bill` | Action | `GET /api/student/mess-bill?month=…` | `POST /api/student/meal-opt-out` (line 35). **`alert()` on failure (line 46)** |
| `/student/mess` | Hub | `GET /api/mess/my-token` | — |
| `/student/mess/token` | Detail | token detail | — |
| `/student/mess/token/[eventId]` | Detail | event token | — |
| `/student/mess/reviews` | Action | `GET/POST /api/mess/reviews` | `POST /api/mess/reviews` |
| `/student/mess/special` | Action | `GET /api/mess/special-events` | `POST /api/mess/special-events/[id]/interests` (line 80) |
| `/student/attendance` | Action | `GET /api/student/attendance/overview` | `POST /api/student/attendance/dispute` (line 243) |
| `/student/exams` | Read | `GET /api/student/next-exam` | — |
| `/student/marks` | Read | `GET /api/student/marks` | — |
| `/student/fees` | Read | `GET /api/student/fees` | — |
| `/student/library` | Read | `GET /api/student/library` | — |
| `/student/scholarships` | Read | `GET /api/student/scholarships` | — |
| `/student/complaints` | List | `GET /api/complaints` | — |
| `/student/complaints/new` | **Form** | `ComplaintForm` | `POST /api/complaints` (line 39) |
| `/student/complaints/[id]` | **Action** | `ComplaintDetail` | `PATCH /api/complaints/[id]`, `POST /api/complaints/[id]/feedback`, `POST /api/complaints/[id]/attachments` |
| `/student/id` | Read | `GET /api/students/qr-token` | — |
| `/student/profile` | Action | `UserProfileTab` + `ThemePicker` | `PATCH /api/preferences/theme` |
| `/student/activity` | List | activity feed | — |
| `/student/my-events` | List | `GET /api/campus/events` | — |

## 3. Write Paths (7)
| Endpoint | UI Consumer | Action |
|---|---|---|
| `POST /api/permissions` | `PassCreateFormV2.tsx:150` | Create pass ticket |
| `POST /api/student/meal-opt-out` | `student/mess-bill/page.tsx:35` | Opt out of meal |
| `POST /api/student/attendance/dispute` | `StudentAttendancePage.tsx:243` | Dispute attendance |
| `POST /api/complaints` | `ComplaintForm.tsx:39` | File complaint |
| `PATCH /api/complaints/[id]` | `ComplaintDetail.tsx:37-79` | Close complaint |
| `POST /api/mess/reviews` | `MealReviewPanel` | Submit meal review |
| `POST /api/mess/special-events/[id]/interests` | `SpecialItemSelector.tsx:80` | Express interest in special event |

## 4. Interaction Quality
- **Strength:** Pass creation is config-driven and persona-scoped (`PassCreateFormV2`).
- **Strength:** Complaint loop is complete (file → detail → close → feedback → attachments).
- **Strength:** QR token for gate scan (`/student/id`).
- **Weakness:** `alert()` on mess-bill opt-out failure (line 46) — blocking, unstyled, non-testable.
- **Weakness:** 5 lazy-wrapper shells (fees, marks, library, scholarships, exams) — pages are 5-6 lines that `SakugaPageShell`-import a component. The components do fetch data, but the page adds no logic.

## 5. State Coverage
| State | Present |
|---|---|
| Initial/Loading | YES (`PageLoading`, `WidgetBoundary`) |
| Empty | YES (`RoleEmptyState` for lists) |
| Error | YES (`RoleError`, `WidgetBoundary` error) |
| Success | YES (inline confirmation) |
| Permission denied | YES (`AuthGuard` redirect) |
| Stale data | UNKNOWN (no auto-refresh on most pages) |
| Duplicate submission | UNKNOWN (not verified) |

## 6. Accessibility
- `lucide-react` icons throughout.
- Forms have labels (verified in `ComplaintForm`, `PassCreateFormV2`).
- No aria-live regions observed.
- No reduced-motion handling.

## 7. Responsive
- PWA supports mobile.
- Student home has responsive widget grid.
- No tablet-specific layout observed.

## 8. Performance
- No measured data.
- `usePolling` not used on student pages (no realtime needs).
- 5 lazy-wrapper pages add one extra import resolution.

## 9. Dead/Passive Pages
- `/student/fees`, `/student/marks`, `/student/library`, `/student/scholarships`, `/student/exams` — read-only shells. **Justified:** these are informational (view marks, check fees). Not operational gaps.
- `/student/gate-pass`, `/student/pass-application` — pure redirects. **Not justified:** two URLs for the same destination create confusion.

## 10. Hidden Capabilities
- **None specific to student.** All write paths are wired.
- `POST /api/passes` is an orphan but the student UI correctly uses `POST /api/permissions`.

## 11. Task Simulations
### Routine: Create an outpass
1. Student at `/student` → taps "New Pass" → `/student/permissions/new`.
2. `PassCreateFormV2` renders config-driven form (purpose, dates, reason).
3. Student fills form → `POST /api/permissions` (line 150).
4. Success → ticket created, status PENDING.
5. Student checks `/student/permissions` → sees ticket in PENDING.
6. HOD/VP approves → student sees APPROVED.
7. Student shows QR at gate (`/student/id` → `GET /api/students/qr-token`).
**Friction:** None for happy path. The form is clean and config-driven.

### Exceptional: Mess opt-out fails
1. Student at `/student/mess-bill` → taps "Opt Out".
2. `POST /api/student/meal-opt-out` → fails (server error).
3. **`alert(j.error?.message ?? "Failed to opt out")`** (line 46) — browser-native dialog.
4. No inline error banner, no retry button, no explanation.
**Friction:** `alert()` is blocking, unstyled, and non-testable. Should be replaced with the app's inline error banner pattern.

## 12. Findings
| ID | Finding | Severity | Priority | Confidence |
|---|---|---|---|---|
| F-ST-01 | `alert()` on mess-bill opt-out failure | LOW | P2 | HIGH |
| F-ST-02 | Two redundant redirect URLs (`/student/gate-pass`, `/student/pass-application`) | LOW | P3 | HIGH |
| F-ST-03 | 5 read-only shell pages (fees, marks, library, scholarships, exams) promise data but add no interaction | LOW | P3 | HIGH |
| F-ST-04 | No auto-refresh on student list pages (permissions, complaints, mess) | LOW | P3 | MEDIUM |

## 13. Coverage Statement
| Dimension | Status |
|---|---|
| Role understanding | COMPLETE |
| Permission verification | COMPLETE |
| Page coverage | COMPLETE (45/45 pages inspected) |
| Workflow coverage | COMPLETE (pass create, complaint, mess, attendance) |
| Interaction coverage | COMPLETE |
| State coverage | PARTIAL (stale-data, duplicate-submission unverified) |
| Accessibility | PARTIAL (not tested) |
| Responsive | PARTIAL (no device emulation) |
| Performance | NOT MEASURED |
| Task simulation | COMPLETE (routine + exceptional) |

## Verification Log (2026-11-24)
- 45 student pages: **CONFIRMED** (find count = 45)
- `alert()` at `mess-bill/page.tsx:46`: **CONFIRMED** (exact line match)
- 7 write paths: **CONFIRMED** (POST /api/permissions, meal-opt-out, attendance/dispute, complaints CRUD, mess reviews, special-events interests)
- 5 read-only shell pages (fees, marks, library, scholarships, exams): **CONFIRMED**
- 2 redirect URLs (gate-pass, pass-application): **CONFIRMED**
- 4 findings (F-ST-01 through F-ST-04): **CONFIRMED**
