"use client";

import { motion } from "framer-motion";
import { Sun, Moon, Sparkles, Radio, MessageSquare } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useGlass } from "@/context/GlassContext";
import { useState, useEffect } from "react";
import { FeedbackModal } from "./FeedbackModal";

export interface GlassThemeToggleProps {
  isDark?: boolean;
  onToggle?: () => void;
  showCard?: boolean;
  className?: string;
}

export function GlassThemeToggle({ className = "" }: GlassThemeToggleProps) {
  const store = useUIStore();
  const { isLiveStream, toggleLiveStream, triggerLiveRefresh } = useGlass();
  const currentTheme = store.theme || "dark";
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastTheme, setLastTheme] = useState<string | null>(null);

  // Sync initial state defensively
  useEffect(() => {
    setLastTheme(currentTheme);
  }, []);

  const handleThemeChange = (newTheme: "dark" | "light" | "glass") => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.add("theme-transitioning");
      setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning");
      }, 300);
    }
    store.setTheme(newTheme);
    const last = localStorage.getItem("lastFeedbackTheme");
    if (last !== newTheme) {
      setLastTheme(newTheme);
      localStorage.setItem("lastFeedbackTheme", newTheme);
    }
  };

  const themes = [
    { id: "dark", icon: Moon, label: "Dark" },
    { id: "glass", icon: Sparkles, label: "Glossy Liquid" },
    { id: "light", icon: Sun, label: "Light" },
  ];

  return (
    <>
      <div className={`flex flex-row gap-2 items-center ${className}`}>
        {/* Segmented Control Track */}
        <div
          role="radiogroup"
          aria-label="Theme selection"
          className="flex items-center p-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] shadow-inner relative"
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
                className={`relative flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] rounded-full transition-colors z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${
                  isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                aria-label={`Switch to ${t.label} theme`}
              >
                {isActive && (
                  <motion.div
                    layoutId="theme-toggle-bubble"
                    className="absolute inset-0 bg-[var(--bg-surface)] rounded-full shadow-sm border border-[var(--border-strong)] z-0"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <Icon className="w-4 h-4 sm:w-4 sm:h-4 relative z-20" />
              </button>
            );
          })}
        </div>

        {/* Live Data Telemetry Refresh Toggle Pill */}
        <button
          onClick={() => {
            toggleLiveStream();
            triggerLiveRefresh();
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider transition-all border hidden sm:flex cursor-pointer ${
            isLiveStream
              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)] hover:bg-emerald-500/25"
              : "bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)]"
          }`}
          title="Toggle Real-Time Live Data Telemetry (Click to trigger sine wave loading & metric refresh)"
        >
          <Radio className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${isLiveStream ? "animate-pulse text-emerald-400" : ""}`} />
          <span className="hidden lg:inline">{isLiveStream ? "Live Data" : "Paused"}</span>
          {isLiveStream && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        {/* Feedback / Report Option */}
        <button
          onClick={() => setShowFeedback(true)}
          title="Report Theme Issue"
          className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors active:scale-95"
        >
          <MessageSquare className="w-4 h-4 sm:w-4 sm:h-4" />
        </button>
      </div>

      {showFeedback && (
        <FeedbackModal
          theme={lastTheme || currentTheme}
          onClose={() => setShowFeedback(false)}
          onSubmit={async (comment) => {
            try {
              await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ theme: lastTheme || currentTheme, comment }),
              });
            } catch (e) {
              console.error("Feedback submit error:", e);
            }
          }}
        />
      )}
    </>
  );
}

export default GlassThemeToggle;