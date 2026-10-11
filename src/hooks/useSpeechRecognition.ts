"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BotLang } from "@/lib/rag/config";
import { LANGS } from "@/lib/rag/config";

interface SR extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function getCtor(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface UseSpeechRecognitionOpts {
  lang: BotLang;
  onFinal?: (transcript: string) => void;
  onPartial?: (transcript: string) => void;
  silenceMs?: number;
}

export function useSpeechRecognition({ lang, onFinal, onPartial, silenceMs = 1300 }: UseSpeechRecognitionOpts) {
  const supported = typeof window !== "undefined" && !!getCtor();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SR | null>(null);
  const finalRef = useRef("");
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSilence = () => { if (silenceRef.current) { clearTimeout(silenceRef.current); silenceRef.current = null; } };
  const armSilence = useCallback(() => {
    clearSilence();
    silenceRef.current = setTimeout(() => {
      try { recRef.current?.stop(); } catch {}
    }, silenceMs);
  }, [silenceMs]);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) { setError("unsupported"); return; }
    if (recRef.current) { try { recRef.current.abort(); } catch {} }

    const rec = new Ctor();
    rec.lang = LANGS[lang].stt;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    finalRef.current = "";

    rec.onstart = () => { setError(null); setListening(true); armSilence(); };
    rec.onresult = (e: any) => {
      armSilence();
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interim += r[0].transcript;
      }
      const shown = (finalRef.current + " " + interim).trim();
      onPartial?.(shown);
    };
    rec.onerror = (e: any) => {
      if (e?.error && e.error !== "no-speech" && e.error !== "aborted") setError(e.error);
    };
    rec.onend = () => {
      clearSilence();
      setListening(false);
      const text = finalRef.current.trim();
      if (text) onFinal?.(text);
    };

    recRef.current = rec;
    try { rec.start(); } catch {}
  }, [lang, onFinal, onPartial, armSilence]);

  const stop = useCallback(() => {
    clearSilence();
    try { recRef.current?.stop(); } catch {}
  }, []);

  useEffect(() => () => {
    clearSilence();
    try { recRef.current?.abort(); } catch {}
  }, []);

  return { supported, listening, error, start, stop };
}
