"use client";

import { useEffect, useState } from "react";
import { QrCode, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

interface QrData {
  qr: string;
  counter: number;
  expires_in_s: number;
  already_scanned: boolean;
  session: {
    id: string;
    meal_date: string;
    meal_type: string;
    window_opens_at: string;
    window_closes_at: string;
  };
}

export function RotatingMealQrCard() {
  const [data, setData] = useState<QrData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(30);

  const fetchQr = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mess/my-qr", {
        headers: getAuthHeaders(),
      });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.success && body.data) {
        setData(body.data);
        setCountdown(body.data.expires_in_s || 30);
      } else {
        setError(body?.error?.message ?? "No active meal serving window right now.");
      }
    } catch {
      setError("Unable to load meal token QR.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQr();
  }, []);

  useEffect(() => {
    if (countdown <= 0) {
      fetchQr();
      return;
    }
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  return (
    <div className="surface-card bg-bg-surface p-4 rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-4 h-4 text-action-primary" />
          <h3 className="text-sm font-semibold text-text-primary">
            Rotating Meal Token QR
          </h3>
        </div>
        <button
          type="button"
          onClick={fetchQr}
          disabled={loading}
          className="text-text-muted hover:text-action-primary transition-colors p-1 rounded"
          title="Refresh QR"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <div className="p-4 rounded-lg bg-bg-elevated border border-border text-center space-y-1">
          <AlertCircle className="w-5 h-5 text-text-muted mx-auto" />
          <p className="text-xs font-medium text-text-secondary">{error}</p>
          <p className="text-[11px] text-text-muted">
            Tokens activate automatically when dining hall doors open.
          </p>
        </div>
      ) : data ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary uppercase">
              {data.session.meal_type} · {data.session.meal_date}
            </span>
            <span className="text-xs font-mono tabular-nums font-bold text-action-primary">
              Refreshes in {countdown}s
            </span>
          </div>

          <div className="p-3 bg-white rounded-lg flex flex-col items-center justify-center border border-border/50">
            <div className="w-28 h-28 bg-slate-900 rounded flex items-center justify-center p-2 text-center text-[10px] text-white font-mono break-all leading-tight">
              {data.qr}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Counter #{data.counter}</span>
            {data.already_scanned ? (
              <span className="text-action-success flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Scanned
              </span>
            ) : (
              <span className="text-action-warning font-medium">Ready to scan</span>
            )}
          </div>
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center text-xs text-text-muted">
          Loading rotating token…
        </div>
      )}
    </div>
  );
}

export default RotatingMealQrCard;
