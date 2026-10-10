"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";

export default function BootstrapPage() {
  const router = useRouter();
  const [uniqueId, setUniqueId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("Passwords do not match.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (!/^\d{4,8}$/.test(pin)) return setError("PIN must be 4-8 digits.");

    setBusy(true);
    try {
      const res = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uniqueId: uniqueId.trim().toUpperCase(),
          code: code.trim().toUpperCase(),
          newPassword: password,
          newPin: pin,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setDone(true);
        setTimeout(() => router.push("/login"), 2000);
      } else {
        setError(json.error?.message || "Setup failed.");
      }
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4">
        <div className="text-center space-y-3">
          <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Setup Complete</h1>
          <p className="text-sm text-[var(--text-muted)]">Redirecting you to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4">
      <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Activate Your Account</h1>
          <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
            Enter the one-time code your administrator gave you, then choose your password and PIN.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">Your ID (roll / employee ID)</label>
            <input
              value={uniqueId} onChange={(e) => setUniqueId(e.target.value.toUpperCase())}
              placeholder="e.g. 24JJ1A0501" required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] font-mono text-sm text-[var(--text-primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">One-time code</label>
            <input
              value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="8 characters" required maxLength={8}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] font-mono text-sm tracking-widest text-center text-[var(--text-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">New password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={8}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm text-[var(--text-primary)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[var(--text-secondary)]">Confirm</label>
              <input
                type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">Kiosk / gate PIN (4-8 digits)</label>
            <input
              type="password" inputMode="numeric" pattern="\d*" maxLength={8}
              value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} required
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] font-mono text-sm text-center tracking-widest text-[var(--text-primary)]"
            />
            <p className="text-[11px] text-[var(--text-muted)]">Used at gate kiosks. Not the same as your web password.</p>
          </div>

          <button
            type="submit" disabled={busy}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? "Setting up…" : <><span>Activate Account</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-[11px] text-[var(--text-muted)]">
          Already set up? <Link href="/login" className="text-emerald-400 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
  };
