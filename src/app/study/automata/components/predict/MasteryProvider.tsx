"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface MasteryEntry {
  score: number;
  attempts: number;
  lastPractice: string;
}

export interface MasteryState {
  [operationId: string]: MasteryEntry;
}

interface MasteryContextType {
  mastery: MasteryState;
  recordAnswer: (operationId: string, correct: boolean) => void;
  getMasteryLevel: (operationId: string) => number;
  getWeakestOperation: (operationIds: string[]) => string | null;
  resetMastery: (operationId?: string) => void;
}

const MasteryContext = createContext<MasteryContextType | null>(null);

export function MasteryProvider({ children }: { children: React.ReactNode }) {
  const [mastery, setMastery] = useState<MasteryState>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("atcd_mastery");
      if (saved) setMastery(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("atcd_mastery", JSON.stringify(mastery));
    } catch {}
  }, [mastery]);

  const recordAnswer = useCallback((operationId: string, correct: boolean) => {
    setMastery((prev) => {
      const existing = prev[operationId] ?? { score: 0, attempts: 0, lastPractice: "" };
      const newAttempts = existing.attempts + 1;
      const newScore = correct ? existing.score + 1 : existing.score;
      return {
        ...prev,
        [operationId]: {
          score: newScore,
          attempts: newAttempts,
          lastPractice: new Date().toISOString(),
        },
      };
    });
  }, []);

  const getMasteryLevel = useCallback((operationId: string): number => {
    const entry = mastery[operationId];
    if (!entry || entry.attempts === 0) return 0;
    return Math.round((entry.score / entry.attempts) * 100);
  }, [mastery]);

  const getWeakestOperation = useCallback((operationIds: string[]): string | null => {
    let weakest: string | null = null;
    let lowestLevel = 101;
    for (const id of operationIds) {
      const level = getMasteryLevel(id);
      if (level < lowestLevel) {
        lowestLevel = level;
        weakest = id;
      }
    }
    return weakest;
  }, [getMasteryLevel]);

  const resetMastery = useCallback((operationId?: string) => {
    setMastery((prev) => {
      if (operationId) {
        const next = { ...prev };
        delete next[operationId];
        return next;
      }
      return {};
    });
  }, []);

  return (
    <MasteryContext.Provider value={{ mastery, recordAnswer, getMasteryLevel, getWeakestOperation, resetMastery }}>
      {children}
    </MasteryContext.Provider>
  );
}

export function useMastery() {
  const ctx = useContext(MasteryContext);
  if (!ctx) throw new Error("useMastery must be used within MasteryProvider");
  return ctx;
}