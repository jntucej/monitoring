"use client";

import type { ReactNode } from "react";
import { RoleConsole } from "@/components/shared/RoleConsole";

/**
 * Operator subtree shell — the (operator) route group's AuthGuard already
 * wraps this layout, so this file only composes the Ops Console shell and
 * passes through nested sub-page content via `children`.
 *
 * Sub-pages (scan, transactions, manual-entry, pass-verification,
 * exceptions) render their own content; it flows into the main column of
 * RoleConsole in place of the default Board feed.
 */
export default function OperatorSectionLayout({
  children,
}: {
  children?: ReactNode;
}) {
  return <RoleConsole role="operator" roleRoot="/operator">{children}</RoleConsole>;
}
