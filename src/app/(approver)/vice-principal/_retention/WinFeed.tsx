"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ArrowUpRight, Sparkles } from "lucide-react";
import { useVPRetention, type Win } from "@/stores/vpRetentionStore";
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

function outcomeStyle(outcome: Win["outcome"]): {
  icon: typeof Check;
  color: string;
} {
  switch (outcome) {
    case "APPROVED":
      return { icon: Check, color: "text-[var(--action-primary)]" };
    case "REJECTED":
      return { icon: X, color: "text-[var(--action-danger)]" };
    case "ESCALATED":
      return { icon: ArrowUpRight, color: "text-[var(--action-warning)]" };
    case "FORWARDED":
    default:
      return { icon: ArrowUpRight, color: "text-[var(--action-info)]" };
  }
}

export function WinFeed() {
  const sessionWins = useVPRetention((s) => s.sessionWins);
  const todayWins = useVPRetention((s) => s.todayWins);

  // Merge: session wins first, then today's (deduped by ticket)
  const seen = new Set<string>();
  const merged: Win[] = [];
  for (const w of [...sessionWins].reverse()) {
    if (!seen.has(w.ticket)) {
      seen.add(w.ticket);
      merged.push(w);
    }
  }
  for (const w of todayWins) {
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
          title="No wins yet"
          description="Your first cleared item will appear here."
        />
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          <AnimatePresence initial={false}>
            {merged.slice(0, 6).map((w) => {
              const style = outcomeStyle(w.outcome);
              const Icon = style.icon;
              return (
                <motion.li
                  key={w.ticket}
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
                      {w.ticket} · {w.outcome.toLowerCase()} · {relativeTime(w.at)}
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
