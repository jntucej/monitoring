"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { PageLoading } from "@/components/shared/LoadingStates";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import Link from "next/link";
import { Suspense } from "react";

const TABS = [
  { href: "/warden", label: "Overview" },
  { href: "/warden/resident-directory", label: "Residents" },
  { href: "/warden/hostel-attendance", label: "Attendance" },
  { href: "/warden/outpass-leave", label: "Outpass & Leave" },
  { href: "/warden/entry-exit", label: "Entry/Exit" },
  { href: "/warden/incidents", label: "Incidents" },
  { href: "/warden/room-occupancy", label: "Room Occupancy" },
  { href: "/warden/hostel-reports", label: "Reports" },
] as const;

function WardenTabs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-w-0">
      <nav className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-base)]/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <ol className="flex flex-wrap items-center gap-1 text-sm">
            {TABS.map((tab) => {
              const isActive =
                (pathname === tab.href || pathname.startsWith(tab.href + "/")) &&
                (tab.href !== "/warden" || pathname === "/warden");
              return (
                <li key={tab.href}>
                  {isActive ? (
                    <span className="inline-flex items-center px-3 py-2 text-emerald-400 font-semibold border-b-2 border-emerald-400">
                      {tab.label}
                    </span>
                  ) : (
                    <Link
                      href={tab.href}
                      className="inline-flex items-center px-3 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {tab.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 md:px-6">{children}</div>

      <DevContactStrip />
    </div>
  );
}

export default function WardenTabbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<PageLoading />}>
      <WardenTabs>{children}</WardenTabs>
    </Suspense>
  );
}
