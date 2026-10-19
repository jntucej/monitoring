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

export function isDashboardRoot(pathname: string | null): boolean {
  if (!pathname) return false;
  return DASHBOARD_ROOTS.some(
    (r) => pathname === r || pathname === `${r}/` || pathname.startsWith(`${r}/`)
  );
}
