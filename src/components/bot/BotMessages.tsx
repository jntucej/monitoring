"use client";
import { memo, useEffect, useRef, useState } from "react";
import { Sparkles, ArrowDown } from "lucide-react";
import { useBotStore, type BotMsg } from "./store";
import { BotBubble } from "./BotBubble";
import { BotWelcome } from "./BotWelcome";
import { roleWelcome } from "./role-welcome";
import type { Role } from "@/lib/types";
import type { BotStrings } from "@/lib/i18n/bot-strings";

interface Props {
  t: BotStrings;
  onFeedback: (id: string, f: -1 | 1) => void;
  onRetry: (text: string) => void;
  onChip: (prompt: string) => void;
  interim: string;
  listening: boolean;
  /** The authenticated user's role — drives the role-specific welcome
      subtitle + suggestion chips (see role-welcome.ts). */
  role?: Role | null;
  /** Called when the user scrolls to the top and older pages exist. */
  onScrollToTop?: () => void;
  /** While a "load older" request is in flight — shows a spinner at the top. */
  loadingOlder?: boolean;
}

function useStickToBottom(deps: unknown[], ref: React.RefObject<HTMLDivElement | null>) {
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setPinned(dist < 60);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [ref]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !pinned) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [deps, pinned, ref]);

  const scrollToBottom = () => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  return { ref, pinned, scrollToBottom };
}

export const BotMessages = memo(function BotMessages({
  t, onFeedback, onRetry, onChip, interim, listening, role, onScrollToTop, loadingOlder,
}: Props) {
  const messages = useBotStore((s) => s.messages);
  const streaming = useBotStore((s) => s.streaming);
  const lastLen = messages.length;
  const lastContent = messages[messages.length - 1]?.content ?? "";
  const scrollRef = useRef<HTMLDivElement>(null);
  const { pinned, scrollToBottom } = useStickToBottom([lastLen, lastContent, interim], scrollRef);

  const prevUserQuestion = (idx: number): string => {
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].content;
    }
    return "";
  };

  // Prepend-older-pages: when the user reaches the top and older history
  // still exists, fetch the previous page and re-anchor scroll so the view
  // doesn't jump to the bottom.
  const anchorEl = useRef<HTMLElement | null>(null);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop < 40 && onScrollToTop && !loadingOlder) {
      // Capture the current first visible message so we can restore
      // relative position after the older page is prepended.
      const first = el.querySelector("[data-msg-id]") as HTMLElement | null;
      anchorEl.current = first;
      onScrollToTop();
    }
  };
  // After a prepend completes, the store's messages array grows — restore
  // scroll position anchored to the previously-first message.
  const [prevLen, setPrevLen] = useState(lastLen);
  useEffect(() => {
    if (lastLen > prevLen && anchorEl.current) {
      const el = scrollRef.current;
      if (!el) return;
      const id = anchorEl.current.getAttribute("data-msg-id");
      const prevEl = id ? document.getElementById(id) : null;
      const prevTop = prevEl ? prevEl.offsetTop : 0;
      requestAnimationFrame(() => {
        el.scrollTop = prevTop - 10;
      });
      anchorEl.current = null;
    }
    setPrevLen(lastLen);
  }, [lastLen, prevLen]);

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        className="h-full overflow-y-auto overscroll-contain px-3 py-3 space-y-3
                   [scrollbar-width:thin] custom-scrollbar"
      >
        {loadingOlder && (
          <div className="flex justify-center py-1" role="status" aria-live="polite">
            <span className="h-3.5 w-3.5 rounded-full border-2 bordertext-muted border-t-transparent animate-spin" />
          </div>
        )}
        {messages.length === 0 && (
          <BotWelcome t={t} onChip={onChip} disabled={streaming} welcome={roleWelcome(role ?? null)} />
        )}

        {messages.map((m, i) => {
          const withRetry: BotMsg = m.status === "error"
            ? { ...m, __retryOf: prevUserQuestion(i) } as BotMsg
            : m;
          return (
            <BotBubble
              key={m.id}
              m={withRetry}
              onFeedback={onFeedback}
              onRetry={onRetry}
              thanksLabel={t.feedbackThanks}
              retryLabel={t.retry}
            />
          );
        })}

        {listening && (
          <div className="flex justify-end">
            <div className="max-w-[88%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm
                            bg-emerald-500/15 text-text-primary italic">
              {interim || t.listening}
              <span className="ml-1 animate-pulse">▍</span>
            </div>
          </div>
        )}

        {streaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted px-1">
            <Sparkles className="h-3 w-3 animate-pulse" /> {t.thinking}
          </div>
        )}
      </div>

      {!pinned && messages.length > 0 && (
        <button
          onClick={scrollToBottom}
          aria-label="Scroll to latest"
          className="absolute bottom-3 right-3 h-8 w-8 rounded-full
                     bg-bg-elevated border border-border
                     flex items-center justify-center shadow-lg active:scale-95 transition"
        >
          <ArrowDown className="h-4 w-4 text-text-secondary" />
        </button>
      )}
    </div>
  );
});
