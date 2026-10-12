"use client";

import { useState } from "react";
import { MessageSquare, Send, Loader2, CheckCircle2, LifeBuoy } from "lucide-react";
import { useApi } from "@/hooks/useApi";
import { useUIStore } from "@/stores/uiStore";
import Link from "next/link";

/**
 * Compact "Contact the developer" strip shown on every user dashboard.
 * POSTs to /api/dev/contact (delivers to the developer via Telegram) and
 * shows an inline confirmation. Rate-limited + per-user opt-out are
 * enforced server-side (users.dev_contact_enabled).
 */
export function DevContactStrip({ defaultOpen = false }: { defaultOpen?: boolean }) {
const api = useApi();

  const [open, setOpen] = useState(defaultOpen);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { addToast } = useUIStore();

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/dev/contact", {
        method: "POST",
        headers: api.getHeaders(),
        body: JSON.stringify({ message: message.trim(), channel: "dashboard" }),
      });
      const result = await res.json();
      if (result.success) {
        setSent(true);
        setMessage("");
        addToast({
          variant: "success",
          title: "Sent",
          message: result.data?.delivered
            ? "Delivered to the developer via Telegram."
            : "Saved and shared with the developer.",
        });
        setTimeout(() => setSent(false), 4000);
      } else if (result.error?.code === "RATE_LIMITED") {
        addToast({ variant: "warning", title: "Slow down", message: "Too many messages — try again in a few minutes." });
      } else if (result.error?.code === "DISABLED") {
        addToast({ variant: "info", title: "Unavailable", message: "The developer channel is currently disabled." });
      } else {
        addToast({ variant: "error", title: "Failed", message: result.error?.message || "Could not send." });
      }
    } catch {
      addToast({ variant: "error", title: "Failed", message: "Network error." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
            Developer
          </span>
        </div>
        <span className="text-[10px] text-[var(--text-muted)]">{open ? "Hide" : "Open"}</span>
      </button>

      {open && (
        <form onSubmit={send} className="space-y-2">
          <p className="text-[11px] text-[var(--text-muted)]">
            Straight to the developer on Telegram — suggestions, bugs, anything.
            Your name & role are attached automatically.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              required
              placeholder="e.g. The scanner page is slow on mobile"
              className="flex-1 px-3 py-2 text-xs bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center gap-1.5 text-xs font-semibold shrink-0"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send
            </button>
          </div>
          {sent && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sent — the developer has been notified.
            </div>
          )}
        </form>
      )}

      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <Link href="/support" className="flex items-center gap-1 hover:text-emerald-400 font-medium">
          <LifeBuoy className="w-3 h-3" /> Open full Support page
        </Link>
        <span>Rate-limited • opt-out available in settings</span>
      </div>
    </div>
  );
}
