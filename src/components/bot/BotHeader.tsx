"use client";
import { memo } from "react";
import { Volume2, VolumeX, Trash2, X } from "lucide-react";
import { BotBoat } from "./BotBoat";
import { VoiceWave } from "./VoiceWave";
import { LanguageToggle } from "./LanguageToggle";
import type { BotStrings } from "@/lib/i18n/bot-strings";
import type { BotLang } from "@/lib/rag/config";

type Phase = "idle" | "listening" | "thinking" | "speaking";

interface Props {
  t: BotStrings;
  lang: BotLang;
  onLangChange: (l: BotLang) => void;
  phase: Phase;
  listening: boolean;
  speaking: boolean;
  streaming: boolean;
  hasMessages: boolean;
  voiceReplies: boolean;
  ttsSupported: boolean;
  onToggleVoiceReplies: () => void;
  onNewChat: () => void;
  onClose: () => void;
}

export const BotHeader = memo(function BotHeader({
  t, lang, onLangChange, phase, listening, speaking, streaming,
  hasMessages, voiceReplies, ttsSupported, onToggleVoiceReplies, onNewChat, onClose,
}: Props) {
  const subtitle =
    listening ? t.listening :
    speaking  ? t.speaking  :
    streaming ? t.thinking  :
    t.subtitle;

  return (
    <header className="relative z-10 flex items-center gap-2 p-3 border-b border-[var(--border)] bg-[var(--bg-elevated)]/95 backdrop-blur-sm">
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600
                      flex items-center justify-center shrink-0">
        <BotBoat phase={phase} size={26} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          {t.title}
          {listening && <VoiceWave active />}
          {speaking && <Volume2 className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] truncate">{subtitle}</p>
      </div>

      <LanguageToggle lang={lang} onChange={onLangChange} disabled={streaming} />

      <button
        onClick={onToggleVoiceReplies}
        disabled={!ttsSupported}
        aria-pressed={voiceReplies}
        title={voiceReplies ? t.voiceOff : t.voiceOn}
        className={`p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] transition active:scale-95
          disabled:opacity-40 disabled:cursor-not-allowed
          ${voiceReplies ? "text-emerald-500" : "text-[var(--text-muted)]"}`}
      >
        {voiceReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>

      {hasMessages && (
        <button
          onClick={onNewChat}
          aria-label={t.newChat}
          title={t.newChat}
          className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] active:scale-95 transition"
        >
          <Trash2 className="h-4 w-4 text-[var(--text-muted)]" />
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        aria-label={t.close}
        className="p-2 rounded-lg hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-95"
      >
        <X size={16} />
      </button>
    </header>
  );
});
