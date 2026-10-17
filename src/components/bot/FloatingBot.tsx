"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useBotStore } from "./store";
import { BotBoat } from "./BotBoat";
import { BotPanel } from "./BotPanel";
import { useAuthStore } from "@/stores/authStore";
import { playAudioFeedback } from "@/lib/sound";

const DRAG_POS_KEY = "gate-harbor-bot-position";

/**
 * Freely-movable floating "Harbor" assistant.
 * - Drag anywhere on screen (free movement, clamped to the viewport).
 * - Single click (no drag) opens/closes the panel.
 * - Position persists in localStorage so it survives navigation.
 */
export function FloatingBot() {
  const user = useAuthStore((s) => s.user);
  const open = useBotStore((s) => s.open);
  const toggleOpen = useBotStore((s) => s.toggleOpen);
  const setOpen = useBotStore((s) => s.setOpen);
  const messages = useBotStore((s) => s.messages);

  // ── Movable position ───────────────────────────────────────────────────────
  // Persisted as {x, y} from the top-left of the viewport. A null position
  // means "pin bottom-right" (the default). We track a `pos` that is either
  // null (default) or a concrete offset.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  // Restore persisted position on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAG_POS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p.x === "number" && typeof p.y === "number") setPos({ x: p.x, y: p.y });
      }
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  const clamp = (x: number, y: number) => {
    const size = 56; // 14 × 56px icon
    const maxX = Math.max(0, window.innerWidth - size);
    const maxY = Math.max(0, window.innerHeight - size);
    return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const base = pos ?? { x: 0, y: 0 };
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: base.x,
      baseY: base.y,
    };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos(clamp(dragRef.current.baseX + dx, dragRef.current.baseY + dy));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const ref = dragRef.current;
    const moved = ref
      ? Math.abs(e.clientX - ref.startX) + Math.abs(e.clientY - ref.startY)
      : 0;
    const wasDragging = dragging;
    if (wasDragging && pos) {
      try {
        localStorage.setItem(DRAG_POS_KEY, JSON.stringify(pos));
      } catch {
        /* storage may be unavailable */
      }
    }
    setDragging(false);
    dragRef.current = null;
    if (moved < 6) {
      toggleOpen();
      playAudioFeedback("success");
    }
  };

  const onPointerCancel = () => {
    setDragging(false);
    dragRef.current = null;
  };

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
        style={{
          // Default: pinned bottom-right. Once dragged, position is absolute.
          left: pos ? pos.x : undefined,
          top: pos ? pos.y : undefined,
          right: pos ? undefined : 20,
          bottom: pos ? undefined : 20,
          boxShadow: "0 10px 30px -10px rgba(16,185,129,0.7)",
          cursor: dragging ? "grabbing" : "grab",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="fixed z-floating-bot h-14 w-14 rounded-full
                   bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-2xl
                   ring-1 ring-white/20 flex items-center justify-center
                   transition
                   pointer-events-auto floating-bot-root touch-none select-none"
        animate={{ y: open ? 0 : [0, -3, 0], scale: dragging ? 1.08 : open ? 0.96 : 1 }}
        transition={{
          y: { duration: 3.2, repeat: dragging ? 0 : open ? 0 : Infinity, ease: "easeInOut" },
          scale: { type: "spring" as const, stiffness: 340, damping: 22 },
        }}
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
