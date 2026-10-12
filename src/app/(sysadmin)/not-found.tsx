import Link from "next/link";
import { Compass } from "lucide-react";

export default function SysadminNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="glass-card max-w-md w-full p-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-[var(--action-info)]/10 flex items-center justify-center">
          <Compass className="w-6 h-6 text-[var(--action-info)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Not found</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          This page doesn't exist in the sysadmin workspace.
        </p>
        <Link
          href="/sysadmin"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
