/**
 * Where the bot launcher is visible. Includes the dashboard roots AND
 * their detail/sub-paths (e.g. /admin/students/[id], /student/profile) —
 * users spend most of their time on detail pages, which is exactly when
 * they need help. The panel still closes on route change (existing
 * behavior); only the floating launcher stays visible.
 *
 * GATE DESK EXCLUDED: /gate/[gateId] is a scanning surface where the
 * floating button would create a muscle-memory conflict with the IN/OUT
 * confirm buttons. /operator/lookup and other operator sub-pages are fine.
 */
export const DASHBOARD_ROOTS = [
  "/admin",
  "/sysadmin",
  "/student",
  "/supervisor",
  "/operator",
  "/worker",
  "/parent",
  "/caretaker",
  "/deputy-warden",
  "/hostel-manager",
  "/oie",
  "/principal",
  "/vice-principal",
  "/faculty",
  "/staff",
  "/exam",
  "/exam/superintendent",
  "/exam-branch",
  "/mess",
  "/visitor",
  "/person",
] as const;

// Routes where the launcher must NOT appear — the operator's gate desk
// is a scanning surface; a floating bot button there is a distraction
// and a muscle-memory hazard next to the IN/OUT confirm keys.
const GATE_DESK_PREFIX = "/gate/";

export function isDashboardRoot(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith(GATE_DESK_PREFIX)) return false;
  return DASHBOARD_ROOTS.some(
    (r) => pathname === r || pathname === `${r}/` || pathname.startsWith(`${r}/`)
  );
}
