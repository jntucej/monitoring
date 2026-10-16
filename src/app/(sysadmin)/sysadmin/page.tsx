"use client";

/**
 * SysAdmin console root page — board-only.
 *
 * The RoleConsole shell provides the Board feed (application-health) as the
 * default main-column fallback, plus the SysadminHealthPanel, SysadminStatusBar,
 * and SysadminCommandBar. There is intentionally no KPI card, chart, or tab
 * scroll on the root: sub-pages pass their content through `children`, and the
 * root renders nothing extra.
 */
export default function SysadminPage() {
  return null;
}
