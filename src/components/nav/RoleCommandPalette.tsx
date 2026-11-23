"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Clock, ArrowUpRight, X } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface QuickRoute {
  label: string;
  href: string;
  roles: string[];
  keywords?: string;
}

const ROLE_ROUTES: QuickRoute[] = [
  { label: "Student Home", href: "/student", roles: ["student", "cr", "student_representative"] },
  { label: "Attendance & Next Period", href: "/student/attendance", roles: ["student", "cr", "student_representative"] },
  { label: "Attendance Calendar", href: "/student/attendance-calendar", roles: ["student", "cr", "student_representative"] },
  { label: "My Calendar", href: "/student/calendar", roles: ["student", "cr", "student_representative"] },
  { label: "Gate Scan History", href: "/student/history", roles: ["student", "cr", "student_representative"] },
  { label: "Pass Hub", href: "/student/passes", roles: ["student", "cr", "student_representative"] },
  { label: "Mess Hub", href: "/student/mess", roles: ["student", "cr", "student_representative"] },
  { label: "Assignments", href: "/student/assignments", roles: ["student", "cr", "student_representative"] },
  { label: "Profile & Security", href: "/student/profile-security", roles: ["student", "cr", "student_representative"] },
  { label: "Principal Command Center", href: "/principal", roles: ["principal"] },
  { label: "Principal Approvals", href: "/principal/approvals/pending", roles: ["principal"] },
  { label: "Principal Delegations", href: "/principal/governance/delegations", roles: ["principal"] },
  { label: "Principal Gates", href: "/principal/operations/gates", roles: ["principal"] },
  { label: "Principal Profile", href: "/principal/profile", roles: ["principal"] },
  { label: "HOD Approvals", href: "/hod/approvals", roles: ["hod"] },
  { label: "HOD Classes", href: "/hod/classes", roles: ["hod"] },
  { label: "VP Approvals", href: "/vice-principal/approvals", roles: ["vice_principal"] },
  { label: "Operator Lookup", href: "/operator/lookup", roles: ["operator"] },
  { label: "Operator Profile", href: "/operator/profile", roles: ["operator"] },
  { label: "Admin Attendance", href: "/admin/attendance", roles: ["admin", "sysadmin"] },
  { label: "Admin Profile", href: "/admin/profile", roles: ["admin"] },
  { label: "SysAdmin Sessions", href: "/sysadmin/sessions", roles: ["sysadmin"] },
  { label: "SysAdmin Gate Schedule", href: "/sysadmin/gate-schedule", roles: ["sysadmin", "admin"] },
  { label: "SysAdmin Profile", href: "/sysadmin/profile", roles: ["sysadmin"] },
  { label: "Guardian Visit Schedule", href: "/guardian/visit-schedule", roles: ["guardian", "parent"] },
];

const RECENT_KEY = "role_cmd_recent_routes_v1";

export function RoleCommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "").toLowerCase();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<Array<{ label: string; href: string }>>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/login")) return;
    const match = ROLE_ROUTES.find((r) => r.href === pathname);
    if (!match) return;
    setRecent((prev) => {
      const next = [
        { label: match.label, href: match.href },
        ...prev.filter((p) => p.href !== match.href),
      ].slice(0, 4);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const permitted = useMemo(() => {
    if (!role) return [];
    return ROLE_ROUTES.filter((r) => r.roles.includes(role));
  }, [role]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return permitted;
    return permitted.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.href.toLowerCase().includes(q) ||
        (r.keywords ?? "").toLowerCase().includes(q),
    );
  }, [permitted, query]);

  if (!user || pathname?.startsWith("/login") || pathname?.startsWith("/gate/")) {
    return null;
  }

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        data-testid="role-command-trigger"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 hidden sm:inline-flex items-center gap-2 rounded-full border border-border bg-bg-surface/95 px-3 py-1.5 text-xs font-medium text-text-muted shadow-md backdrop-blur hover:border-action-primary hover:text-text-primary"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Quick Jump</span>
        <kbd className="rounded border border-border bg-bg-elevated px-1.5 py-0.5 font-mono text-[10px]">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          data-testid="role-command-palette"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20 backdrop-blur-xs"
          onClick={() => setOpen(false)}
        >
          <div
            className="surface-card w-full max-w-lg overflow-hidden bg-bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Search className="h-4 w-4 text-text-muted shrink-0" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Jump to ${role} pages...`}
                className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-text-muted hover:text-text-primary"
                aria-label="Close quick jump"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-3">
              {!query && recent.length > 0 && (
                <div className="space-y-1">
                  <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Recent
                  </p>
                  {recent.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => go(item.href)}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-text-primary hover:bg-bg-elevated"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-text-muted" />
                        <span>{item.label}</span>
                      </span>
                      <span className="font-mono text-[11px] text-text-muted">
                        {item.href}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-1">
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                  Permitted Routes ({filtered.length})
                </p>
                {filtered.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => go(item.href)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium text-text-primary hover:bg-bg-elevated"
                  >
                    <span>{item.label}</span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-text-muted">
                      <span>{item.href}</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
