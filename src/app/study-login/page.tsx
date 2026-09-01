"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, UserCheck, ArrowRight, AlertCircle, BookOpen, GraduationCap } from "lucide-react";

/**
 * Study Portal — entry gate.
 *
 * Shared-credentials door for study resources. Pure client-side check against
 * NEXT_PUBLIC_* env vars; success sets a sessionStorage flag that /study pages
 * read as the access ticket.
 *
 * ponytail: deliberate cosmetic gate — the credentials ship to the browser with
 * the bundle and /study is protected client-side only. Fine for shared study
 * material, NOT access control. Upgrade path: real role + RLS if this ever
 * protects anything sensitive.
 *
 * Storage key: "gate-monitor-study-auth" — see src/lib/studyAuth.ts
 */

const STORAGE_KEY = "gate-monitor-study-auth";

export default function StudyLoginPage() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-8 relative overflow-x-hidden">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[28rem] h-[28rem] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
      <GateCard />
    </div>
  );

function GateCard() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [pass, setPass] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [alreadyIn, setAlreadyIn] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "true") setAlreadyIn(true);
    } catch {}
  }, []);

  const triggerShake = (msg: string) => {
    setErrorMsg(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!id.trim() || !pass) {
      triggerShake("Please enter both ID and Password.");
      return;
    }

    const expectedId = (process.env.NEXT_PUBLIC_STUDY_ID || "akarsh").trim();
    const expectedPass = (process.env.NEXT_PUBLIC_STUDY_PASS || "1234").trim();

    if (id.trim() !== expectedId || pass !== expectedPass) {
      triggerShake("Invalid ID or Password.");
      return;
    }

    try {
      sessionStorage.setItem(STORAGE_KEY, "true");
    } catch {}
    router.push("/study");
  };

  return (
    <div
      className={`glass-card w-full max-w-lg p-6 sm:p-8 rounded-3xl space-y-6 transition-all border border-slate-800/50 shadow-2xl ${
        isShaking ? "animate-shake border-[var(--action-danger)]" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[var(--action-primary)]/10 border border-[var(--action-primary)]/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-[var(--action-primary)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Study Portal</h1>
            <p className="text-xs text-[var(--text-muted)]">Enter shared credentials to access resources.</p>
          </div>
        </div>
        <GraduationCap className="w-8 h-8 text-[var(--action-primary)]/40" />
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--action-danger)]/10 text-[var(--action-danger)] border border-[var(--action-danger)]/20 text-xs font-semibold animate-fadeIn">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {alreadyIn && !errorMsg && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--action-primary)]/10 text-[var(--action-primary)] border border-[var(--action-primary)]/20 text-xs font-semibold animate-fadeIn">
          <span className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Access already active in this tab.
          </span>
          <button type="button" onClick={() => router.push("/study")} className="underline underline-offset-2 hover:opacity-80">
            Go to Study Pages →
          </button>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="study-id" className="block text-xs font-semibold text-[var(--text-secondary)]">
            Access ID
          </label>
          <div className="relative">
            <input
              id="study-id"
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Enter access ID"
              autoComplete="off"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none transition-all"
            />
            <UserCheck className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="study-pass" className="block text-xs font-semibold text-[var(--text-secondary)]">
            Password
          </label>
          <div className="relative">
            <input
              id="study-pass"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Enter password"
              autoComplete="off"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none transition-all"
            />
            <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
          </div>
        </div>

        <button
          type="submit"
          disabled={!id || !pass}
          className="w-full touch-target-primary rounded-xl bg-[var(--action-primary)] text-white font-bold text-sm hover:opacity-95 transition-all disabled:opacity-40 shadow-md flex items-center justify-center gap-2 py-3 mt-2 active:scale-[0.99]"
        >
          <span>Enter Study Portal</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-center pt-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--action-primary)] font-bold">
            <BookOpen className="w-3 h-3" />
            <span>Shared Access — Learn Together</span>
          </span>
        </div>
      </form>
    </div>
  );
}

}
