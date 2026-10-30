"use client";

// src/components/operator/shared/OperatorThemeToggle.tsx
// Operator-specific copy of @/components/shared/GlassThemeToggle

import { motion } from "framer-motion";
import { Sun, Moon, Sparkles, MessageSquare } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useState, useEffect } from "react";

export interface OperatorThemeToggleProps {
  isDark?: boolean;
  onToggle?: () => void;
  showCard?: boolean;
  className?: string;
}

const FEEDBACK_THEME_STORAGE_KEY = "gate_monitor_theme_feedback_last";

export function OperatorThemeToggle({ className = "" }: OperatorThemeToggleProps) {
  const store = useUIStore();
  const currentTheme = store.theme || "dark";
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastTheme, setLastTheme] = useState<string | null>(null);

  // Sync initial state defensively
  useEffect(() => {
    setLastTheme(currentTheme);
  }, [currentTheme]);

  const handleThemeChange = (newTheme: "dark" | "light" | "glass") => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("theme-transitioning");
      setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning");
      }, 300);
    }
    store.setTheme(newTheme);
    try {
      if (typeof window !== "undefined") {
        const last = localStorage.getItem(FEEDBACK_THEME_STORAGE_KEY);
        if (last !== newTheme) {
          setLastTheme(newTheme);
          localStorage.setItem(FEEDBACK_THEME_STORAGE_KEY, newTheme);
        }
      }
    } catch {
      // Ignore storage restrictions if running in iframe / restricted mode
    }
  };

  const themes = [
    { id: "dark", icon: Moon, label: "Dark" },
    { id: "glass", icon: Sparkles, label: "Glossy" },
    { id: "light", icon: Sun, label: "Light" },
  ];

  return (
    <>
      <div className={`flex flex-row items-center gap-1.5 sm:gap-2 ${className}`}>
        {/* Segmented Control Track */}
        <div
          role="radiogroup"
          aria-label="Theme selection"
          className="flex items-center p-0.5 sm:p-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] shadow-inner relative shrink-0"
        >
          {themes.map((t) => {
            const isActive = currentTheme === t.id;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                role="radio"
                aria-checked={isActive}
                onClick={() => handleThemeChange(t.id as any)}
                className={`relative flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-full transition-colors z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                  isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                aria-label={`Switch to ${t.label} theme`}
              >
                {isActive && (
                  <motion.div
                    layoutId="operator-theme-toggle-bubble"
                    className="absolute inset-0 bg-[var(--bg-surface)] rounded-full shadow-sm border border-[var(--border-strong)] z-0"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-20" />
              </button>
            );
          })}
        </div>

        {/* Feedback / Report Option */}
        <button
          onClick={() => setShowFeedback(true)}
          title="Report Theme Issue"
          className="p-1 sm:p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors active:scale-95 shrink-0 hidden xs:flex items-center justify-center"
        >
          <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Report Theme Issue</h3>
            <p className="text-sm text-[var(--text-muted)]">
              If the {lastTheme || currentTheme} theme has visual issues, please describe them.
            </p>
            <textarea
              id="operator-theme-feedback"
              rows={4}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-base)] p-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--action-primary)]/40"
              placeholder="Describe the issue..."
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFeedback(false)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const comment = (document.getElementById("operator-theme-feedback") as HTMLTextAreaElement)?.value;
                    if (comment) {
                      await fetch("/api/feedback", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ theme: lastTheme || currentTheme, comment }),
                      });
                    }
                  } catch (e) {
                    console.error("Feedback submit error:", e);
                  }
                  setShowFeedback(false);
                }}
                className="rounded-lg bg-[var(--action-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default OperatorThemeToggle;
