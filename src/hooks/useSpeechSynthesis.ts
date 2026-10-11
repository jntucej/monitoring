"use client";
import { useCallback, useEffect, useState } from "react";
import type { BotLang } from "@/lib/rag/config";
import { LANGS } from "@/lib/rag/config";

export function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[(\d+)\]/g, "")
    .replace(/[*_>#-]+/g, " ")
    .replace(/\((?:https?:[^)]+)\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function useSpeechSynthesis(lang: BotLang) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;
    const refresh = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length) setVoices(v);
    };
    refresh();
    window.speechSynthesis.onvoiceschanged = refresh;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [supported]);

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    const target = LANGS[lang].tts.toLowerCase();
    const exact = voices.find((v) => v.lang.toLowerCase() === target);
    if (exact) return exact;
    const prefix = voices.find((v) => v.lang.toLowerCase().startsWith(target.slice(0, 2)));
    if (prefix) return prefix;
    if (lang === "te") return voices.find((v) => v.lang.toLowerCase().startsWith("en")) ?? null;
    return voices[0] ?? null;
  }, [lang, voices]);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (!supported) { onEnd?.(); return; }
    const cleaned = cleanForSpeech(text);
    if (!cleaned) { onEnd?.(); return; }

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleaned);
    u.lang = LANGS[lang].tts;
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = lang === "te" ? 0.95 : 1.02;
    u.pitch = 1.0;
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

  return { supported, speaking, speak, stop, hasVoiceForLang: !!pickVoice() };
}
