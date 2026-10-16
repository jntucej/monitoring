"use client";

/**
 * Admin dashboard root page — board-only.
 *
 * The KPI cards, campus dashboard, gate charts, and tab-scroll chrome have
 * been dropped. The RoleConsole shell (mounted by the inner admin/layout.tsx)
 * drives the board feed from /api/admin/alerts, the AdminAlertsPanel, the
 * AdminStatusBar, and the AdminCommandBar. This page intentionally renders
 * nothing — sub-pages pass their content through the layout's `children`.
 */
export default function AdminDashboardPage() {
  return null;
}
