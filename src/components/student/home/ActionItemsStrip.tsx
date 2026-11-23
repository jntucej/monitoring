// src/components/student/home/ActionItemsStrip.tsx
// One strip on the student home: "what needs me today". Pulls pending items
// from existing endpoints in parallel. If zero items, the strip is hidden.
// Max 5 pills. No dashboard, no "0 items" noise.

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useIsSakuga } from "@/components/student/useIsSakuga";

interface ActionItem {
  label: string;
  href: string;
  tone: "info" | "warning" | "danger" | "success";
}

export function ActionItemsStrip() {
  const router = useRouter();
  const isSakuga = useIsSakuga();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const out: ActionItem[] = [];

      // 1. Pending assignments due today (from D.3 assignments endpoint)
      try {
        const res = await fetch("/api/student/assignments?mine=pending", { credentials: "include" });
        const json = await res.json();
        const pending = json.data?.pending ?? json.pending ?? 0;
        if (typeof pending === "number" && pending > 0) {
          out.push({ label: `${pending} assignment${pending > 1 ? "s" : ""} due`, href: "/student/assignments", tone: "warning" });
        } else if (Array.isArray(json.data?.items)) {
          const due = json.data.items.filter((i: any) => i.dueDate && new Date(i.dueDate) <= new Date()).length;
          if (due > 0) out.push({ label: `${due} assignment${due > 1 ? "s" : ""} due today`, href: "/student/assignments", tone: "warning" });
        }
      } catch {}

      // 2. Approval waiting (permissions)
      try {
        const res = await fetch("/api/permissions/my-counts", { credentials: "include" });
        const json = await res.json();
        const n = json.data?.pending ?? json.pending ?? 0;
        if (typeof n === "number" && n > 0) {
          out.push({ label: `${n} approval${n > 1 ? "s" : ""} waiting`, href: "/student/permissions", tone: "info" });
        }
      } catch {}

      // 3. Mess token available for today (hostellers)
      try {
        const res = await fetch("/api/mess/my-token", { credentials: "include" });
        const json = await res.json();
        if (json.data?.token && !json.data.eligibility) {
          out.push({ label: "Lunch token ready", href: "/student/mess/token", tone: "success" });
        }
      } catch {}

      // 4. Support ticket open
      try {
        const res = await fetch("/api/support/tickets?mine=open", { credentials: "include" });
        const json = await res.json();
        const n = json.data?.total ?? json.total ?? 0;
        if (typeof n === "number" && n > 0) {
          out.push({ label: `${n} ticket update`, href: "/student/coordinator", tone: "info" });
        }
      } catch {}

      // 5. Next exam coming soon (within 3 days)
      try {
        const res = await fetch("/api/student/next-exam", { credentials: "include" });
        const json = await res.json();
        const next = json.data;
        if (next?.date && new Date(next.date).getTime() - Date.now() < 3 * 86400_000) {
          out.push({ label: `Next exam: ${next.subject ?? next.label}`, href: "/student/exams", tone: "danger" });
        }
      } catch {}

      setItems(out.slice(0, 5));
      setLoading(false);
    })();
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <div className="surface-card bg-bg-base p-3 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-2">
        Needs your attention
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) =>
          isSakuga ? (
            <sakuga-button
              key={i}
              variant={it.tone === "danger" || it.tone === "warning" ? "primary" : "secondary"}
              onClick={() => router.push(it.href)}
            >
              <span className="text-xs">{it.label}</span>
            </sakuga-button>
          ) : (
            <a
              key={i}
              href={it.href}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                it.tone === "danger"
                  ? "bg-rose-500/10 border-rose-500/30 text-action-danger hover:bg-rose-500/20"
                  : it.tone === "warning"
                    ? "bg-amber-500/10 border-amber-500/30 text-action-warning hover:bg-amber-500/20"
                    : it.tone === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-action-success hover:bg-emerald-500/20"
                      : "bg-bg-elevated/50 border-border text-text-secondary hover:bg-bg-elevated"
              }`}
            >
              {it.label}
            </a>
          ),
        )}
      </div>
    </div>
  );
}

export default ActionItemsStrip;
