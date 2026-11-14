import Link from "next/link";
import { Compass } from "lucide-react";

export default function PersonNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="surface-card max-w-md w-full p-6 text-center space-y-4">
        <div className="mx-auto size-6 rounded-full bg-action-info/10 flex items-center justify-center">
          <Compass className="w-6 h-6 text-action-info" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary">Not found</h2>
        <p className="text-sm text-text-secondary">
          This page doesn&#39;t exist in the person workspace.
        </p>
        <Link
          href="/"
          className="surface-card inline-flex items-center gap-2 bg-action-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
