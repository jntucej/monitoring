# Gate Monitor System — Comprehensive Issues Tracker

| ID | Category | Problem Summary | Target File | Status |
|---|---|---|---|---|
| **1.1** | Responsive | Fixed `lg:` breakpoint assumption in layout causes content compression on tablets (768–1024px). | `src/components/shared/SafeAreaAppShell.tsx`, `src/components/shared/Sidebar.tsx` | 🟢 Resolved |
| **1.2** | Responsive | Mobile bottom bar uses hardcoded first 4 items without role priority. | `src/components/shared/Sidebar.tsx` | 🟢 Resolved |
| **1.3** | Responsive | Admin dashboard 4-column layout stretches on ultra-wide / 4K displays. | `src/app/(admin)/admin/page.tsx` | 🟢 Resolved |
| **1.4** | Responsive | Scanner viewfinder has fixed min-height causing scroll on small mobile viewports. | `src/components/operator/ScanViewfinder.tsx` | 🟢 Resolved |
| **2.1** | Desktop UI | Collapsed sidebar icons lack tooltips and active state feedback. | `src/components/shared/Sidebar.tsx` | 🟢 Resolved |
| **2.2** | Desktop UI | Tables with 8+ columns cause horizontal layout overflow on desktop/tablets. | `src/components/admin/FacultyTracking.tsx` | 🟢 Resolved |
| **2.3** | Desktop UI | Modal system lacks `2xl` and `3xl` size variants for large administrative views. | `src/components/ui/modal.tsx` | 🟢 Resolved |
| **2.4** | Desktop UI | Light theme subtle badges fail WCAG 4.5:1 contrast requirements. | `src/app/globals.css`, `src/components/shared/StatusBadge.tsx` | 🟢 Resolved |
| **3.1** | Mobile UI | Touch targets in navigation and lists are below Apple HIG 44px minimum. | `src/components/shared/Sidebar.tsx`, `src/components/operator/RecentScans.tsx`, `src/components/admin/StudentList.tsx` | 🟢 Resolved |
| **3.2** | Mobile UI | Mobile virtual keyboard overlaps entry confirmation dialogs. | `src/components/operator/ManualEntryDialog.tsx` | 🟢 Resolved |
| **3.3** | Mobile UI | Mobile bottom bar loses active route context indicator. | `src/components/shared/Sidebar.tsx` | 🟢 Resolved |
| **3.4** | Mobile UI | Mobile pull-to-refresh interferes with list scrolling. | `src/components/operator/RecentScans.tsx`, `src/components/admin/StudentList.tsx` | 🟢 Resolved |
| **4.1** | Architecture | Client/Server Supabase client confusion leads to inconsistent RLS bypass during SSR. | `src/lib/db.ts` | 🟢 Resolved |
| **4.2** | Architecture | Inconsistent error propagation (swallowing errors with `null` returns). | `src/lib/db.ts` | 🟢 Resolved |
| **4.3** | Architecture | Potential race condition in gate initialization effects on unmount. | `src/app/(operator)/gate/[gateId]/page.tsx` | 🟢 Resolved |
| **4.4** | Integrity | Storing raw JWT tokens in localStorage risks XSS exposure. | `src/stores/authStore.ts` | 🟢 Resolved |
| **4.5** | Security | Missing roll number format validation in gate scan API route. | `src/app/api/gate/scan/route.ts` | 🟢 Resolved |
| **5.1** | Cinematic | Indiscriminate backdrop-filter blur causes severe GPU frame drops on mid-tier devices. | `src/app/globals.css` | 🟢 Resolved |
| **5.2** | Cinematic | GPU layer explosion from `translateZ(0)` on all glass elements. | `src/components/shared/GlassCard.tsx`, `src/components/shared/GlassInteractiveCard.tsx` | 🟢 Resolved |
| **5.3** | Cinematic | Shimmer animation runs continuously on CPU/GPU repaints. | `src/app/globals.css` | 🟢 Resolved |
| **5.4** | Cinematic | Floating particles continue rendering when scrolled out of viewport. | `src/components/shared/GlassParticles.tsx` | 🟢 Resolved |
| **5.5** | Cinematic | Inconsistent spring animation timing and stiffness values across components. | `src/lib/animations.ts` | 🟢 Resolved |
| **6.1** | Integrity | WebSocket connection memory leak on re-rendering. | `src/context/GlassContext.tsx` | 🟢 Resolved |
| **6.2** | Security | PostgREST param sanitizer relies on brittle character regex. | `src/lib/db.ts` | 🟢 Resolved |
| **6.3** | Security | Missing CSRF origin verification on auth PIN login route. | `src/app/api/auth/pin-login/route.ts` | 🟢 Resolved |
| **6.4** | Type Safety | Missing branded types for UUID and Roll Number identification. | `src/lib/types.ts` | 🟢 Resolved |
| **6.5** | Integrity | Missing runtime validation for mandatory environment variables. | `src/lib/supabaseClient.ts` | 🟢 Resolved |

---
*Tracker created and updated as fixes are applied.*
