"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useBotStore } from "./store";
import { useBotChat } from "./useBotChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import { BOT_STRINGS } from "@/lib/i18n/bot-strings";
import { playAudioFeedback } from "@/lib/sound";
import { useApi } from "@/hooks/useApi";
import { useAuthStore } from "@/stores/authStore";
import { BotHeader } from "./BotHeader";
import { BotMessages } from "./BotMessages";
import { BotComposer } from "./BotComposer";

export function BotPanel() {
const api = useApi();

  const isMobile = useIsMobile();
  const vv = useVisualViewport();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const spokenRef = useRef<string>("");
  const lastUserQuestionRef = useRef<string>("");

  const open = useBotStore((s) => s.open);
  const setOpen = useBotStore((s) => s.setOpen);
  const lang = useBotStore((s) => s.lang);
  const setLang = useBotStore((s) => s.setLang);
  const voiceReplies = useBotStore((s) => s.voiceReplies);
  const setVoiceReplies = useBotStore((s) => s.setVoiceReplies);
  const messages = useBotStore((s) => s.messages);
  const streaming = useBotStore((s) => s.streaming);
  const error = useBotStore((s) => s.error);
  const reset = useBotStore((s) => s.reset);

  const t = BOT_STRINGS[lang];
  const { send, cancel, setFeedback } = useBotChat();
  const tts = useSpeechSynthesis(lang);

  const [input, setInput] = useState("");

  const stt = useSpeechRecognition({
    lang,
    onPartial: () => {},
    onFinal: (text) => {
      playAudioFeedback("success");
      void send(text, lang, (full) => {
        if (voiceReplies) tts.speak(full);
      });
    },
  });

  const last = messages[messages.length - 1];
  useEffect(() => {
    if (!voiceReplies) return;
    if (!last || last.role !== "assistant") return;
    if (streaming) return;
    if (last.status !== "done") return;
    if (!last.content.trim()) return;
    if (spokenRef.current === last.id) return;
    spokenRef.current = last.id;
    tts.speak(last.content);
  }, [last, streaming, voiceReplies, tts]);

  useEffect(() => {
    if (stt.listening && tts.speaking) tts.stop();
  }, [stt.listening, tts]);

  useEffect(() => {
    if (open && !isMobile) {
      setTimeout(() => inputRef.current?.focus(), 220);
    }
  }, [open, isMobile]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...api.getHeaders() },
      body: JSON.stringify({ bot_lang: lang, bot_voice_replies: voiceReplies }),
    }).catch(() => {});
  }, [lang, voiceReplies]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    playAudioFeedback("success");
    lastUserQuestionRef.current = text;
    void send(text, "auto", (full) => { if (voiceReplies) tts.speak(full); });
    setInput("");
  };

  const handleChip = (prompt: string) => {
    playAudioFeedback("success");
    lastUserQuestionRef.current = prompt;
    void send(prompt, "auto", (full) => { if (voiceReplies) tts.speak(full); });
  };

  const handleRetry = (text: string) => {
    const q = text || lastUserQuestionRef.current;
    if (!q) return;
    void send(q, "auto", (full) => { if (voiceReplies) tts.speak(full); });
  };

  const handleToggleMic = () => {
    if (stt.listening) {
      stt.stop();
    } else {
      if (!stt.supported) return;
      playAudioFeedback("warning");
      tts.stop();
      stt.start();
    }
  };

  const handleToggleVoiceReplies = () => {
    if (!tts.supported) return;
    const next = !voiceReplies;
    setVoiceReplies(next);
    if (!next) tts.stop();
  };

  const phase = stt.listening ? "listening"
              : tts.speaking   ? "speaking"
              : streaming      ? "thinking"
              : "idle";

  const keyboardOffset = isMobile ? vv.keyboardOffset : 0;

  const desktopVariants = {
    closed: { opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.18 } },
    open:   { opacity: 1, y: 0,  scale: 1,    transition: { type: "spring" as const, stiffness: 340, damping: 30 } },
  };
  const mobileVariants = {
    closed: { opacity: 0, y: "100%", transition: { duration: 0.22 } },
    open:   { opacity: 1, y: 0,      transition: { type: "spring" as const, stiffness: 300, damping: 34 } },
  };

  const panelStyle: React.CSSProperties = isMobile
    ? {
        height: `calc(100dvh - ${keyboardOffset}px)`,
        bottom: keyboardOffset,
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }
    : {};

  const variants = isMobile ? mobileVariants : desktopVariants;

  return (
    <motion.div
      key={isMobile ? "mobile" : "desktop"}
      initial="closed"
      animate={open ? "open" : "closed"}
      variants={variants}
      style={panelStyle}
      className={[
        "fixed z-[70] flex flex-col overflow-hidden",
        "bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl",
        isMobile
          ? "inset-x-0 bottom-0 rounded-t-2xl"
          : "right-5 bottom-24 w-[min(420px,calc(100vw-2.5rem))] h-[min(640px,calc(100vh-7rem))] rounded-2xl",
        open ? "" : "pointer-events-none",
        "backdrop-blur-xl",
      ].join(" ")}
      role="dialog"
      aria-label="Harbor assistant"
      aria-hidden={!open}
    >
      {isMobile && (
        <div className="pt-2 pb-1 flex justify-center" aria-hidden>
          <div className="h-1 w-10 rounded-full bg-[var(--border)]" />
        </div>
      )}

      <BotHeader
        t={t}
        lang={lang}
        onLangChange={(l) => { setLang(l); tts.stop(); }}
        phase={phase}
        listening={stt.listening}
        speaking={tts.speaking}
        streaming={streaming}
        hasMessages={messages.length > 0}
        voiceReplies={voiceReplies}
        ttsSupported={tts.supported}
        onToggleVoiceReplies={handleToggleVoiceReplies}
        onNewChat={() => { reset(); tts.stop(); }}
        onClose={() => setOpen(false)}
      />

      {(error || stt.error === "permission") && (
        <div className="px-3 py-2 text-[11px] bg-rose-500/10 text-rose-500 border-b border-[var(--border)]">
          {stt.error === "permission"
            ? "Microphone permission denied. Enable it in your browser settings to use voice."
            : error?.startsWith("HTTP 401")
              ? "Session expired. Please sign in again."
              : error?.startsWith("HTTP")
                ? t.errorNetwork
                : t.errorGeneric}
        </div>
      )}

      {!stt.supported && isMobile && (
        <div className="px-3 py-1.5 text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] border-b border-[var(--border)]">
          {t.micUnsupported}
        </div>
      )}

      <BotMessages
        t={t}
        onFeedback={setFeedback}
        onRetry={handleRetry}
        onChip={handleChip}
        interim={stt.interim}
        listening={stt.listening}
      />

      <BotComposer
        ref={inputRef}
        t={t}
        value={input}
        onChange={setInput}
        onSend={handleSend}
        onStop={cancel}
        listening={stt.listening}
        streaming={streaming}
        micSupported={stt.supported}
        onToggleMic={handleToggleMic}
      />
    </motion.div>
  );
}
