"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowUpRight, Sparkles } from "lucide-react";
import { useSupervisorRetention, type SupervisorWin } from "@/stores/supervisorRetentionStore";
import { EmptyState } from "@/components/shared/EmptyState";

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function outcomeStyle(kind: SupervisorWin["kind"]): {
  icon: typeof Check;
  color: string;
} {
  switch (kind) {
    case "escalation_cleared":
      return { icon: Check, color: "text-[var(--action-primary)]" };
    case "incident_resolved":
      return { icon: Check, color: "text-[var(--action-info)]" };
    case "exception_reviewed":
      return { icon: ArrowUpRight, color: "text-[var(--action-warning)]" };
    default:
      return { icon: Check, color: "text-[var(--action-primary)]" };
  }
}

export function WinFeed() {
  const sessionWins = useSupervisorRetention((s) => s.sessionWins);
  const shiftWins = useSupervisorRetention((s) => s.shiftWins);

  // Merge: session wins first, then shift wins (deduped by ticket)
  const seen = new Set<string>();
  const merged: SupervisorWin[] = [];
  for (const w of [...sessionWins].reverse()) {
    if (!seen.has(w.ticket)) {
      seen.add(w.ticket);
      merged.push(w);
    }
  }
  for (const w of [...shiftWins].reverse()) {
    if (!seen.has(w.ticket)) {
      seen.add(w.ticket);
      merged.push(w);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 sm:p-5">
      <header className="mb-3 flex items-center gap-2">
        <Sparkles className="size-4 text-[var(--action-warning)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Your wins</h2>
        {merged.length > 0 && (
          <span className="rounded-full bg-[var(--action-primary)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--action-primary)]">
            {merged.length}
          </span>
        )}
      </header>

      {merged.length === 0 ? (
        <EmptyState
          title="No wins yet this shift"
          description="Clear an escalation or resolve an incident to start your list."
        />
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          <AnimatePresence initial={false}>
            {merged.slice(0, 6).map((w) => {
              const style = outcomeStyle(w.kind);
              const Icon = style.icon;
              return (
                <motion.li
                  key={w.ticket + w.at}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-3 py-2 text-xs"
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)] ${style.color}`}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--text-primary)]">
                      {w.subject}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {w.ticket} · {w.kind.replace("_", " ")} · {relativeTime(w.at)}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
