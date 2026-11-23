/**
 * nav/level3/ExecutiveFamilyBar — Level-3 (executive / sysadmin) family
 * group bar.
 *
 * Data-agnostic bar: shows a Compass icon + the family group name, then
 * a wrapping row of link tiles. The `active` tile is highlighted with
 * bg-bg-elevated + text-action-primary vs muted text for the rest,
 * so the user sees which family route they're on and can pivot to
 * sibling routes within the same family.
 *
 * No page wiring here — the caller passes the family name and a list
 * of route tiles (with an optional `active` flag). The caller owns
 * data (counts, statuses, etc.); this bar is purely a router surface.
 */

import Link from "next/link";
import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FamilyRouteLink {
  label: string;
  href: string;
  active?: boolean;
}

export function ExecutiveFamilyBar({
  familyName,
  routes,
  className,
}: {
  familyName: string;
  routes: FamilyRouteLink[];
  className?: string;
}) {
  return (
    <div className={cn("surface-card bg-bg-surface p-4 min-w-0", className)}>
      <div className="flex items-center gap-2">
        <Compass className="h-4 w-4 shrink-0 text-action-primary" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
          {familyName}
        </p>
      </div>
      {routes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {routes.map((route) => {
            const active = route.active === true;
            return (
              <Link
                key={route.href + route.label}
                href={route.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "surface-card inline-flex items-center px-3 py-2 text-xs font-medium transition-colors motion-reduce:transition-none",
                  active
                    ? "bg-bg-elevated text-action-primary"
                    : "bg-bg-surface text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
                )}
              >
                {route.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ExecutiveFamilyBar;
