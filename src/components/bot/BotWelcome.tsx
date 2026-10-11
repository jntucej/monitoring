"use client";
import { memo } from "react";
import { motion } from "framer-motion";
import type { BotStrings } from "@/lib/i18n/bot-strings";

export const BotWelcome = memo(function BotWelcome({
  t, onChip, disabled,
}: { t: BotStrings; onChip: (prompt: string) => void; disabled?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="pt-1"
    >
      <p className="text-xs text-[var(--text-muted)] mb-3 text-center">{t.tryAsking}</p>

      <div className="flex flex-wrap gap-1.5 justify-center mb-3">
        {t.quickChips.map((c, i) => (
          <motion.button
            key={c.label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            disabled={disabled}
            onClick={() => onChip(c.prompt)}
            className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--border)]
                       hover:bg-[var(--bg-elevated)] active:scale-95 transition
                       disabled:opacity-50 text-[var(--text-secondary)]"
          >
            {c.label}
          </motion.button>
        ))}
      </div>

      <div className="grid gap-2">
        {t.suggestions.map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.04 }}
            disabled={disabled}
            onClick={() => onChip(s)}
            className="text-left text-xs px-3 py-2 rounded-lg border border-[var(--border)]
                       hover:bg-[var(--bg-elevated)] active:scale-[0.99] transition
                       disabled:opacity-50 text-[var(--text-secondary)]"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
});
