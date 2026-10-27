"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Loader2,
  ListOrdered,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

interface ClaimGate {
  id: string;
  name: string;
  gateCode?: string;
  gate_code?: string;
}

interface ClaimRow {
  id: string;
  gate_id: string;
  gate_name: string | null;
  operator_name_label: string | null;
  expires_at: string;
  used_at: string | null;
  revoked: boolean;
  created_at: string;
}

function formatExpiry(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

/**
 * Supervisor gate-claim code generator + active-code list.
 *
 * The supervisor picks a gate, mints a one-time human-readable claim string
 * (NOT a bare numeric PIN), shows it to / reads it aloud to an operator, who
 * then enters it at the kiosk or operator console to claim that gate. Only the
 * SHA-256 hash is stored — the plaintext appears exactly once, right here.
 */
export function GateClaimCodePanel() {
  const token = useAuthStore((s) => s.token);
  const authHeaders = { Authorization: `Bearer ${token ?? ""}` };

  const [gates, setGates] = useState<ClaimGate[]>([]);
  const [selectedGateId, setSelectedGateId] = useState<string>("");
  const [label, setLabel] = useState("");
  const [generating, setGenerating] = useState(false);

  const [freshCode, setFreshCode] = useState<{ code: string; gateName: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const [codes, setCodes] = useState<ClaimRow[]>([]);
  const [loadingCodes, setLoadingCodes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyRevoke, setBusyRevoke] = useState<string | null>(null);

  const loadGates = useCallback(async () => {
    try {
      const res = await fetch("/api/gates", { headers: authHeaders, cache: "no-store" });
      const body = await res.json();
      const raw: any[] = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
      const active = raw.filter((g) => g.is_active !== false && g.isActive !== false);
      setGates(active);
      if (active.length > 0 && !selectedGateId) setSelectedGateId(active[0].id);
    } catch {
      /* no gates — panel just shows empty state */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadCodes = useCallback(async () => {
    setLoadingCodes(true);
    setError(null);
    try {
      const res = await fetch("/api/supervisor/claim-codes", { headers: authHeaders, cache: "no-store" });
      const body = await res.json();
      if (body?.success) {
        setCodes(Array.isArray(body.data?.codes) ? body.data.codes : []);
      } else {
        setError(body?.error?.message || "Failed to load active claim codes.");
      }
    } catch {
      setError("Failed to load active claim codes.");
    } finally {
      setLoadingCodes(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { loadGates(); }, [loadGates]);
  useEffect(() => { loadCodes(); }, [loadCodes]);

  const generate = async () => {
    if (!selectedGateId) return;
    setGenerating(true);
    setError(null);
    setFreshCode(null);
    setCopied(false);
    try {
      const res = await fetch("/api/supervisor/claim-codes", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ gateId: selectedGateId, label: label || undefined }),
      });
      const body = await res.json();
      if (body?.success) {
        setFreshCode({
          code: body.data.code,
          gateName: body.data.gateName ?? selectedGateId,
          expiresAt: body.data.expiresAt,
        });
        setLabel("");
        loadCodes();
      } else {
        setError(body?.error?.message || "Failed to generate code.");
      }
    } catch {
      setError("Failed to generate code.");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — the code is still visible to select */
    }
  };

  const revoke = async (code: string) => {
    setBusyRevoke(code);
    try {
      await fetch("/api/supervisor/claim-codes", {
        method: "DELETE",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      loadCodes();
    } finally {
      setBusyRevoke(null);
    }
  };

  const activeCodes = codes.filter((c) => !c.revoked && !c.used_at);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#111827] overflow-hidden min-w-0">
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <KeyRound className="w-4 h-4 text-emerald-400 shrink-0" />
          <h2 className="text-sm font-semibold text-slate-100 truncate">
            Gate Claim Codes
          </h2>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            generate a code, hand it to the operator, they enter it at the kiosk to claim this gate
          </span>
        </div>
        <button
          type="button"
          onClick={loadCodes}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 flex items-center"
          title="Refresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Generate */}
      <div className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1 min-w-0">
            <span className="block text-[11px] font-semibold text-slate-400 mb-1">Gate</span>
            <select
              value={selectedGateId}
              onChange={(e) => setSelectedGateId(e.target.value)}
              disabled={gates.length === 0}
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 focus:ring-2 focus:ring-emerald-500/40 outline-none disabled:opacity-50"
            >
              {gates.length === 0 && <option value="">No active gates</option>}
              {gates.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} {g.gateCode || g.gate_code ? `(${g.gateCode || g.gate_code})` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 min-w-0">
            <span className="block text-[11px] font-semibold text-slate-400 mb-1">
              Operator name (optional, shown in the list)
            </span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Ravi"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500/40 outline-none"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={generate}
              disabled={!selectedGateId || generating}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 transition"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
              Generate Code
            </button>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
            {error}
          </div>
        )}

        {freshCode && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <ShieldCheck className="w-4 h-4" />
              New code for <span className="font-bold">{freshCode.gateName}</span> — expires{" "}
              {formatExpiry(freshCode.expiresAt)}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <code className="flex-1 px-3 py-3 rounded-lg bg-slate-950 border border-slate-700 font-mono text-lg tracking-[0.2em] text-emerald-300 select-all text-center">
                {freshCode.code}
              </code>
              <button
                type="button"
                onClick={() => copyCode(freshCode.code)}
                className="px-4 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold flex items-center justify-center gap-2 transition min-w-[84px]"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-[11px] text-emerald-300/70">
              Show or read this code to the operator now. It is displayed only once and is one-time
              use — after they enter it, it cannot be reused.
            </p>
          </div>
        )}
      </div>

      {/* Active codes list */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
          <ListOrdered className="w-3.5 h-3.5" />
          Active codes ({activeCodes.length})
        </div>
        {loadingCodes ? (
          <div className="p-4 flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : activeCodes.length === 0 ? (
          <div className="p-4 text-xs text-slate-500">
            No active claim codes. Generate one above — its plaintext is not recoverable after that.
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/60">
            {activeCodes.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm text-slate-100 font-medium truncate">
                    {c.gate_name || c.gate_id}
                    {c.operator_name_label ? (
                      <span className="ml-2 text-[11px] text-slate-500">for {c.operator_name_label}</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    expires {formatExpiry(c.expires_at)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(c.id)}
                  disabled={busyRevoke === c.id}
                  className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 text-slate-400 text-[11px] font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                  title="Revoke this code"
                >
                  {busyRevoke === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
