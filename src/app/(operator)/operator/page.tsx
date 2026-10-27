/**
 * Root operator page — the old Ops Console shell (RoleConsole with the
 * Board feed) renders here, wrapped in the shared (operator) layout's
 * slim 4-icon side-rail (OperatorShell). This restores the dashboard the
 * eefd529d overhaul stripped out, while keeping the new side-rail nav.
 */
"use client";

import { RoleConsole } from "@/components/shared/RoleConsole";

export default function OperatorDashboardPage() {
  return <RoleConsole role="operator" roleRoot="/operator" />;
}
