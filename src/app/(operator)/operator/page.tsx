/**
 * Root operator page — the old Ops Console dashboard (RoleConsole's Board
 * feed + status strip + command palette) renders here, inside the shared
 * (operator) layout's slim 4-icon side-rail (OperatorShell).
 *
 * `bare` suppresses RoleConsole's own redundant IconRail + top "Ops Console"
 * header so OperatorShell's rail is the only navigation chrome, while the
 * dashboard substance (board, live status strip, ⌘K palette, context panel)
 * and the new 6-digit gate-claim codes stay intact. No footer is rendered.
 */
"use client";

import { RoleConsole } from "@/components/shared/RoleConsole";

export default function OperatorDashboardPage() {
  return <RoleConsole role="operator" roleRoot="/operator" bare />;
}
