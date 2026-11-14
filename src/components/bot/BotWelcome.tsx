"use client";
import { memo } from "react";
import { motion } from "framer-motion";
import { BotBoat } from "./BotBoat";
import type { BotStrings } from "@/lib/i18n/bot-strings";
import type { RoleWelcome } from "./role-welcome";

export const BotWelcome = memo(function BotWelcome({
  t, onChip, disabled, welcome,
}: {
  t: BotStrings;
  onChip: (prompt: string) => void;
  disabled?: boolean;
  /** Role-specific subtitle + examples (see role-welcome.ts). Falls back
      to the generic strings when omitted. */
  welcome?: RoleWelcome;
}) {
  const chips = welcome?.chips ?? [];
  const questions = welcome?.questions ?? t.suggestions;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="pt-1"
    >
      {/* Welcome card: boat silhouette + institutional title. No emoji,
          no slogan — the "quiet library desk attendant" tone. */}
      <div className="flex flex-col items-center gap-1.5 mb-4">
        <div className="h-11 w-11 rounded-xl bg-bg-elevated border border-border
                        flex items-center justify-center">
          <BotBoat size={24} />
        </div>
        <p className="text-sm font-semibold text-text-primary">{t.title}</p>
        {welcome && (
          <p className="text-xs text-text-muted">{welcome.subtitle}</p>
        )}
      </div>

      <p className="text-xs text-text-muted mb-2 text-center">{t.tryAsking}</p>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center mb-3">
          {chips.map((label, i) => (
            <motion.button
              key={label}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              disabled={disabled}
              onClick={() => onChip(label)}
              className="text-xs px-2.5 py-1 rounded-full border border-border
                         hover:bg-bg-elevated active:scale-95 transition
                         disabled:opacity-50 text-text-secondary"
            >
              {label}
            </motion.button>
          ))}
        </div>
      )}

      <div className="grid gap-2">
        {questions.map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.04 }}
            disabled={disabled}
            onClick={() => onChip(s)}
            className="text-left text-xs px-3 py-2 rounded-lg border border-border
                       hover:bg-bg-elevated active:scale-[0.99] transition
                       disabled:opacity-50 text-text-secondary"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
});
