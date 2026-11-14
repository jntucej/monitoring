"use client";
import { errMsg } from "@/lib/err-msg";
import { useState } from "react";
import { X, Copy, Check, KeyRound, Clock, ExternalLink } from "lucide-react";
import { useApi } from "@/hooks/useApi";

interface Props {
  userId: string;
  userName: string;
  onClose: () => void;
}

export function EnrollmentCodeModal({ userId, userName, onClose }: Props) {
const api = useApi();

  const [purpose, setPurpose] = useState<"web_bootstrap" | "mobile" | "pin_reset" | "web_bootstrap_tg">("web_bootstrap");
  const [issued, setIssued] = useState<{ code: string; expiresAt: string; bootstrapLink?: string; telegramDeepLink?: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issue = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}/enrollment-code`, {
        method: "POST",
        headers: { ...api.getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const json = await res.json();
      if (json.success) setIssued(json.data);
      else setError(json.error?.message || "Failed to issue code");
    } catch (e) { setError(errMsg(e)); }
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

  const copyLink = async () => {
    if (!issued) return;
    const url = issued.bootstrapLink || (typeof window !== "undefined" ? `${window.location.origin}/bootstrap?code=${encodeURIComponent(issued.code)}` : `/bootstrap?code=${encodeURIComponent(issued.code)}`);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="surface-card flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-action-success" /> Enrollment Code
          </h2>
          <button onClick={onClose} className="surface-card p-1 hover:bg-bg-elevated">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-text-secondary">
            Issuing a bootstrap code for <strong className="text-text-primary">{userName}</strong>.
          </p>

          {!issued && (
            <>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-1 uppercase" htmlFor="purpose">Purpose</label>
                <select id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as any)}
                  className="surface-card w-full px-3 py-2 bg-bg-elevated text-sm text-text-primary"
                >
                  <option value="web_bootstrap">Web onboarding (password + PIN)</option>
                  <option value="mobile">Mobile device pairing (15 min)</option>
                  <option value="pin_reset">Kiosk PIN reset</option>
                  <option value="web_bootstrap_tg">Telegram deep link (15 min)</option>
                </select>
              </div>

              {error && <p className="text-xs text-action-danger">{error}</p>}

              <button
                onClick={issue}
                disabled={loading}
                className="surface-card w-full py-2.5 bg-action-success hover:bg-action-success text-white text-sm font-bold disabled:opacity-50"
              >
                {loading ? "Generating…" : "Generate Code"}
              </button>
            </>
          )}

          {issued && (
            <>
              <div className="surface-card p-4 bg-bg-elevated text-center space-y-2">
                <p className="text-xs uppercase font-bold text-text-muted tracking-wider">One-Time Code</p>
                <p className="text-3xl font-mono font-black tracking-[0.35em] text-action-success select-all">
                  {issued.code}
                </p>
                <div className="flex items-center justify-center gap-4 pt-1">
                  <button
                    onClick={copy}
                    className="inline-flex items-center gap-1.5 text-xs text-action-success hover:text-action-success font-medium"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Code Copied" : "Copy Code"}
                  </button>
                  <span className="textborder">•</span>
                  <button
                    onClick={copyLink}
                    className="inline-flex items-center gap-1.5 text-xs text-action-info hover:text-action-info font-medium"
                  >
                    {linkCopied ? <Check className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                    {linkCopied ? "Link Copied" : "Copy Activation Link"}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Clock className="w-3.5 h-3.5" />
                Expires {new Date(issued.expiresAt).toLocaleString()}
              </div>

              <div className="surface-card p-3 bg-amber-500/10 text-xs text-action-warning space-y-1">
                <p className="font-semibold text-action-warning">Direct Activation Link:</p>
                <p className="font-mono text-xs break-all select-all text-amber-300/90">
                  {issued.bootstrapLink || (typeof window !== "undefined" ? `${window.location.origin}/bootstrap?code=${issued.code}` : `/bootstrap?code=${issued.code}`)}
                </p>
              </div>

              {issued.telegramDeepLink && (
                <div className="surface-card p-3 bg-sky-500/10 text-xs text-action-info space-y-1">
                  <p className="font-semibold text-sky-200">Telegram Deep Link (share with candidate):</p>
                  <p className="font-mono text-xs break-all select-all text-sky-300/90">
                    {issued.telegramDeepLink}
                  </p>
                  <p className="text-xs text-sky-400/60">
                    Candidate taps link in Telegram → presses Start → shares their
                    phone number via the bot button. Verification is hard-blocked if
                    the number does not match our records.
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(issued.telegramDeepLink!);
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 1500);
                      } catch {}
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-action-info hover:text-action-info font-medium"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy Telegram Link
                  </button>
                </div>
              )}

              <button
                onClick={onClose}
                className="surface-card w-full py-2.5 bg-bg-elevated text-text-primary text-sm font-semibold"
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