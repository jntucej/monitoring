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
      <div className="min-h-dvh bg-bg-base flex-col items-center justify-center gap-3">
        <div className="size-6 border-t-transparent rounded-full animate-spin" />
        <p className="font-semibold text-text-muted">Loading gates…</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg-base flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="size-6 rounded-full bg-emerald-500/15 text-action-success flex items-center justify-center mx-auto">
            <MapPin className="w-6 h-6" />
          </div>
          <h1 className="font-bold text-text-primary">
            Select Your Gate
          </h1>
          <p className="text-text-secondary">
            Choose the gate desk where you are working today.
          </p>
        </div>

        {/* Gate list */}
        {error && (
          <div className="surface-card flex items-start gap-2 p-3 bg-rose-500/10 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {gates.length === 0 ? (
          <div className="surface-card bg-bg-surface p-6 text-text-muted">
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
                    ? "borderaction-success bg-emerald-500/10 text-text-primary"
                    : "border-border bg-bg-surface text-text-primary hover:border-border hover:bg-bg-elevated",
                ].join(" ")}
              >
                <div
                  className={[
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                    selected === g.id
                      ? "borderaction-success bg-action-success"
                      : "border-border",
                  ].join(" ")}
                >
                  {selected === g.id && (
                    <div className="size-4 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1 min-w-4">
                  <div className="font-semibold text-sm truncate">{g.name}</div>
                  {g.location && (
                    <div className="text-text-muted truncate">
                      {g.location}
                    </div>
                  )}
                </div>
                {g.gateCode && (
                  <span className="font-mono text-text-muted shrink-0">
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
          className="surface-card w-full py-3 px-4 bg-action-primary hover:brightness-110 disabled:opacity-50 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
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
