"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, BookOpen, Shield, Users, Settings, FileText, DoorOpen, Bell, AlertCircle } from "lucide-react";
import type { ForwardRefExoticComponent, RefAttributes } from "react";

type LucideIcon = ForwardRefExoticComponent<Omit<React.SVGProps<SVGSVGElement>, "ref"> & RefAttributes<SVGSVGElement>>;

export interface HelpArticle {
  id: string;
  title: string;
  summary: string;
  icon: LucideIcon;
  category: string;
  minTier: number;
  visibleToRoles?: string[];
  body: string[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  DoorOpen,
  Bell,
  AlertCircle,
  BookOpen,
  Shield,
  Users,
  Settings,
  Search,
  ChevronDown,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] ?? FileText;
}

export const ARTICLES: HelpArticle[] = [
    /* night-curfew */
  {
    id: "night-curfew",
    title: "Night Curfew",
    summary: "One-line description of what this article covers.",
    icon: DoorOpen,
    category: "Gate operations",
    minTier: 60,
    visibleToRoles: ["warden"],
    body: [
      "First step...",
      "Second step...",
      "Third step...",
    ],
  },
    /* emergency-protocol */
  {
    id: "emergency-protocol",
    title: "Emergency Protocol",
    summary: "One-line description of what this article covers.",
    icon: AlertCircle,
    category: "Emergency",
    minTier: 40,
    visibleToRoles: ["warden", "deputy_warden", "guard"],
    body: [
      "First step...",
      "Second step...",
      "Third step...",
    ],
  },
  // SCAFFOLD:HELP -- new articles are injected above this line
];

function getRoleTier(role: string): number {
  const t: Record<string, number> = {
    sysadmin: 100,
    admin: 95,
    principal: 90,
    vice_principal: 85,
    exam_branch: 80,
    oie: 75,
    hostel_manager: 70,
    deputy_warden: 65,
    warden: 60,
    caretaker: 55,
    hod: 50,
    staff: 45,
    worker: 40,
    student: 30,
    parent: 25,
    visitor: 10,
    guard: 20,
    operator: 20,
  };
  return t[role] ?? 0;
}

export default function HelpPage() {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  // Mock user -- in real app, pull from auth store
  const user = { role: "sysadmin", id: "demo" };
  const tier = getRoleTier(user.role);

  const visible = useMemo(() => {
    return ARTICLES.filter((a) => {
      if (tier < a.minTier) return false;
      if (a.visibleToRoles && !a.visibleToRoles.includes(user.role)) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q);
    });
  }, [query, tier]);

  const grouped = useMemo(() => {
    const groups: Record<string, HelpArticle[]> = {};
    for (const a of visible) {
      groups[a.category] = groups[a.category] || [];
      groups[a.category].push(a);
    }
    return groups;
  }, [visible]);

  if (!visible.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <Search className="mx-auto h-12 w-12 text-[var(--text-muted)]" />
        <h2 className="mt-4 text-lg font-semibold">No articles found</h2>
        <p className="mt-1 text-[var(--text-muted)]">Try a different search or contact your administrator.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Help Center</h1>
        <p className="mt-1 text-[var(--text-muted)]">
          Role-scoped documentation for <span className="font-mono">{user.role}</span> (tier {tier})
        </p>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <input
          type="search"
          placeholder="Search articles..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
      </div>

      <div className="space-y-6" role="list">
        {Object.entries(grouped).map(([category, articles]) => (
          <section key={category} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {category}
            </h2>
            {articles.map((a) => (
              <article
                key={a.id}
                className="group rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden transition-shadow hover:shadow-lg"
              >
                <button
                  onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                  className="w-full p-4 flex items-start gap-3 text-left"
                  aria-expanded={expanded === a.id}
                >
                  <a
                    href="#"
                    className="flex-shrink-0 h-10 w-10 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <a.icon className="h-5 w-5" />
                  </a>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">{a.title}</h3>
                    <p className="mt-0.5 text-[13px] text-[var(--text-muted)] line-clamp-1">
                      {a.summary}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                      <span className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] font-mono">
                        Tier ≥ {a.minTier}
                      </span>
                      {a.visibleToRoles && (
                        <span className="px-1.5 py-0.5 rounded bg-[var(--bg-elevated)]">
                          {a.visibleToRoles.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronDown
                    className={"flex-shrink-0 h-4 w-4 text-[var(--text-muted)] transition-transform " + (expanded === a.id ? "rotate-180" : "")}
                  />
                </button>

                {expanded === a.id && (
                  <div className="border-t border-[var(--border)] px-4 pb-4 text-[var(--text-secondary)] text-sm space-y-2">
                    {a.body.map((step, i) => (
                      <p key={i} className="flex gap-2">
                        <span className="flex-shrink-0 font-mono text-[var(--text-muted)]">
                          {i + 1}.
                        </span>
                        {step}
                      </p>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
