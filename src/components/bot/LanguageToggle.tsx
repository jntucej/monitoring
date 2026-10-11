"use client";
import { motion } from "framer-motion";
import type { BotLang } from "@/lib/rag/config";

export function LanguageToggle({ lang, onChange }: { lang: BotLang; onChange: (l: BotLang) => void }) {
  return (
    <div className="inline-flex rounded-full bg-[var(--bg-elevated)] p-0.5 border border-[var(--border)]">
      {(["en", "te"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`relative px-2.5 py-1 text-[11px] font-medium rounded-full transition-colors
            ${lang === l ? "text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
        >
          {lang === l && (
            <motion.span
              layoutId="lang-pill"
              className="absolute inset-0 rounded-full bg-emerald-500"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative z-10">{l === "en" ? "EN" : "తె"}</span>
        </button>
      ))}
    </div>
  );
}
