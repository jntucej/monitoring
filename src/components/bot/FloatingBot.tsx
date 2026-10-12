"use client";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useBotStore } from "./store";
import { BotBoat } from "./BotBoat";
import { BotPanel } from "./BotPanel";
import { useAuthStore } from "@/stores/authStore";
import { playAudioFeedback } from "@/lib/sound";

export function FloatingBot() {
  const user = useAuthStore((s) => s.user);
  const open = useBotStore((s) => s.open);
  const toggleOpen = useBotStore((s) => s.toggleOpen);
  const setOpen = useBotStore((s) => s.setOpen);
  const messages = useBotStore((s) => s.messages);

  // Fix 7: hide FloatingBot when modal/sheet is open
  useEffect(() => {
    const body = document.body;
    if (open) {
      body.classList.add("floating-bot-open");
    } else {
      body.classList.remove("floating-bot-open");
    }
    return () => body.classList.remove("floating-bot-open");
  }, [open]);

  useEffect(() => {
    if (!user) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleOpen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user, toggleOpen]);

  if (!user) return null;

  const hasUnread = !open && messages.length > 0;

  return (
    <>
      <motion.button
        type="button"
        aria-label={open ? "Close Harbor" : "Open Harbor assistant"}
        aria-expanded={open}
        onClick={() => { toggleOpen(); playAudioFeedback("success"); }}
        className="fixed z-floating-bot bottom-5 right-5 h-14 w-14 rounded-full
                   bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-2xl
                   ring-1 ring-white/20 flex items-center justify-center
                   active:scale-95 transition
                   pointer-events-auto floating-bot-root"
        animate={{ y: open ? 0 : [0, -3, 0], scale: open ? 0.96 : 1 }}
        transition={{
          y: { duration: 3.2, repeat: open ? 0 : Infinity, ease: "easeInOut" },
          scale: { type: "spring" as const, stiffness: 340, damping: 22 },
        }}
        style={{ boxShadow: "0 10px 30px -10px rgba(16,185,129,0.7)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="x"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="h-6 w-6 text-white" />
            </motion.span>
          ) : (
            <motion.span
              key="boat"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
            >
              <BotBoat phase="idle" size={28} />
            </motion.span>
          )}
        </AnimatePresence>

        {hasUnread && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full
                       bg-rose-500 ring-2 ring-[var(--bg-surface)]"
          />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[69] bg-black/40 backdrop-blur-[2px] sm:hidden"
          />
        )}
      </AnimatePresence>

      <BotPanel />
    </>
  );
}
