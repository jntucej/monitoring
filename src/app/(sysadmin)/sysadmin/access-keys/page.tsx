"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import {
  KeyRound, Search, RefreshCw, Loader2, Clock, Trash2, UserPlus, Check, Copy,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";

interface EnrollmentCodeRow {
  id: string;
  user_id: string;
  user_roll: string | null;
  user_name: string | null;
  purpose: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
  created_by: string | null;
}

interface GeneratedCode {
  code: string;
  purpose: string;
  expiresAt: string;
  userRoll: string;
  userName: string;
}

const PURPOSES: { value: string; label: string }[] = [
  { value: "web_bootstrap", label: "Web onboarding (password + PIN)" },
  { value: "mobile", label: "Mobile device pairing (15 min)" },
  { value: "pin_reset", label: "Kiosk PIN reset" },
];

function formatTs(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

export default function SysAdminAccessKeysPage() {
  const { addToast } = useUIStore();
  const [codes, setCodes] = useState<EnrollmentCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rollInput, setRollInput] = useState("");
  const [purpose, setPurpose] = useState("web_bootstrap");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedCode | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const genTimer = useRef<number | null>(null);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/users/enrollment-codes?active=true&t=${Date.now()}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const json = await res.json().catch(() => ({ success: false, error: { message: "Invalid server response." } }));
      if (res.ok && json.success) {
        setCodes(Array.isArray(json.data) ? json.data : []);
      } else {
        setLoadError(json.error?.message || `Failed to load enrollment codes (HTTP ${res.status})`);
      }
    } catch {
      setLoadError("Network error loading enrollment codes");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  const handleGenerate = async () => {
    setGenError(null);
    const roll = rollInput.trim().toUpperCase();
    if (!roll) {
      setGenError("Enter the student's roll number.");
      return;
    }
    setGenerating(true);
    try {
      // Resolve roll -> user id
      const usersRes = await fetch(`/api/users?q=${encodeURIComponent(roll)}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const usersJson = await usersRes.json().catch(() => ({ success: false, data: [] }));
      let target: { id: string; name?: string; uniqueId?: string; unique_id?: string } | undefined;

      if (usersRes.ok && usersJson.success && Array.isArray(usersJson.data) && usersJson.data.length > 0) {
        const exact = usersJson.data.find(
          (u: any) =>
            String(u.uniqueId ?? u.unique_id ?? u.id ?? "")
              .toUpperCase()
              .replace(/\s/g, "") === roll.replace(/\s/g, "")
        );
        target = exact ?? usersJson.data[0];
      }

      if (!target?.id) {
        setGenError(`No user found for roll number "${roll}". Make sure the student exists in the roster.`);
        setGenerating(false);
        return;
      }

      const res = await fetch(`/api/admin/users/${encodeURIComponent(target.id)}/enrollment-code`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ purpose }),
      });
      const json = await res.json().catch(() => ({ success: false }));
      if (res.ok && json.success) {
        setGenerated({
          code: json.data.code,
          purpose: json.data.purpose,
          expiresAt: json.data.expiresAt,
          userRoll: String(target.uniqueId ?? target.unique_id ?? roll),
          userName: target.name ?? "",
        });
        addToast({ variant: "success", title: "Code generated", message: `Enrollment code issued for ${String(target.uniqueId ?? target.unique_id ?? roll)}.` });
        loadCodes();
      } else {
        setGenError(json.error?.message || "Failed to generate enrollment code.");
      }
    } catch {
      setGenError("Network error generating code.");
    } finally {
      setGenerating(false);
    }
  };

  const handleInvalidate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/enrollment-codes/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        addToast({ variant: "success", message: "Code invalidated." });
        loadCodes();
      } else {
        const json = await res.json().catch(() => ({}));
        addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to invalidate code." });
      }
    } catch {
      addToast({ variant: "error", message: "Network error invalidating code." });
    }
  };

  const copyCode = async () => {
    if (!generated) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generated.code);
      }
      setCopied(true);
      if (genTimer.current) window.clearTimeout(genTimer.current);
      genTimer.current = window.setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  };

  const activeCount = codes.filter((c) => !c.used_at && new Date(c.expires_at).getTime() > Date.now()).length;

  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-[var(--text-primary)]">Access Keys</p>
            <p className="text-xs text-[var(--text-muted)]">
              One-time enrollment codes for student bootstrap, mobile pairing and PIN reset. {activeCount} active.
            </p>
          </div>
        </div>

        {/* Generate by roll */}
        <div className="border border-[var(--border)] rounded-xl bg-[var(--bg-surface)] p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400" /> Generate code for a student
          </h2>
          <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1 uppercase tracking-wide">Roll / Employee ID</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={rollInput}
                  onChange={(e) => setRollInput(e.target.value.toUpperCase())}
                  placeholder="e.g. 24JJ1A0501"
                  className="w-full pl-9 pr-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg font-mono text-sm text-[var(--text-primary)] placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-muted)] mb-1 uppercase tracking-wide" htmlFor="purpose">Purpose</label>
              <select id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
              >
                {PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 whitespace-nowrap"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              {generating ? "Generating…" : "Generate"}
            </button>
          </div>
          {genError && <p className="text-xs text-rose-400">{genError}</p>}
        </div>

        {/* Generated code display */}
        {generated && (
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/30 space-y-2">
            <div className="text-[11px] uppercase font-bold text-[var(--text-muted)] tracking-wider flex items-center justify-between">
              <span>New code for {generated.userName ? `${generated.userName} (` : ""}{generated.userRoll}{generated.userName ? ")" : ""}</span>
              <span className="flex items-center gap-1 text-emerald-400 normal-case font-mono text-xs">
                <Clock className="w-3.5 h-3.5" /> {formatTs(generated.expiresAt)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-mono font-black tracking-[0.3em] text-emerald-400 select-all">{generated.code}</span>
              <button onClick={copyCode} className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded border border-emerald-500/30">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[11px] text-amber-300">Share at <code className="font-mono">/bootstrap</code> with the student&apos;s roll number and this code.</p>
          </div>
        )}

        {/* Active codes table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Recently issued codes</h2>
            <button onClick={loadCodes} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>

          {loadError && (
            <div className="mb-3 px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-sm">
              {loadError}
            </div>
          )}

          <div className="border border-[var(--border)] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-base)] text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-2.5 text-left">User</th>
                  <th className="px-4 py-2.5 text-left">Purpose</th>
                  <th className="px-4 py-2.5 text-left">Issued</th>
                  <th className="px-4 py-2.5 text-left">Expires</th>
                  <th className="px-4 py-2.5 text-left">Status</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading codes…
                    </td>
                  </tr>
                ) : codes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500 text-xs">
                      No recently issued codes. Generate one above using a roll number.
                    </td>
                  </tr>
                ) : (
                  codes.map((c) => {
                    const now = Date.now();
                    const expired = new Date(c.expires_at).getTime() <= now;
                    const used = !!c.used_at;
                    const status = used ? "Used" : expired ? "Expired" : "Active";
                    return (
                      <tr key={c.id} className="hover:bg-[var(--bg-base)]/50">
                        <td className="px-4 py-2.5">
                          <div className="font-mono text-xs text-emerald-400">{c.user_roll || c.user_id?.slice(0, 8)}</div>
                          {c.user_name && <div className="text-[11px] text-slate-400">{c.user_name}</div>}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-300">{c.purpose}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{formatTs(c.created_at)}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{formatTs(c.expires_at)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            status === "Active" ? "bg-emerald-500/15 text-emerald-400"
                            : status === "Used" ? "bg-slate-500/15 text-slate-400"
                            : "bg-rose-500/15 text-rose-400"
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {!used && !expired && (
                            <button
                              onClick={() => handleInvalidate(c.id)}
                              title="Invalidate this code"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-300 hover:bg-rose-500/10 border border-rose-500/30"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Invalidate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
