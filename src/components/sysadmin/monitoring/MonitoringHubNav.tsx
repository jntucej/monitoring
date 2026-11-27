"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Container,
  Database,
  ScrollText,
  BarChart3,
} from "lucide-react";

/**
 * MonitoringHubNav — the SysAdmin /monitoring section sub-navigation.
 * One row of section links (System Health · Containers · Database · Logs ·
 * Observability·Grafana) with active-state highlighting. Used at the top of
 * every /sysadmin/monitoring/* page so the sections are one tap apart.
 */
const SECTIONS = [
  { href: "/sysadmin/monitoring", label: "System Health", icon: Activity, exact: true },
  { href: "/sysadmin/monitoring/containers", label: "Containers", icon: Container },
  { href: "/sysadmin/monitoring/database", label: "Database", icon: Database },
  { href: "/sysadmin/monitoring/logs", label: "Logs", icon: ScrollText },
  { href: "/sysadmin/monitoring/grafana", label: "Grafana", icon: BarChart3 },
];

export function MonitoringHubNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto pb-1 -mx-4 px-4 sm:-mx-6 sm:px-6" aria-label="Monitoring sections">
      {SECTIONS.map((s) => {
        const active = s.exact ? pathname === s.href : pathname.startsWith(s.href);
        const Icon = s.icon;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
              active
                ? "border-action-primary bg-action-primary/10 text-action-primary"
                : "border-border bg-bg-elevated text-text-secondary hover:bg-bg-base hover:text-text-primary"
            }`}
          >
            <Icon className="size-3.5" />
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default MonitoringHubNav;
