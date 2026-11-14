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
          className="surface-card inline-flex items-center gap-1 bg-bg-base px-2.5 py-1 text-xs font-medium text-text-secondary hover:text-action-success hover: transition active:scale-[0.98]"
        >
          <FileText className="size-3.5 text-action-success" aria-hidden />
          <span className="font-mono text-xs text-action-success">[{c.n}]</span>
          <span className="max-w-40 truncate">{c.title}</span>
        </button>
      ))}
      {hidden > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="surface-card inline-flex items-center px-2.5 py-1 text-xs text-text-muted hover:text-text-primary transition"
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
            className="surface-card relative w-full max-w-md bg-bg-elevated p-3 text-left"
          >
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-primary">
                  <span className="font-mono text-action-success">[{open.n}]</span> {open.title}
                </p>
                {open.source && (
                  <p className="text-xs text-text-muted mt-0.5">{open.source}</p>
                )}
              </div>
              <button
                onClick={() => setOpenId(null)}
                aria-label="Close source"
                className="surface-card shrink-0 p-0.5 text-text-muted hover:text-text-primary transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {open.excerpt && (
              <blockquote className="surface-card text-xs leading-relaxed text-text-secondary pl-2 italic">
                {open.excerpt}
              </blockquote>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
