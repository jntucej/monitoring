"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, QrCode, Ticket, UtensilsCrossed, Bell } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";

const TABS = [
  { label: "Home", href: "/student", icon: Home, match: (p: string) => p === "/student" },
  { label: "ID", href: "/student/id", icon: QrCode, match: (p: string) => p.startsWith("/student/id") },
  { label: "Passes", href: "/student/passes", icon: Ticket, match: (p: string) => p.startsWith("/student/passes") },
  { label: "Mess", href: "/student/mess", icon: UtensilsCrossed, match: (p: string) => p.startsWith("/student/mess") },
  { label: "Alerts", href: "/student/notifications", icon: Bell, match: (p: string) => p.startsWith("/student/notifications") },
];

function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)]"
      aria-label="Student navigation"
    >
      <div className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold transition ${
                active ? "text-[var(--action-primary)]" : "text-[var(--text-muted)]"
              }`}
            >
              <t.icon className={`h-5 w-5 ${active ? "text-[var(--action-primary)]" : ""}`} />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function StudentShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={["student", "admin", "sysadmin"]}>
      {/* Bottom padding on mobile so content isn't hidden behind the tab bar */}
      <div className="pb-16 md:pb-0">{children}</div>
      <MobileTabBar />
    </AuthGuard>
  );
}
