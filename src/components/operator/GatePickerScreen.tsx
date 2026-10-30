"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/components/ui/toast";

interface Gate {
  id: string;
  gateCode?: string;
  name: string;
  location?: string;
  isActive?: boolean;
}

export function GatePickerScreen() {
  const router = useRouter();
  const { addToast } = useToast();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const token = useAuthStore((s) => s.token);

  const [gates, setGates] = useState<Gate[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGates() {
      try {
        const res = await fetch("/api/gates", {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const json = await res.json();
        if (!json.success) {
          setError("Failed to load gates");
          return;
        }
        const allGates: Gate[] = Array.isArray(json.data) ? json.data : [];
        // Filter to active gates only (API returns camelCase via getAllGatesLive)
        const active = allGates.filter(
          (g) => g.isActive === true
        );
        setGates(active);
      } catch {
        setError("Could not reach the server. Check your connection.");
      } finally {
        setLoading(false);
      }
    }
    fetchGates();
  }, [token]);

  async function handleSubmit() {
    if (!selected || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      // Patch the current user's gate assignment via /api/users/[id]
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ gateId: selected }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Failed to assign gate");
        addToast({
          variant: "error",
          message: json.error?.message || "Failed to assign gate",
        });
        return;
      }
      // Update in-memory store so downstream components see the new gate immediately
      if (user) setUser({ ...user, gateId: selected });
      addToast({
        variant: "success",
        message: `Assigned to ${gates.find((g) => g.id === selected)?.name ?? "gate"}.`,
      });
      // Re-check session so the store reflects the latest user data
      await useAuthStore.getState().checkSession();
      router.replace(`/gate/${selected}`);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      addToast({
        variant: "error",
        message: "Could not reach the server. Check your connection.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[var(--text-muted)]">Loading gates…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto">
            <MapPin className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">
            Select Your Gate
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Choose the gate desk where you are working today.
          </p>
        </div>

        {/* Gate list */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {gates.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 text-center text-xs text-[var(--text-muted)]">
            No active gates found. Contact your supervisor.
          </div>
        ) : (
          <div className="space-y-2">
            {gates.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelected(g.id)}
                className={[
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all",
                  selected === g.id
                    ? "border-emerald-500 bg-emerald-500/10 text-[var(--text-primary)]"
                    : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-elevated)]",
                ].join(" ")}
              >
                <div
                  className={[
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    selected === g.id
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-[var(--border)]",
                  ].join(" ")}
                >
                  {selected === g.id && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{g.name}</div>
                  {g.location && (
                    <div className="text-xs text-[var(--text-muted)] truncate">
                      {g.location}
                    </div>
                  )}
                </div>
                {g.gateCode && (
                  <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                    {g.gateCode}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Continue button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !selected}
          className="w-full py-3 px-4 rounded-xl bg-[var(--action-primary)] hover:brightness-110 disabled:opacity-50 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Assigning…
            </>
          ) : (
            <>Continue</>
          )}
        </button>
      </div>
    </div>
  );
}
