"use client";
import { forwardRef, memo, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Mic, MicOff, Square, Loader2 } from "lucide-react";
import type { BotStrings } from "@/lib/i18n/bot-strings";

interface Props {
  t: BotStrings;
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  listening: boolean;
  streaming: boolean;
  micSupported: boolean;
  onToggleMic: () => void;
  /** Seconds remaining before the mic hard-caps its recording (null = no countdown showing). */
  micRemainingSeconds?: number | null;
}

export const BotComposer = memo(forwardRef<HTMLTextAreaElement, Props>(function BotComposer(
  { t, value, onChange, onSend, onStop, listening, streaming, micSupported, onToggleMic, micRemainingSeconds },
  ref,
) {
  const localRef = useRef<HTMLTextAreaElement>(null);
  // Elapsed-seconds counter for the "Generating…" indicator — so the
  // user knows the stream is still alive when the LLM is slow, and
  // can hit Stop (kept right beside the timer) without guessing.
  const [streamingSeconds, setStreamingSeconds] = useState(0);
  useEffect(() => {
    if (!streaming) { setStreamingSeconds(0); return; }
    const t0 = Date.now();
    const iv = setInterval(() => setStreamingSeconds(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [streaming]);
  useEffect(() => {
    const el = (ref as any)?.current ?? localRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }, [value, ref]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (streaming) return;
    onSend();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !(e.nativeEvent as any).isComposing) {
      e.preventDefault();
      submit(e as unknown as React.FormEvent);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="border-t border-border p-2.5 flex items-end gap-1.5
                 bg-bg-surface/80 backdrop-blur-md"
      style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <button
        type="button"
        onClick={onToggleMic}
        disabled={!micSupported || streaming}
        title={micSupported ? t.listening : t.micUnsupported}
        aria-label={listening ? "Stop listening" : "Start voice input"}
        aria-pressed={listening}
        className={`relative h-10 w-10 shrink-0 rounded-full flex items-center justify-center transition
          disabled:opacity-40 disabled:cursor-not-allowed active:scale-95
          ${listening
            ? "bg-action-danger text-white shadow-lg"
            : "bg-bg-elevated text-text-secondary hover:text-text-primary"}`}
      >
        {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        {listening && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-action-danger"
            animate={{ scale: [1, 1.4], opacity: [0.7, 0] }}
            transition={{ duration: 1.1, repeat: Infinity }}
          />
        )}
        {listening && micRemainingSeconds != null && (
          <span
            className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 rounded-full bg-action-danger text-white text-xs font-semibold flex items-center justify-center leading-none"
            aria-label={`${micRemainingSeconds} seconds remaining`}
          >
            {micRemainingSeconds}
          </span>
        )}
      </button>

      <textarea
        ref={(el) => {
          localRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) (ref as any).current = el;
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={1}
        placeholder={t.placeholder}
        aria-label={t.placeholder}
        enterKeyHint="send"
        className="flex-1 resize-none bg-transparent outline-none text-sm px-2 py-2.5
                   max-h-32 text-text-primary placeholder:text-text-muted
                   [scrollbar-width:thin]"
      />

      {streaming ? (
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-text-muted" role="status" aria-live="polite">
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            <span className="whitespace-nowrap">Generating… {streamingSeconds}s</span>
          </div>
          <button
            type="button"
            onClick={onStop}
            aria-label={t.stop}
            className="h-8 px-2.5 rounded-lg bg-bg-elevated text-xs text-text-secondary
                       active:scale-95 transition inline-flex items-center gap-1"
          >
            <Square className="h-3 w-3 fill-current" /> {t.stop}
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!value.trim()}
          aria-label={t.send}
          className="h-10 w-10 shrink-0 rounded-lg bg-action-success hover:bg-action-success
                     disabled:opacity-40 disabled:cursor-not-allowed
                     flex items-center justify-center transition active:scale-95"
        >
          <Send className="h-4 w-4 text-white" />
        </button>
      )}
    </form>
  );
}));
