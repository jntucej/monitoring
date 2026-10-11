"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BotLang } from "@/lib/rag/config";
import { LANGS } from "@/lib/rag/config";

export function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[(\d+)\]/g, "")
    .replace(/[*_>#]+/g, " ")
    .replace(/\((?:https?:[^)]+)\)/g, "")
    .replace(/-\s+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function useSpeechSynthesis(lang: BotLang) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;
    const refresh = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length) { voicesRef.current = v; setVoices(v); }
    };
    refresh();
    window.speechSynthesis.onvoiceschanged = refresh;
    const t = setTimeout(refresh, 500);
    const t2 = setTimeout(refresh, 2000);
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      clearTimeout(t); clearTimeout(t2);
    };
  }, [supported]);

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    const target = LANGS[lang].tts.toLowerCase();
    const list = voicesRef.current;
    if (!list.length) return null;
    const exact = list.find((v) => v.lang.toLowerCase() === target);
    if (exact) return exact;
    const prefix = target.slice(0, 2);
    const prefixMatch = list.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (prefixMatch) return prefixMatch;
    if (lang === "te") return list.find((v) => v.lang.toLowerCase().startsWith("hi"))
                            ?? list.find((v) => v.lang.toLowerCase().startsWith("en"))
                            ?? list[0] ?? null;
    return list[0] ?? null;
  }, [lang]);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!supported) { onEnd?.(); return; }
    const cleaned = cleanForSpeech(text);
    if (!cleaned) { onEnd?.(); return; }

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleaned);
    u.lang = LANGS[lang].tts;
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = lang === "te" ? 0.94 : 1.03;
    u.pitch = 1.0;
    u.volume = 1.0;
    u.onstart = () => setSpeaking(true);
    u.onend = () => { setSpeaking(false); onEnd?.(); };
    u.onerror = () => { setSpeaking(false); onEnd?.(); };
    window.speechSynthesis.speak(u);
  }, [lang, supported, pickVoice]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const hasVoiceForLang = !!pickVoice();

  return { supported, speaking, speak, stop, hasVoiceForLang, voices };
}
