"use client";

/**
 * /sysadmin/policy-console — the admin console for the four versioned policy
 * domains (routing / governance / retention / spatial).
 *
 * Closed-loop lifecycle per row:
 *   Draft -> Linter Preview -> Dry-Run -> Verify -> Two-Person Approve ->
 *   Publish (Step-Up).
 *
 * Every step is a server call (no local state mutation). The DB triggers
 * (linter + two-person + meta-rule) are the backstop; the UI surfaces their
 * rejections as 409/401 errors the operator can act on.
 *
 * Rendered inside the existing sysadmin group layout (role-guarded:
 * sysadmin / admin / oie / principal only).
 */
import { PolicyConsoleClient } from "@/components/sysadmin/PolicyConsoleClient";
import { PageHeader } from "@/components/admin/shared/PageHeader";

export default function PolicyConsolePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Policy Console"
        subtitle="Draft, dry-run, verify, two-person approve, and publish the four versioned policy domains. The linter and meta-rule triggers are the final backstop."
      />
      <PolicyConsoleClient />
    </div>
  );
}
