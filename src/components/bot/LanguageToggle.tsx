"use client";
import { motion } from "framer-motion";
import { memo } from "react";
import type { BotLang } from "@/lib/rag/config";

export const LanguageToggle = memo(function LanguageToggle({
  lang, onChange, disabled,
}: { lang: BotLang; onChange: (l: BotLang) => void; disabled?: boolean }) {
  return (
    <div className="inline-flex rounded-full bg-[var(--bg-elevated)] p-0.5 border border-[var(--border)]">
      {(["en", "te"] as const).map((l) => (
        <button
          key={l}
          type="button"
          disabled={disabled}
          onClick={() => onChange(l)}
          aria-pressed={lang === l}
          aria-label={l === "en" ? "English" : "Telugu"}
          className={`relative px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors
            disabled:opacity-50
            ${lang === l ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
        >
          {lang === l && (
            <motion.span
              layoutId="harbor-lang-pill"
              className="absolute inset-0 rounded-full bg-emerald-500"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative z-10">{l === "en" ? "EN" : "తె"}</span>
        </button>
      ))}
    </div>
  );
});
