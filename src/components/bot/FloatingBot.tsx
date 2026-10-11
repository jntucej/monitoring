"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send, Sparkles, Trash2, Mic, MicOff, Volume2, VolumeX, ThumbsUp, ThumbsDown } from "lucide-react";
import { useBotChat, type Msg, type Citation } from "./useBotChat";
import { BotBoat } from "./BotBoat";
import { VoiceWave } from "./VoiceWave";
import { LanguageToggle } from "./LanguageToggle";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { BOT_STRINGS } from "@/lib/i18n/bot-strings";
import { LANGS, type BotLang } from "@/lib/rag/config";
import { useAuthStore } from "@/stores/authStore";
import { playAudioFeedback } from "@/lib/sound";
import { getAuthHeaders } from "@/lib/utils";

export function FloatingBot() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<BotLang>((user as any)?.botLang === "te" ? "te" : "en");
  const [input, setInput] = useState("");
  const [voiceReplies, setVoiceReplies] = useState<boolean>(Boolean((user as any)?.botVoiceReplies));
  const [liveTranscript, setLiveTranscript] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const t = BOT_STRINGS[lang];
  const { messages, streaming, send, cancel, reset, setFeedback } = useBotChat(lang);
  const tts = useSpeechSynthesis(lang);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<string>("");

  const stt = useSpeechRecognition({
    lang,
    onPartial: setLiveTranscript,
    onFinal: (text) => {
      setLiveTranscript("");
      playAudioFeedback("success");
      void send(text, lang, (full) => {
        if (voiceReplies) tts.speak(full);
      });
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, liveTranscript]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ bot_lang: lang, bot_voice_replies: voiceReplies }),
    }).catch(() => {});
  }, [lang, voiceReplies, user]);

  const last = messages[messages.length - 1];
  useEffect(() => {
    if (!voiceReplies) return;
    if (!last || last.role !== "assistant") return;
    if (streaming) return;
    if (!last.content.trim()) return;
    if (lastSpokenRef.current === last.id) return;
    lastSpokenRef.current = last.id;
    tts.speak(last.content);
  }, [last, streaming, voiceReplies, tts]);

  useEffect(() => {
    if (stt.listening && tts.speaking) tts.stop();
  }, [stt.listening, tts]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  if (!user) return null;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    playAudioFeedback("success");
    void send(text, "auto", (full) => { if (voiceReplies) tts.speak(full); });
    setInput("");
  };

  const onChipClick = (prompt: string) => {
    playAudioFeedback("success");
    void send(prompt, "auto", (full) => { if (voiceReplies) tts.speak(full); });
  };

  const onMicClick = () => {
    if (stt.listening) {
      stt.stop();
    } else {
      playAudioFeedback("warning");
      stt.start();
    }
  };

  const toggleVoiceReplies = () => {
    if (!tts.supported) { setToast(t.ttsUnsupported); return; }
    const next = !voiceReplies;
    setVoiceReplies(next);
    if (!next) tts.stop();
  };

  const ttsMissingVoice = lang === "te" && !tts.hasVoiceForLang && tts.supported;

  return (
    <>
      <motion.button
        aria-label={open ? "Close Harbor" : "Open Harbor assistant"}
        onClick={() => { setOpen((v) => !v); playAudioFeedback("success"); }}
        className="fixed z-[60] bottom-5 right-5 h-14 w-14 rounded-full
                   bg-gradient-to-br from-emerald-500 to-cyan-600 shadow-2xl
                   ring-1 ring-white/20 flex items-center justify-center
                   active:scale-95 transition"
        animate={{ y: open ? 0 : [0, -3, 0] }}
        transition={{ duration: 3.2, repeat: open ? 0 : Infinity, ease: "easeInOut" }}
        style={{ boxShadow: "0 10px 30px -10px rgba(16,185,129,0.7)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="h-6 w-6 text-white" />
            </motion.span>
          ) : (
            <motion.span key="boat" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }}>
              <BotBoat open={false} speaking={tts.speaking} />
            </motion.span>
          )}
        </AnimatePresence>

        {!open && messages.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-[var(--bg-surface)]" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed z-[60] right-5 bottom-24 w-[min(94vw,420px)] h-[min(80vh,640px)]
                       rounded-2xl overflow-hidden flex flex-col
                       bg-[var(--bg-surface)] border border-[var(--border)]
                       shadow-2xl backdrop-blur-xl"
            role="dialog" aria-label="Harbor assistant"
          >
            <header className="flex items-center gap-3 px-3 py-3 border-b border-[var(--border)]">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shrink-0">
                <BotBoat open speaking={tts.speaking} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  {t.title}
                  {stt.listening && <VoiceWave active />}
                  {tts.speaking && <Volume2 className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  {stt.listening ? t.listening : tts.speaking ? t.speaking : streaming ? t.thinking : t.subtitle}
                </p>
              </div>

              <LanguageToggle lang={lang} onChange={(l) => { setLang(l); tts.stop(); }} />

              <button
                onClick={toggleVoiceReplies}
                title={t.voiceReplies}
                className={`p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition
                  ${voiceReplies ? "text-emerald-500" : "text-[var(--text-muted)]"}`}
              >
                {voiceReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>

              {messages.length > 0 && (
                <button onClick={() => { reset(); tts.stop(); }} className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)]" title={t.newChat}>
                  <Trash2 className="h-4 w-4 text-[var(--text-muted)]" />
                </button>
              )}
            </header>

            {(ttsMissingVoice && voiceReplies) && (
              <div className="px-3 py-2 text-[11px] bg-amber-500/10 text-amber-600 border-b border-[var(--border)]">
                {t.ttsUnsupported}
              </div>
            )}

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="pt-2">
                  <p className="text-xs text-[var(--text-muted)] mb-3 text-center">
                    {t.tryAsking}
                  </p>

                  <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                    {t.quickChips.map((c) => (
                      <button
                        key={c.label}
                        onClick={() => onChipClick(c.prompt)}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-[var(--border)]
                                   hover:bg-[var(--bg-elevated)] transition text-[var(--text-secondary)]"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-2">
                    {t.suggestions.map((s) => (
                      <button key={s} onClick={() => onChipClick(s)}
                        className="text-left text-xs px-3 py-2 rounded-lg border border-[var(--border)]
                                   hover:bg-[var(--bg-elevated)] transition text-[var(--text-secondary)]">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <Bubble key={m.id} m={m} lang={lang} onFeedback={setFeedback} thanksLabel={t.feedbackThanks} />
              ))}

              {stt.listening && (
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm
                                  bg-emerald-500/15 text-[var(--text-primary)] italic">
                    {liveTranscript || t.listening}
                  </div>
                </div>
              )}

              {streaming && (
                <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] px-1">
                  <Sparkles className="h-3 w-3 animate-pulse" /> {t.thinking}
                </div>
              )}
            </div>

            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                  className="mx-3 mb-2 rounded-lg bg-[var(--bg-elevated)] px-3 py-2 text-[11px] text-[var(--text-secondary)]"
                >
                  {toast}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={submit} className="border-t border-[var(--border)] p-2.5 flex items-end gap-1.5">
              <button
                type="button"
                onClick={onMicClick}
                disabled={!stt.supported}
                title={stt.supported ? t.listening : t.micUnsupported}
                className={`relative h-10 w-10 rounded-full flex items-center justify-center transition
                  ${!stt.supported ? "opacity-40 cursor-not-allowed" : ""}
                  ${stt.listening
                    ? "bg-rose-500 text-white shadow-lg"
                    : "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
              >
                {stt.listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                {stt.listening && (
                  <motion.span
                    className="absolute inset-0 rounded-full border-2 border-rose-500"
                    animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                  />
                )}
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
                }}
                rows={1}
                placeholder={t.placeholder}
                className="flex-1 resize-none bg-transparent outline-none text-sm px-2 py-2
                           max-h-32 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />

              {streaming ? (
                <button type="button" onClick={cancel}
                  className="h-10 px-3 rounded-lg bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)]">
                  {t.stop}
                </button>
              ) : (
                <button type="submit" disabled={!input.trim()}
                  className="h-10 w-10 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40
                             flex items-center justify-center transition">
                  <Send className="h-4 w-4 text-white" />
                </button>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Bubble({
  m, lang, onFeedback, thanksLabel,
}: {
  m: Msg; lang: BotLang;
  onFeedback: (id: string, f: -1 | 1) => void;
  thanksLabel: string;
}) {
  const isUser = m.role === "user";
  const cites = useMemo<Citation[]>(() => m.citations ?? [], [m.citations]);
  const [thanked, setThanked] = useState(false);

  const give = (f: -1 | 1) => {
    onFeedback(m.id, f);
    setThanked(true);
    playAudioFeedback(f === 1 ? "success" : "warning");
  };

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
        ${isUser
          ? "bg-emerald-500 text-white rounded-br-md"
          : "bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-bl-md"}`}>
        {m.content || <span className="opacity-50">…</span>}

        {!isUser && cites.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[var(--border)] space-y-1">
            {cites.map((c) => (
              <div key={c.n} className="text-[11px] text-[var(--text-muted)]">
                [{c.n}] {c.title}{c.source ? ` — ${c.source}` : ""}
                <span className="opacity-60"> · {(c.score * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        )}

        {!isUser && m.content && (
          <div className="mt-2 flex items-center gap-2">
            {!thanked ? (
              <>
                <button onClick={() => give(1)} className="text-[var(--text-muted)] hover:text-emerald-500 transition">
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => give(-1)} className="text-[var(--text-muted)] hover:text-rose-500 transition">
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <span className="text-[10px] text-[var(--text-muted)]">{thanksLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
