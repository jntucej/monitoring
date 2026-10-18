"use client";

import { useEffect, useState } from "react";
import { CHAPTERS, type ChapterId } from "../story/data";

export interface GenerativePayload {
  chapterOrder: ChapterId[];
  tone: "warm" | "urgent" | "calm";
  ready: boolean;
}

const DEFAULT_PAYLOAD: GenerativePayload = {
  chapterOrder: CHAPTERS.map((c) => c.id),
  tone: "calm",
  ready: false,
};

function isValidChapterId(x: unknown): x is ChapterId {
  return (
    x === "leave" ||
    x === "wait" ||
    x === "scan" ||
    x === "alert" ||
    x === "quiet"
  );
}

function isValidTone(x: unknown): x is GenerativePayload["tone"] {
  return x === "warm" || x === "urgent" || x === "calm";
}

/**
 * Fetches optional AI-personalized chapter ordering.
 * Never blocks first paint — returns DEFAULT_PAYLOAD synchronously,
 * then upgrades to AI value if available within 1.5s.
 */
export function useGenerativeVisuals(): GenerativePayload {
  const [payload, setPayload] = useState<GenerativePayload>(DEFAULT_PAYLOAD);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    fetch("/api/home/generate", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((json: unknown) => {
        if (!json || typeof json !== "object") return;
        const raw = json as {
          chapterOrder?: unknown;
          tone?: unknown;
        };
        const chapterOrder = Array.isArray(raw.chapterOrder)
          ? raw.chapterOrder.filter(isValidChapterId)
          : [];
        if (chapterOrder.length !== 5) return;

        setPayload({
          chapterOrder,
          tone: isValidTone(raw.tone) ? raw.tone : "calm",
          ready: true,
        });
      })
      .catch(() => {
        /* keep defaults */
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return payload;
}
