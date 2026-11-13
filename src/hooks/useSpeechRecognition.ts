"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BotLang } from "@/lib/rag/config";
import { LANGS } from "@/lib/rag/config";

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResultEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent {
  error?: string;
}
interface SR extends EventTarget {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
}

interface SpeechRecognitionCtor {
  new (): SR;
}

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export interface UseSpeechRecognitionOpts {
  lang: BotLang;
  onFinal?: (transcript: string) => void;
  onPartial?: (transcript: string) => void;
  silenceMs?: number;
  maxDurationMs?: number;
}

export function useSpeechRecognition({
  lang, onFinal, onPartial, silenceMs = 1400, maxDurationMs = 30_000,
}: UseSpeechRecognitionOpts) {
  const supported = typeof window !== "undefined" && !!getCtor();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interim, setInterim] = useState("");
  // Countdown (seconds) shown in the last few seconds of a hard-capped
  // recording, so the user knows the mic will stop at 0 instead of
  // silently cutting off mid-sentence.
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const recRef = useRef<SR | null>(null);
  const finalRef = useRef("");
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hardTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const onFinalRef = useRef(onFinal);
  const onPartialRef = useRef(onPartial);
  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onPartialRef.current = onPartial; }, [onPartial]);

  const clearTimers = useCallback(() => {
    if (silenceTimer.current) { clearTimeout(silenceTimer.current); silenceTimer.current = null; }
    if (hardTimer.current) { clearTimeout(hardTimer.current); hardTimer.current = null; }
    if (countdownTimer.current) { clearInterval(countdownTimer.current); countdownTimer.current = null; }
    setRemainingSeconds(null);
  }, []);

  const armSilence = useCallback(() => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(() => {
      try { recRef.current?.stop(); } catch {}
    }, silenceMs);
  }, [silenceMs]);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) { setError("unsupported"); return; }

    try { recRef.current?.abort(); } catch {}
    clearTimers();

    const rec = new Ctor();
    rec.lang = LANGS[lang].stt;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    finalRef.current = "";
    setInterim("");
    setError(null);

    rec.onstart = () => setListening(true);

    rec.onresult = (e) => {
      armSilence();
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interimText += r[0].transcript;
      }
      const shown = interimText.trim();
      setInterim(shown);
      onPartialRef.current?.(shown);
    };

    rec.onerror = (e) => {
      const err = e?.error;
      if (err === "no-speech" || err === "aborted") return;
      if (err === "not-allowed" || err === "service-not-allowed") {
        setError("permission"); return;
      }
      setError(err || "error");
    };

    rec.onend = () => {
      clearTimers();
      setListening(false);
      const text = finalRef.current.trim();
      setInterim("");
      if (text) onFinalRef.current?.(text);
    };

    recRef.current = rec;
    try {
      rec.start();
      const startedAt = Date.now();
      hardTimer.current = setTimeout(() => {
        try { recRef.current?.stop(); } catch {}
      }, maxDurationMs);
      // Countdown: show the last 5 seconds (or the whole window if under
      // 5s) so a silent cutoff is never silent.
      const COUNTDOWN_FROM = Math.min(5000, maxDurationMs);
      countdownTimer.current = setInterval(() => {
        const elapsedMs = Date.now() - startedAt;
        const remaining = Math.max(0, maxDurationMs - elapsedMs);
        setRemainingSeconds(remaining <= COUNTDOWN_FROM ? Math.ceil(remaining / 1000) : null);
        if (remaining <= 0) {
          clearInterval(countdownTimer.current as ReturnType<typeof setInterval>);
          countdownTimer.current = null;
        }
      }, 250);
    } catch {
      setError("start-failed");
      setListening(false);
    }
  }, [lang, armSilence, clearTimers, maxDurationMs]);

  const stop = useCallback(() => {
    clearTimers();
    try { recRef.current?.stop(); } catch {}
  }, [clearTimers]);

  useEffect(() => () => {
    clearTimers();
    try { recRef.current?.abort(); } catch {}
  }, [clearTimers]);

  return { supported, listening, error, interim, remainingSeconds, start, stop };
}
