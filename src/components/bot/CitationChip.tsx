// src/components/bot/CitationChip.tsx
//
// A single source chip rendered under an assistant message. Tapping the
// chip opens a small popover with the source document's title/source
// label and the actual passage it was quoted from (the `excerpt` the
// retriever carries). Max 3 chips shown; a "+N more" toggle reveals
// the rest.
//
// Why a chip, not plain text: a citation you can open and read the
// source behind it is what makes a RAG answer *trustable* — the user
// can verify "yes, that's what §4.2 actually says" instead of taking
// the LLM's paraphrase on faith.

import { memo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, X } from "lucide-react";
import type { Citation } from "./store";

export const CitationChip = memo(function CitationChip({
  cites,
}: {
  cites: Citation[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? cites : cites.slice(0, 3);
  const hidden = cites.length - visible.length;
  const open = openId ? cites.find((c) => c.id === openId) : null;

  if (!cites.length) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Sources">
      {visible.map((c) => (
        <button
          key={c.id}
          onClick={() => setOpenId(openId === c.id ? null : c.id)}
          aria-expanded={openId === c.id}
          aria-label={`Source: ${c.title}${c.source ? `, ${c.source}` : ""}`}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)]
                     bg-[var(--bg-base)] px-2.5 py-1 text-[11px] font-medium
                     text-[var(--text-secondary)] hover:text-emerald-500
                     hover:border-emerald-500/40 transition active:scale-[0.98]"
        >
          <FileText className="h-3 w-3 text-emerald-500" aria-hidden />
          <span className="font-mono text-[10px] text-emerald-500">[{c.n}]</span>
          <span className="max-w-40 truncate">{c.title}</span>
        </button>
      ))}
      {hidden > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="inline-flex items-center rounded-full border border-[var(--border)]
                     px-2.5 py-1 text-[11px] text-[var(--text-muted)]
                     hover:text-[var(--text-primary)] transition"
        >
          +{hidden} more
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label={`Source: ${open.title}`}
            className="relative w-full max-w-md rounded-lg border border-[var(--border)]
                       bg-[var(--bg-elevated)] p-3 text-left shadow-lg"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  <span className="font-mono text-emerald-500">[{open.n}]</span> {open.title}
                </p>
                {open.source && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{open.source}</p>
                )}
              </div>
              <button
                onClick={() => setOpenId(null)}
                aria-label="Close source"
                className="shrink-0 p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {open.excerpt && (
              <blockquote className="text-[11px] leading-relaxed text-[var(--text-secondary)]
                                     border-l-2 border-emerald-500/40 pl-2 italic">
                {open.excerpt}
              </blockquote>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
