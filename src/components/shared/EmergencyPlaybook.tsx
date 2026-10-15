"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Siren, Lock, Megaphone, Phone, Snowflake, Loader2, Check } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";

type Action = {
  id: string;
  label: string;
  description: string;
  icon: typeof Siren;
  tone: "critical" | "warning" | "neutral";
  endpoint?: string;
  body?: any;
  confirm: string;
};

const ACTIONS: Action[] = [
  { id: "lockdown",  label: "Lock down gates",  description: "Freeze all entry/exit",   icon: Lock,      tone: "critical", endpoint: "/api/admin/lockdown", body: { scopes: ["ALL"], message: "Emergency lockdown" }, confirm: "Lock down all gates?" },
  { id: "broadcast", label: "Campus broadcast", description: "Push alert to everyone",  icon: Megaphone, tone: "critical", endpoint: "/api/admin/announcements", body: { priority: "critical", audience: "all", title: "Emergency notice" }, confirm: "Broadcast to entire campus?" },
  { id: "freeze",    label: "Freeze admissions", description: "Pause visitor intake",   icon: Snowflake, tone: "warning",  endpoint: "/api/visitors/freeze", body: { enabled: true }, confirm: "Freeze visitor admissions?" },
  { id: "vp",        label: "Notify VP",        description: "Alert Vice Principal",    icon: Phone,     tone: "neutral",  endpoint: "/api/notifications", body: { to_role: "vice_principal", severity: "critical" }, confirm: "Notify VP?" },
];

export function EmergencyPlaybook({
  open, onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const addToast = useUIStore((s) => s.addToast);
  const [pending, setPending] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Action | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const fire = async (a: Action) => {
    if (!a.endpoint) return;
    setPending(a.id);
    try {
      const res = await fetch(a.endpoint, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(a.body ?? {}),
      });
      if (!res.ok) throw new Error(await res.text());
      addToast({ variant: "success", message: `${a.label} executed` });
      setConfirming(null);
      onClose();
    } catch (e: any) {
      addToast({ variant: "error", message: e.message ?? "Failed" });
    } finally {
      setPending(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[var(--z-modal)] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 260 }}
            className="fixed right-0 top-0 z-[var(--z-modal)] h-full w-full max-w-md overflow-y-auto border-l border-[var(--border)] bg-[var(--bg-surface)] p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-500">
                  <Siren className="h-3 w-3" /> Emergency playbook
                </div>
                <p className="mt-3 text-sm text-[var(--text-muted)]">
                  One-tap actions. Each is audit-logged.
                </p>
              </div>
              <button onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                const isPending = pending === a.id;
                const tone =
                  a.tone === "critical" ? "border-rose-500/30 bg-rose-500/5 text-rose-500"
                  : a.tone === "warning" ? "border-amber-500/30 bg-amber-500/5 text-amber-500"
                  : "border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-primary)]";
                return (
                  <button
                    key={a.id}
                    onClick={() => setConfirming(a)}
                    disabled={isPending}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-transform hover:-translate-y-0.5 disabled:opacity-50 ${tone}`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{a.label}</div>
                      <div className="text-xs text-[var(--text-muted)]">{a.description}</div>
                    </div>
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  </button>
                );
              })}
            </div>

            {confirming && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-4"
              >
                <p className="text-sm text-[var(--text-primary)]">{confirming.confirm}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => fire(confirming)}
                    disabled={pending === confirming.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600 disabled:opacity-50"
                  >
                    {pending === confirming.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
