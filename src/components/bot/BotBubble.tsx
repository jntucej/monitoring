"use client";
import { memo, useState } from "react";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, AlertCircle, RotateCcw, Copy, RefreshCw } from "lucide-react";
import { MarkdownLite } from "./MarkdownLite";
import type { BotMsg } from "./store";
import { playAudioFeedback } from "@/lib/sound";

interface BubbleProps {
  m: BotMsg;
  onFeedback: (id: string, f: -1 | 1) => void;
  onRetry: (text: string) => void;
  thanksLabel: string;
  retryLabel: string;
}

export const BotBubble = memo(function BotBubble({
  m, onFeedback, onRetry, thanksLabel, retryLabel,
}: BubbleProps) {
  const isUser = m.role === "user";
  const cites = m.citations ?? [];
  const [thanked, setThanked] = useState(false);
  const isError = m.status === "error";
  const isStreaming = m.status === "streaming";
  // Feedback is only valid once the message has been persisted server-side
  // (dbId present) and is no longer streaming — clicking earlier would 404
  // on a dbId that doesn't exist yet.
  const canGiveFeedback = !isStreaming && !isError && !!m.dbId;

  const give = (f: -1 | 1) => {
    if (!canGiveFeedback || thanked) return;
    onFeedback(m.id, f);
    setThanked(true);
    playAudioFeedback(f === 1 ? "success" : "warning");
  };

  const retryThis = () => {
    onRetry(m.__retryOf ?? "");
  };

  return (
    <motion.div
      layout="position"
      data-msg-id={m.id}
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className={isUser ? "flex justify-end" : "flex justify-start"}
    >
      <div className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed
        ${isUser
          ? "bg-emerald-500 text-white rounded-br-md"
          : isError
            ? "bg-rose-500/10 border border-rose-500/30 text-[var(--text-primary)] rounded-bl-md"
            : "bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-bl-md"}`}
      >
        {isError && (
          <div className="flex items-center gap-1.5 mb-1.5 text-rose-500 text-xs font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Error</span>
          </div>
        )}

        <div className="break-words">
          {m.content ? (
            isUser ? (
              <div className="whitespace-pre-wrap">{m.content}</div>
            ) : (
              <MarkdownLite content={m.content} />
            )
          ) : isStreaming ? (
            <span className="inline-flex items-center gap-1 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
            </span>
          ) : null}
        </div>

        {!isUser && cites.length > 0 && !isStreaming && (
          <div className="mt-2 pt-2 border-t border-[var(--border)] space-y-1">
            {cites.map((c) => (
              <div key={c.n} className="text-[11px] text-[var(--text-muted)] leading-snug">
                <span className="font-medium text-[var(--text-secondary)]">[{c.n}]</span>{" "}
                {c.title}{c.source ? ` — ${c.source}` : ""}
                <span className="opacity-60"> · {(c.score * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}

        {!isUser && !isStreaming && m.content && (
          <div className="mt-2 flex items-center gap-2">
            {isError ? (
              <button
                onClick={retryThis}
                className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-emerald-500 transition"
              >
                <RotateCcw className="h-3 w-3" /> {retryLabel}
              </button>
            ) : (
              <>
                {/* Regenerate — same question, new answer (not a new user
                    message). Distinct from retry, which re-sends the
                    question after an error. */}
                <button
                  onClick={() => onRetry(m.__retryOf ?? "")}
                  aria-label="Regenerate response"
                  title="Regenerate"
                  className="text-[var(--text-muted)] hover:text-emerald-500 transition active:scale-95"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
                {/* Copy — the most-requested assistant feature: quoting an
                    answer into a ticket or email. */}
                <button
                  onClick={() => void navigator.clipboard.writeText(m.content)}
                  aria-label="Copy response"
                  title="Copy"
                  className="text-[var(--text-muted)] hover:text-emerald-500 transition active:scale-95"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                {canGiveFeedback && (
                <>
                <button
                    aria-label="Good response"
                    aria-pressed={m.feedback === 1}
                    onClick={() => give(1)}
                    className="text-[var(--text-muted)] hover:text-emerald-500 transition active:scale-95"
                  >
                    <ThumbsUp aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    aria-label="Poor response"
                    aria-pressed={m.feedback === -1}
                    onClick={() => give(-1)}
                    className="text-[var(--text-muted)] hover:text-rose-500 transition active:scale-95"
                  >
                    <ThumbsDown aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </>
                )}
                {thanked && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] text-[var(--text-muted)]"
                  >
                    {thanksLabel}
                  </motion.span>
                )}
              </>
            )}
            {!thanked && !isError && !canGiveFeedback && (
              <span className="text-[10px] text-[var(--text-muted)] opacity-60">Offline</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});
