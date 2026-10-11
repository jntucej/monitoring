"use client";
import { useState } from "react";
import { X, Copy, Check, KeyRound, Clock } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
}

export function EnrollmentCodeModal({ userId, userName, onClose }: Props) {
  const [purpose, setPurpose] = useState<"web_bootstrap" | "mobile" | "pin_reset">("web_bootstrap");
  const [issued, setIssued] = useState<{ code: string; expiresAt: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issue = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/enrollment-code`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const json = await res.json();
      if (json.success) setIssued(json.data);
      else setError(json.error?.message || "Failed to issue code");
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const copy = async () => {
    if (!issued) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(issued.code);
      } else {
        const ta = document.createElement("textarea");
        ta.value = issued.code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // The code is displayed on-screen anyway
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-400" /> Enrollment Code
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-elevated)]">
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Issuing a bootstrap code for <strong className="text-[var(--text-primary)]">{userName}</strong>.
          </p>

          {!issued && (
            <>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1 uppercase">Purpose</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)]"
                >
                  <option value="web_bootstrap">Web onboarding (password + PIN)</option>
                  <option value="mobile">Mobile device pairing (15 min)</option>
                  <option value="pin_reset">Kiosk PIN reset</option>
                </select>
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <button
                onClick={issue}
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {loading ? "Generating…" : "Generate Code"}
              </button>
            </>
          )}

          {issued && (
            <>
              <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-emerald-500/30 text-center space-y-2">
                <p className="text-[11px] uppercase font-bold text-[var(--text-muted)] tracking-wider">One-Time Code</p>
                <p className="text-3xl font-mono font-black tracking-[0.35em] text-emerald-400 select-all">
                  {issued.code}
                </p>
                <button
                  onClick={copy}
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy to clipboard"}
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Clock className="w-3.5 h-3.5" />
                Expires {new Date(issued.expiresAt).toLocaleString()}
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                Share at <code className="font-mono">/bootstrap</code>.
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-semibold"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}