"use client";

/**
 * Visitor root page — board-only.
 *
 * The RoleConsole shell (mounted in the visitor layout) renders the default
 * Board feed from the visitor console config (feed: /api/visitors/mine,
 * itemKey "logs"). This page returns null so the shell's default main-column
 * fallback (the visit-activity board) is what displays. Sub-pages render
 * their own content as `children` inside the same shell.
 */

export default function VisitorPage() {
  return null;
}
