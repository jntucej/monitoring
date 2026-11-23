/**
 * nav/level0/GuardianWardBar — Level-0 (self/ward) guardian ward-context strip.
 *
 * Data-agnostic bar: shows the ward label and a wrapping row of link chips
 * scoped to that ward. Each chip's href gets `?ward=<wardId>` appended if
 * it isn't already present, so ward context persists across sub-pages
 * (attendance / requests / status / etc.) without the caller tracking
 * query strings.
 *
 * No page wiring here — the caller passes the ward label + a list of
 * action links. The caller owns data (child counts, pending requests, etc.);
 * this bar is purely a router surface.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Append `?ward=<wardId>` to a path unless it already carries a
 * `?ward=` (or any `ward=`) query param. Preserves existing query
 * strings and the hash fragment.
 */
function withWardParam(href: string, wardId: string): string {
  const [path, hash] = href.split("#");
  const [pathname, query] = path.split("?");
  const params = new URLSearchParams(query ?? "");
  if (!params.has("ward")) {
    params.set("ward", wardId);
  }
  const nextQuery = params.toString();
  const joined = `${pathname}${nextQuery ? `?${nextQuery}` : ""}`;
  return hash ? `${joined}#${hash}` : joined;
}

export function GuardianWardBar({
  wardId,
  label,
  actions,
  className,
}: {
  wardId: string;
  label: string;
  actions: Array<{ label: string; href: string }>;
  className?: string;
}) {
  return (
    <div className={cn("surface-card bg-bg-surface p-4 min-w-0", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Ward
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-text-primary">
            {label}
          </p>
        </div>
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const href = withWardParam(action.href, wardId);
              return (
                <Link
                  key={href + action.label}
                  href={href}
                  className="surface-card inline-flex items-center gap-1.5 bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-surface hover:text-action-primary transition-colors motion-reduce:transition-none"
                >
                  <span className="max-w-48 truncate">{action.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default GuardianWardBar;
