"use client";
import { memo, useEffect, useRef, useState } from "react";
import { Sparkles, ArrowDown } from "lucide-react";
import { useBotStore, type BotMsg } from "./store";
import { BotBubble } from "./BotBubble";
import { BotWelcome } from "./BotWelcome";
import type { BotStrings } from "@/lib/i18n/bot-strings";

interface Props {
  t: BotStrings;
  onFeedback: (id: string, f: -1 | 1) => void;
  onRetry: (text: string) => void;
  onChip: (prompt: string) => void;
  interim: string;
  listening: boolean;
}

function useStickToBottom(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
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
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !pinned) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [deps, pinned]);

  const scrollToBottom = () => {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  return { ref, pinned, scrollToBottom };
}

export const BotMessages = memo(function BotMessages({
  t, onFeedback, onRetry, onChip, interim, listening,
}: Props) {
  const messages = useBotStore((s) => s.messages);
  const streaming = useBotStore((s) => s.streaming);
  const lastLen = messages.length;
  const lastContent = messages[messages.length - 1]?.content ?? "";
  const { ref, pinned, scrollToBottom } = useStickToBottom([lastLen, lastContent, interim]);

  const prevUserQuestion = (idx: number): string => {
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i].content;
    }
    return "";
  };

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={ref}
        className="h-full overflow-y-auto overscroll-contain px-3 py-3 space-y-3
                   [scrollbar-width:thin] custom-scrollbar"
      >
        {messages.length === 0 && (
          <BotWelcome t={t} onChip={onChip} disabled={streaming} />
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
                            bg-emerald-500/15 text-[var(--text-primary)] italic">
              {interim || t.listening}
            </div>
          </div>
        )}

        {streaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] px-1">
            <Sparkles className="h-3 w-3 animate-pulse" /> {t.thinking}
          </div>
        )}
      </div>

      {!pinned && messages.length > 0 && (
        <button
          onClick={scrollToBottom}
          aria-label="Scroll to latest"
          className="absolute bottom-3 right-3 h-8 w-8 rounded-full
                     bg-[var(--bg-elevated)] border border-[var(--border)]
                     flex items-center justify-center shadow-lg active:scale-95 transition"
        >
          <ArrowDown className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
      )}
    </div>
  );
});
