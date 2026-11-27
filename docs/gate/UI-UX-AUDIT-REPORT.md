# Gate Monitor — Comprehensive UI/UX Audit Report

**Audit Date:** 2026-11-25
**Repository:** `/Users/akarsh/monitoring` (`mycampus`, Next.js 16 App Router, Tailwind v4)
**Live Target:** `https://monitor.ucej.in`
**Mode:** Audit-only (zero source files modified)

---

## 14. Final Audit Summary (Metrics)

1. **Total routes discovered:** **467** `page.tsx` routes across **23** role groups (`scripts/role-inventory.json`: **365** role leaves + **12** unclaimed routes + public/auth/sub-routes).
2. **Total routes inspected:**
   - **Live browser (unauthenticated):** Public shell (`/`), `/login`, and unauthenticated redirect behavior for `/admin`, `/sysadmin`, `/operator`, `/staff`, `/hod`, `/oie`, `/caretaker`, `/worker`, `/exam-branch` across **8 viewports** (320, 375, 430, 768, 1024, 1280, 1440, 1920px).
   - **Code + static + existing UX-swarm evidence:** Shared design system (`globals.css`, `ui/button.tsx`, `ui/input.tsx`, `ui/modal.tsx`, `shell/RoleResponsiveShell.tsx`, `shell/RoleSidebar.tsx`), `sysadmin/backup-maintenance` (page + `BackupMaintenanceCenter.tsx`), `operator/GateModeBanner.tsx`, `guardian/*`, `sysadmin/roles`, `sysadmin/devices`, `sysadmin/reasons`, `operator/manual-entry`, `gate/[gateId]`, plus the 23-role `docs/ux-panel-results.md` ledger.
3. **Routes not inspected live (and reason):** **~455 authenticated role leaves** could not be rendered live in the browser because `https://monitor.ucej.in` enforces client-side `AuthGuard` + server session cookies and `smoke-creds.json` lives only on the production host (`/root/monitoring/scripts/smoke-creds.json`). **None of these uninspected live states are marked as passed.**
4. **Total issues identified:** **18** distinct findings (plus 10 open role-console items carried from `docs/ux-panel-results.md` and verified against current code).
5. **Issues grouped by severity:**
   - **P0 (Critical):** 2
   - **P1 (High):** 6
   - **P2 (Medium):** 7
   - **P3 (Low):** 3
6. **Most problematic pages:**
   - `/sysadmin/backup-maintenance` & `BackupMaintenanceCenter.tsx` (undefined CSS tokens, silent load failure, light-mode contrast failure, unconfirmed destructive actions, single `window.confirm()` for production DB overwrite)
   - `/login` & public shell (2 `<h1>` elements, 12–13 sub-44px touch targets, no session-expiry context on `?next=` redirect)
   - `/sysadmin/roles`, `/guardian/contact-info`, `/guardian/pass-leave-submission` (mangled Tailwind classes `focus:disabled:opacity-50`, `min-w23`)
   - Role consoles with <40% UX-swarm completion: `/exam-branch` (30%), `/exam-superintendent` (30%), `/operator` (35%), `/oie` (35%), `/staff` (35%), `/worker` (35%)
7. **Most frequently repeated design inconsistencies:**
   - **25 occurrences** of `focus:ringfocus-ring` (missing hyphen) paired with `focus:outline-none` — strips focus rings across `Button`, `Input`, and 6+ pages.
   - **66 files** using undefined shadcn tokens (`text-foreground`, `bg-primary`, `bg-muted`, `text-primary-foreground`) in a Tailwind v4 `@theme inline` app that defines `--color-text-primary`, `--color-action-primary`, `--color-surface-muted`.
   - Native `window.confirm()` used for destructive actions instead of the accessible `Modal` component.
8. **Major accessibility problems:**
   - Broken `:focus-visible` ring (`ringfocus-ring` typo) on core `Button` and `Input` primitives (WCAG 2.4.7).
   - `<sakuga-button>` and `<sakuga-input>` custom-element branches drop `aria-invalid`, `aria-describedby`, `ref`, `loading`, and `focus-visible` classes (WCAG 3.3.1 / 4.1.2).
   - Mobile drawer in `RoleResponsiveShell.tsx` has `role="dialog" aria-modal="true"` with no `aria-label`, no focus trap, and no focus return on close (WCAG 2.4.3 / 4.1.2).
   - Multiple `<h1>` elements (`h1Count: 2`) on `/` and `/login` (WCAG 1.3.1).
   - Sub-44px touch targets: `Button` `icon` variant is `size-6` (24×24px); `/` has 4–5 and `/login` has 12–13 targets <44px (WCAG 2.5.8).
   - Light-mode contrast failure (`text-emerald-400`, `text-red-400`, `text-amber-400` on white/light canvas) in `BackupMaintenanceCenter.tsx` (WCAG 1.4.3).
9. **Major responsive problems:**
   - Public `/` and `/login` have **0px horizontal overflow** across all 8 viewports (320–1920px) — good.
   - `RoleResponsiveShell.tsx` mounts `<RoleNotificationBell className="fixed right-6 top-6 z-20" />` which overlaps the `h-12` mobile top bar on `<1024px` viewports.
   - Data-dense sysadmin tables (`backup-maintenance` manifests/snapshots) lack pagination and responsive card/scroll wrappers.
10. **Recommended remediation sequence:**
    1. Fix `ringfocus-ring` → `ring-focus-ring` (25 occurrences) + `focus:disabled:` mangled classes (8 occurrences).
    2. Replace undefined shadcn tokens (`text-foreground`, `bg-primary`, `bg-muted`) in the 66 affected files with `globals.css` tokens (`text-text-primary`, `bg-action-primary`, `bg-surface-muted`).
    3. Replace `window.confirm()` on `Restore to Production` and destructive admin actions with typed-confirmation `Modal`.
    4. Fix `RoleResponsiveShell` mobile bell overlap + drawer focus trap/label, and `RoleSidebar` fail-closed `when(ctx)` predicates.
    5. Fix `BackupMaintenanceCenter` silent `catch`, `-400` light-mode contrast, and add confirmation + progress state.
    6. Fix `/login` & `/` duplicate `<h1>`, sub-44px touch targets, and `?next=` session-expiry banner.

---

## A. Executive Summary

Gate Monitor has a **strong CSS token foundation** (`src/app/globals.css` — Graphite Canvas `@theme inline` with WCAG-checked border `#C2C8D0` and muted `#5A6472` contrast) and a **well-engineered `Modal` component** (focus save/restore, single-modal guard, Escape handling). Public `/` and `/login` are responsive with zero horizontal overflow from 320px to 1920px.

However, **three systemic defects** undermine reliability, accessibility, and visual coherence across the 467-page app:

1. **Token & class-name drift:** 66 files (including the brand-new `/sysadmin/backup-maintenance` center) use undefined shadcn class names (`bg-primary`, `text-foreground`, `bg-muted`) that silently fail to style buttons and text, while 25 places (including `Button` and `Input`) have a `ringfocus-ring` typo that removes keyboard focus indicators.
2. **Unprotected & opaque administrative operations:** Production database restore uses a single browser `window.confirm()`, `Run Backup Now` / `Run Maintenance` fire with no confirmation, initial load errors are silently swallowed (`catch { /* ignore */ }`), and raw technical identifiers (`filesystem_uuid`, `dedup_ratio`, `SESSION_FAMILY_CREATED`) are exposed directly to users.
3. **Role-console navigation & state gaps:** 12 routes are unclaimed in `role-inventory.json`, `RoleSidebar` fails *open* (`return true`) if a visibility predicate throws, `RoleNotificationBell` overlaps the mobile header, and multiple role consoles (`exam_branch`, `oie`, `staff`, `worker`, `operator`) suffer from duplicate controls, ambiguous labels, or dead-end landing states.

---

## B. Page-by-Page Audit (Coverage & Status)

| Route / Group | Inspection Method | Status | Key Findings |
|---|---|---|---|
| `/` (Public Home) | Live browser (8 viewports) + code | Inspected | 0 overflow; `h1Count: 2`, 4–5 touch targets <44px |
| `/login` | Live browser (8 viewports) + code | Inspected | 0 overflow; `h1Count: 2`, 12–13 touch targets <44px, no `?next=` expiry notice |
| `/admin`, `/admin/dashboard` | Live redirect + code | Redirects to `/login?next=%2Fadmin` | `/admin/dashboard` redirects to `/admin/overview`; 62 leaves |
| `/sysadmin/backup-maintenance` | Live redirect + full code | Redirects; code audited | Undefined tokens, silent `catch`, `-400` contrast, `window.confirm()` on prod restore, no pagination |
| `/sysadmin/roles`, `/devices`, `/reasons` | Code audit | Audited | `ringfocus-ring` typo, `focus:disabled:opacity-50`, `min-w23` |
| `/guardian/contact-info`, `/pass-leave-submission` | Code audit | Audited | `focus:disabled:opacity-50` (5+ inputs) |
| `/operator`, `/gate/[gateId]`, `/operator/manual-entry` | Code + `ux-panel-results.md` | Audited | `GateModeBanner` `compact` mode fixes overlap; `ringfocus-ring` on inputs |
| `/staff`, `/hod`, `/oie`, `/caretaker`, `/worker`, `/exam-branch` | Live redirect + `ux-panel-results.md` | Redirects; panel-audited | Duplicate Notifications/Approvals, raw event codes, 403/dead-end landing |
| Remaining ~455 authed leaves | `role-inventory.json` | **Not inspected live** (no prod creds) | Marked uninspected; not passed |

---

## C. UI/UX Findings Register

| ID | Route / Component | Problem | Observed Behavior | Expected Behavior | Evidence | Sev | Fix | Complexity |
|---|---|---|---|---|---|---|---|---|
| **UX-01** | `/sysadmin/backup-maintenance` (`page.tsx` L701) | Production DB restore uses single `window.confirm()` | Clicking "Restore to Production" opens native `confirm()` and immediately overwrites live DB on OK | Accessible `Modal` showing snapshot ID, timestamp, size, and requiring typed confirmation (e.g. `RESTORE PRODUCTION`) | `src/app/(sysadmin)/sysadmin/backup-maintenance/page.tsx:701` | **P0** | Replace `confirm()` with `Modal` + typed confirmation | S |
| **UX-02** | `RoleSidebar.tsx` (L26, L35) | Nav visibility predicate fails open | `catch { return true; }` shows restricted nav items if `when(ctx)` throws | Fail closed (`return false`) so broken predicates never expose restricted nav | `src/components/shell/RoleSidebar.tsx:26,35` | **P0** | Change `catch { return false; }` | XS |
| **UX-03** | `Button`, `Input`, + 6 pages (25 places) | `ringfocus-ring` typo strips keyboard focus ring | `focus:outline-none focus:ring-2 focus:ringfocus-ring` removes outline and applies no ring color | Visible 2px focus ring using `ring-focus-ring` | `src/components/ui/button.tsx:11`, `input.tsx:73`, `grep` (25 hits) | **P1** | Global replace `ringfocus-ring` → `ring-focus-ring` | XS |
| **UX-04** | 66 files incl. `backup-maintenance` | Undefined shadcn tokens (`bg-primary`, `text-foreground`, `bg-muted`) | `globals.css` defines `--color-action-primary`, `--color-text-primary`, `--color-surface-muted`; shadcn names render unstyled/transparent | Consistent themed buttons, text, and muted surfaces | `src/app/globals.css`, `backup-maintenance/page.tsx:692,720`, `grep` (66 files) | **P1** | Map to `bg-action-primary`, `text-text-primary`, `bg-surface-muted` | M |
| **UX-05** | `BackupMaintenanceCenter.tsx` (L100) | Silent error swallowing on initial load | `catch { /* ignore */ }` leaves empty tables ("No backup policies configured yet") on API failure | Inline error banner with Retry button | `src/components/sysadmin/backup-maintenance/BackupMaintenanceCenter.tsx:100` | **P1** | Set `error` state and render retryable alert | S |
| **UX-06** | `RoleResponsiveShell.tsx` (L74) | Fixed notification bell overlaps mobile header | `fixed right-6 top-6 z-20` sits over the `h-12` mobile top bar on `<1024px` | Bell placed inside mobile `<header>` flex row on `<lg`, fixed only on `lg+` | `src/components/shell/RoleResponsiveShell.tsx:74` | **P1** | Move bell into mobile header slot or `hidden lg:block` + header instance | S |
| **UX-07** | `RoleResponsiveShell.tsx` (L85) | Mobile nav drawer lacks `aria-label`, focus trap, and focus return | `role="dialog" aria-modal="true"` has no accessible name; Tab escapes behind backdrop | `aria-label="Navigation menu"`, focus trap, return focus to menu button on close | `src/components/shell/RoleResponsiveShell.tsx:85` | **P1** | Reuse `Modal` focus-trap pattern or add `aria-label` + trap | S |
| **UX-08** | `BackupMaintenanceCenter.tsx` (L174, L181) | `Run Backup Now` / `Run Maintenance` fire without confirmation or progress | Single click triggers immediate server job; no confirmation or elapsed/timeout indicator | Confirmation prompt + running state indicator | `BackupMaintenanceCenter.tsx:174,181` | **P1** | Add confirmation modal + job status polling | S |
| **UX-09** | `BackupMaintenanceCenter.tsx` (L161–165) | Light-mode contrast failure on status text | `text-emerald-400`, `text-red-400`, `text-amber-400` on `#FFFFFF` (~1.8–2.5:1 contrast) | Use `text-action-success` (`#15803D`), `text-action-danger` (`#B91C1C`), `text-action-warning` (`#B45309`) | `BackupMaintenanceCenter.tsx:161-165,201` | **P2** | Replace `-400` classes with semantic action tokens | XS |
| **UX-10** | `button.tsx` (L46), `input.tsx` (L44) | `<sakuga-button>` / `<sakuga-input>` drop a11y & props | Custom elements omit `aria-invalid`, `aria-describedby`, `ref`, `loading`, `size`, `danger` | Forward all ARIA/ref/variant props or render standard elements | `src/components/ui/button.tsx:46`, `input.tsx:44` | **P2** | Pass ARIA/ref/variant props or remove custom-element fork | M |
| **UX-11** | `sysadmin/roles`, `guardian/*` (8 hits) | Mangled Tailwind `focus:disabled:opacity-50` & `min-w23` | Invalid classes; disabled inputs don't dim and `min-w23` is ignored | `disabled:opacity-50` and valid `min-w-[...]` | `sysadmin/roles/page.tsx:577`, `guardian/contact-info/page.tsx:191` | **P2** | Fix class typos | XS |
| **UX-12** | `/` and `/login` | Multiple `<h1>` elements (`h1Count: 2`) | Live DOM check found 2 `<h1>` tags on both `/` and `/login` | Exactly one `<h1>` per page; secondary headings use `<h2>` | Live browser check on `https://monitor.ucej.in/` & `/login` | **P2** | Demote secondary `<h1>` to `<h2>` | XS |
| **UX-13** | `/`, `/login`, `button.tsx` (`icon`) | Sub-44px touch targets | `icon` button is `size-6` (24×24px); `/` has 4–5 and `/login` has 12–13 targets <44px | Minimum 44×44px hit area on interactive controls | `button.tsx:19`, live browser check | **P2** | Increase `icon` to `size-11` (or `min-h-11 min-w-11`) | S |
| **UX-14** | `/login?next=...` | No session-expiry or redirect context | Redirecting from `/admin` to `/login?next=%2Fadmin` shows generic login with no explanation | Show contextual banner ("Sign in to continue to /admin") | Live browser check on `/admin` → `/login?next=%2Fadmin` | **P2** | Read `next` param and render info banner | XS |
| **UX-15** | `role-inventory.json` | 12 unclaimed routes | `/permissions`, `/person`, `/profile`, `/settings`, `/exam/permissions/*`, `/hostel/permissions` have no owning role nav | Assign to role manifests or remove/redirect | `scripts/role-inventory.json` (`unclaimed`) | **P2** | Map or deprecate unclaimed routes | M |
| **UX-16** | `backup-maintenance/page.tsx` | Raw technical internals + unpaginated lists | Exposes `filesystem_uuid`, `dedup_ratio`, `snapshot_id` without plain-language labels; no pagination | Plain-language labels + tooltips + pagination | `src/app/(sysadmin)/sysadmin/backup-maintenance/page.tsx` | **P3** | Add `HelpTip` + pagination | M |
| **UX-17** | `globals.css` vs brief | Brand palette divergence | Brief specifies Navy `#14243A` / Teal `#0D9488`; `globals.css` uses Graphite `#111827` / `#F3F4F6` (0 occurrences of `#14243A`/`#0D9488` in `src/`) | Align documentation/brand spec with Graphite Canvas or intentionally re-theme | `src/app/globals.css`, `grep` | **P3** | Confirm Graphite Canvas as canonical | XS |
| **UX-18** | `window.confirm()` across admin/operator | Native browser `confirm()` dialogs | Used for delete student/staff, deactivate gate, force logout | Consistent accessible `Modal` with focus management | `grep` (`confirm(` in `src/app`, `src/components`) | **P3** | Standardize on shared `ConfirmModal` | M |

---

## D. Responsive Audit (Live 8-Viewport Check)

Tested live on `https://monitor.ucej.in/` and `/login`:

| Viewport | `/` Overflow | `/` Small Targets (<44px) | `/login` Overflow | `/login` Small Targets (<44px) | Notes |
|---|---|---|---|---|---|
| 320px | None (320/320) | 5 | None (320/320) | 12 | No horizontal scroll; touch targets too small |
| 375px | None (375/375) | 4 | None (375/375) | 12 | Same |
| 430px | None (430/430) | 5 | None (430/430) | 12 | Same |
| 768px | None (768/768) | 5 | None (768/768) | 12 | Same |
| 1024px | None (1024/1024) | 5 | None (1024/1024) | 13 | Desktop breakpoint (`lg:`) |
| 1280px | None (1280/1280) | 5 | None (1280/1280) | 13 | Same |
| 1440px | None (1440/1440) | 5 | None (1440/1440) | 13 | Same |
| 1920px | None (1920/1920) | 5 | None (1920/1920) | 13 | Same |

**Authenticated shell (`RoleResponsiveShell.tsx`):**
- `<1024px`: Sidebar collapses to drawer, mobile `<header className="h-12">` renders, **but** `<RoleNotificationBell className="fixed right-6 top-6 z-20" />` overlaps the mobile header/content.
- Tables in `backup-maintenance` lack responsive card fallbacks or explicit `overflow-x-auto` wrappers.

---

## E. Accessibility Audit (WCAG 2.2 AA)

- **2.4.7 Focus Visible (Fail — P1):** `ringfocus-ring` typo in 25 places (`Button`, `Input`, `gate/[gateId]`, `operator/manual-entry`, `sysadmin/devices`, `sysadmin/reasons`) combined with `focus:outline-none` leaves keyboard users with zero focus indicator.
- **2.4.3 Focus Order & 4.1.2 Name, Role, Value (Fail — P1):** `RoleResponsiveShell` mobile drawer has `role="dialog" aria-modal="true"` without `aria-label`, focus trap, or focus restoration.
- **3.3.1 Error Identification (Fail — P2):** `<sakuga-input>` branch in `input.tsx` drops `aria-invalid` and `aria-describedby`.
- **1.3.1 Info & Relationships (Fail — P2):** `h1Count: 2` on `/` and `/login`.
- **1.4.3 Contrast Minimum (Fail — P2):** `text-emerald-400`, `text-red-400`, `text-amber-400` on white in `BackupMaintenanceCenter.tsx`.
- **2.5.8 Target Size Minimum (Fail — P2):** `Button` `icon` variant (`size-6` = 24×24px) and 4–13 targets on `/` and `/login`.
- **Passing:** Skip link present (`hasSkipLink: True`), `imgsNoAlt: 0`, `inputsNoLabel: 0` on `/` and `/login`; `Modal.tsx` implements proper focus save/restore and Escape handling; `globals.css` tokens (`#C2C8D0` border, `#5A6472` muted) meet contrast targets; `useNoMotion` / `prefers-reduced-motion` respected in motion components.

---

## F. Design System Audit

- **Canonical tokens (`src/app/globals.css`):** Graphite Canvas (`--color-canvas: #F3F4F6`, `--color-surface: #FFFFFF`, `--color-text-primary: #111827`, `--color-text-muted: #5A6472`, `--color-action-primary: #111827`, `--color-action-danger: #B91C1C`, `--color-action-warning: #B45309`, `--color-action-success: #15803D`).
- **Brand mismatch:** Prompt references Navy `#14243A` / Teal `#0D9488` / Slate `#64748B`; zero occurrences exist in `src/`. Graphite Canvas is the actual implemented system.
- **Fragmentation:** 66 files bypass `globals.css` tokens and use undefined shadcn names (`bg-primary`, `text-foreground`, `bg-muted`). `BackupMaintenanceCenter.tsx` uses raw `<button>` instead of `<Button>`. `Button` and `Input` fork into `<sakuga-button>` / `<sakuga-input>` custom elements that drop props.

---

## G. Workflow Analysis (Key User & Admin Flows)

1. **Sysadmin Backup & Production Restore (`/sysadmin/backup-maintenance`):**
   - *Problem:* "Run Backup Now" and "Run Maintenance" execute immediately with no confirmation; "Restore to Production" uses a single `window.confirm()` with no snapshot details or typed confirmation; initial load errors are silently ignored, making a broken API look like "No backup policies configured yet."
2. **Unauthenticated → Authenticated Redirect (`/login?next=...`):**
   - *Problem:* Bouncing from `/admin` to `/login?next=%2Fadmin` gives no explanation of why the user is on `/login` or where they will return.
3. **Role Console Workflows (from `docs/ux-panel-results.md`):**
   - `operator`: `GateModeBanner` `compact` prop was added to fix lockdown banner overlap (verified in code).
   - `staff`: Duplicate "Notifications" buttons (sidebar + bell).
   - `hod`: Duplicate "Approvals" elements.
   - `oie`: "Today" sidebar label not self-evident.
   - `worker`: Raw event codes (`SESSION_FAMILY_CREATED`) shown in logs.
   - `exam_branch`: OIE 403 / dead-end landing URL.
   - `operator/transactions`: Indefinite loading without progress/timeout indicator.

---

## H. Prioritized Remediation Roadmap

1. **Critical fixes (P0):** `UX-01` (typed-confirmation `Modal` for Production Restore), `UX-02` (`RoleSidebar` fail-closed `when(ctx)`).
2. **High-impact UX & token fixes (P1):** `UX-03` (`ringfocus-ring` → `ring-focus-ring` across 25 hits), `UX-04` (replace undefined shadcn tokens in 66 files), `UX-05` (`BackupMaintenanceCenter` error/retry state), `UX-08` (confirm + progress on backup/maintenance runs).
3. **Responsive fixes (P1):** `UX-06` (`RoleResponsiveShell` mobile bell overlap), `UX-16` (table pagination/scroll wrappers).
4. **Accessibility fixes (P1–P2):** `UX-07` (mobile drawer `aria-label` + focus trap), `UX-09` (`-400` → semantic action tokens), `UX-10` (`sakuga-*` ARIA/ref forwarding), `UX-12` (single `<h1>`), `UX-13` (44px touch targets).
5. **Visual consistency & polish (P2–P3):** `UX-11` (`focus:disabled:` / `min-w23`), `UX-14` (`/login?next=` banner), `UX-15` (12 unclaimed routes), `UX-18` (replace `window.confirm()` with `ConfirmModal`).

---

## I. Implementation Specifications (Major Issues)

- **UX-01 (`src/app/(sysadmin)/sysadmin/backup-maintenance/page.tsx:696-713`):** Add `restoreTarget` state; clicking "Restore to Production" opens `<Modal isOpen={!!restoreTarget} title="Confirm Production Database Restore">`, displays `snapshot_id`, `time`, and `stats_json`, requires typing `RESTORE PRODUCTION` into `<Input>` before enabling the `danger` `<Button>`. Validate by clicking button → confirm modal opens, submit disabled until exact phrase entered.
- **UX-02 (`src/components/shell/RoleSidebar.tsx:21-38`):** Change `catch { return true; }` to `catch { return false; }` in `entryVisible` and `childVisible`. Validate with unit test passing a throwing `when` predicate and asserting item is hidden.
- **UX-03 (25 files incl. `src/components/ui/button.tsx:11`, `input.tsx:73`):** Replace `ringfocus-ring` with `ring-focus-ring`. Validate via `grep -rn "ringfocus-ring" src/` returning 0 and Tab-key visual check.
- **UX-04 (66 files incl. `backup-maintenance/page.tsx`, `BackupMaintenanceCenter.tsx`):** Replace `text-foreground` → `text-text-primary`, `bg-primary text-primary-foreground` → `bg-action-primary text-white`, `bg-muted` → `bg-surface-muted`. Validate via `grep` returning 0 undefined shadcn tokens and visual check of button contrast.
- **UX-05 (`src/components/sysadmin/backup-maintenance/BackupMaintenanceCenter.tsx:100`):** Add `loadError` state; in `catch (err)` set `loadError` and render an error banner with a "Retry" `<Button onClick={load}>`.
- **UX-06 & UX-07 (`src/components/shell/RoleResponsiveShell.tsx:47-95`):** Render `<RoleNotificationBell />` inside the mobile `<header>` on `<lg` and `hidden lg:block fixed right-6 top-6` on desktop; add `aria-label="Navigation menu"`, focus trap, and trigger-ref focus restoration to the mobile drawer.
