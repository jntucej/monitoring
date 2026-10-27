"use client";

import React from "react";

/**
 * Parent sub-page pass-through.
 *
 * The local sticky tab bar (TABS / ParentSubLayout) is removed — the parent
 * role is migrated to the RoleConsole shell, which drives the IconRail
 * (timeline / notifications / fees / records / contact) plus the feed board.
 * Sub-pages just render their content; the default board fallback is the
 * parent's child-activity feed.
 */
export default function ParentSubLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0">{children}</div>;
}
