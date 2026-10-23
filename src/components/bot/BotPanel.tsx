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

import dynamic from "next/dynamic";

// The listening-visualisation canvas bundles three + @react-three/fiber
// (heavy WebGL). It must not block the initial render of every page, so
// load it only when the user actually opens the bot panel.
const ListeningParticles = dynamic(() => import("./ListeningParticles").then((m) => m.ListeningParticles), {
  ssr: false,
});

export function BotPanel() {
  const api = useApi();
  const isMobile = useIsMobile();
  const vv = useVisualViewport();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastSpokenRef = useRef<string | null>(null);
  const lastUserQuestionRef = useRef<string>("");

  const open = useBotStore((s) => s.open);
  const setOpen = useBotStore((s) => s.setOpen);
  const lang = useBotStore((s) => s.lang);
  const setLang = useBotStore((s) => s.setLang);
  const voiceReplies = useBotStore((s) => s.voiceReplies);
  const setVoiceReplies = useBotStore((s) => s.setVoiceReplies);
  const voiceMode = useBotStore((s) => s.voiceMode);
  const clearVoiceMode = useBotStore((s) => s.clearVoiceMode);
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
      const trimmed = text.trim();
      if (!trimmed) return;
      playAudioFeedback("success");
      lastUserQuestionRef.current = trimmed;
      void send(trimmed, "auto", (full) => {
        if (voiceReplies) tts.speak(full);
      });
      clearVoiceMode();
    },
  });

  // Auto-start listening when long-press voice mode fires
  useEffect(() => {
    if (voiceMode && open && !stt.listening && stt.supported) {
      stt.start();
      playAudioFeedback("warning");
    }
  }, [voiceMode, open, stt.listening, stt.supported, stt.start]);

  // Auto-speak assistant responses when voiceReplies is on
  const lastAssistant = [...messages].reverse().find(
    (m) => m.role === "assistant" && m.status === "done"
  );
  useEffect(() => {
    if (!voiceReplies || !lastAssistant || tts.speaking) return;
    if (lastSpokenRef.current === lastAssistant.id) return;
    lastSpokenRef.current = lastAssistant.id;
    if (lastAssistant.content.trim()) {
      tts.speak(lastAssistant.content);
    }
  }, [voiceReplies, lastAssistant, tts.speaking, tts.speak]);

  // Stop TTS if user speaks
  useEffect(() => {
    if (stt.listening && tts.speaking) tts.stop();
  }, [stt.listening, tts]);

  // Auto-focus input on desktop
  useEffect(() => {
    if (open && !isMobile && !voiceMode) {
      setTimeout(() => inputRef.current?.focus(), 220);
    }
  }, [open, isMobile, voiceMode]);

  // Escape key closes and clears speech
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (stt.listening) stt.stop();
        clearVoiceMode();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, stt.listening, stt.stop, clearVoiceMode, setOpen]);

  // Persist language and voice settings
  useEffect(() => {
    const user = useAuthStore.getState().user;
    if (!user) return;
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...api.getHeaders() },
      body: JSON.stringify({ bot_lang: lang, bot_voice_replies: voiceReplies }),
    }).catch(() => {});
  }, [lang, voiceReplies, api]);

  const handleSend = () => {
    if (voiceMode) clearVoiceMode();
    const text = input.trim();
    if (!text) return;
    playAudioFeedback("success");
    lastUserQuestionRef.current = text;
    void send(text, "auto", (full) => { if (voiceReplies) tts.speak(full); });
    setInput("");
  };

  const handleChip = (prompt: string) => {
    if (voiceMode) clearVoiceMode();
    playAudioFeedback("success");
    lastUserQuestionRef.current = prompt;
    void send(prompt, "auto", (full) => { if (voiceReplies) tts.speak(full); });
  };

  const handleRetry = (text: string) => {
    if (voiceMode) clearVoiceMode();
    const q = text || lastUserQuestionRef.current;
    if (!q) return;
    void send(q, "auto", (full) => { if (voiceReplies) tts.speak(full); });
  };

  const handleToggleMic = () => {
    if (stt.listening) {
      stt.stop();
      clearVoiceMode();
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

  // Reconcile server-side state on every open:
  //  1. hydrate lang / voiceReplies from the caller's profile (the store's
  //     localStorage cache is only the fast-path render; the server is the
  //     source of truth, so a shared browser / fresh tab still gets the
  //     user's saved settings).
  //  2. load the current conversation so a hard refresh does not wipe the
  //     chat history — the bot "remembers" across refreshes and tabs.
  //  3. if a stream was still in flight when the panel last closed, mark
  //     the draft errored and clear the stuck streaming flag.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!open || hydratedRef.current) return;
    hydratedRef.current = true;
    let cancelled = false;
    const user = useAuthStore.getState().user;
    const token = useAuthStore.getState().token;
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (user) {
      fetch("/api/profile", { headers, cache: "no-store" })
        .then((r) => r.ok ? r.json() : null)
        .then((j) => {
          if (cancelled || !j?.success) return;
          const s = useBotStore.getState();
          if (j.data?.botLang === "en" || j.data?.botLang === "te") s.setLang(j.data.botLang);
          if (typeof j.data?.botVoiceReplies === "boolean") s.setVoiceReplies(j.data.botVoiceReplies);
        })
        .catch(() => {});
    }
    fetch("/api/bot/session/current", { headers, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.success || !Array.isArray(j.data?.messages)) return;
        const s = useBotStore.getState();
        s.setMessages(j.data.messages);
        s.setConversationId(j.data.conversationId ?? null);
      })
      .catch(() => {});
    const st = useBotStore.getState();
    if (st.streaming) {
      st.messages
        .filter((m) => m.status === "streaming")
        .forEach((m) => st.setDraftStatus(m.id, "error"));
      st.setStreaming(false);
    }
    return () => { cancelled = true; };
  }, [open]);

  const handleClose = () => {
    if (stt.listening) stt.stop();
    tts.stop();
    clearVoiceMode();
    setOpen(false);
  };

  const phase = stt.listening ? "listening"
              : tts.speaking   ? "speaking"
              : streaming      ? "thinking"
              : "idle";

  const keyboardOffset = isMobile ? vv.keyboardOffset : 0;

  const desktopVariants = {
    closed: { opacity: 0, y: 20, scale: 0.96, transition: { duration: 0.18 } },
    open:   { opacity: 1, y: 0,  scale: 1,    transition: { type: "spring" as const, stiffness: 320, damping: 30 } },
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
        "fixed z-[100] flex flex-col overflow-hidden",
        "bg-[var(--bg-elevated)]/98 backdrop-blur-2xl border border-[var(--border)] shadow-[0_24px_64px_rgba(0,0,0,0.5)]",
        "mb-[env(safe-area-inset-bottom)]",
        isMobile
          ? "inset-x-0 bottom-0 rounded-t-2xl"
          : "right-4 bottom-4 w-[380px] max-w-[calc(100vw-2rem)] h-[min(640px,80vh)] rounded-2xl",
        open ? "" : "pointer-events-none",
      ].join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      aria-hidden={!open}
    >
      <ListeningParticles active={stt.listening} />

      {isMobile && (
        <div className="pt-2 pb-1 flex justify-center relative z-10" aria-hidden>
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
        onClose={handleClose}
      />

      {(error || stt.error === "permission") && (
        <div className="relative z-10 px-3 py-2 text-[11px] bg-rose-500/10 text-rose-500 border-b border-[var(--border)]">
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
        <div className="relative z-10 px-3 py-1.5 text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] border-b border-[var(--border)]">
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
