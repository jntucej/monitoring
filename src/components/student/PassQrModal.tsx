"use client";

import { useEffect, useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { QrCode, X, AlertCircle, Clock, CheckCircle2, ShieldCheck, Download, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export interface PassQrModalProps {
  ticketNumber: string;
  passTitle?: string;
  fromDate?: string;
  toDate?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PassQrModal({
  ticketNumber,
  passTitle = "Campus Gate Pass",
  fromDate,
  toDate,
  isOpen,
  onClose,
}: PassQrModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrText, setQrText] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(300);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !ticketNumber) return;

    let timer: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const fetchQr = async () => {
      setLoading(true);
      setError(null);
      try {
        const authStore = useAuthStore.getState();
        const token = authStore.token;
        const sessionToken = authStore.user?.currentSessionToken;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (sessionToken) headers["X-Session-Token"] = sessionToken;

        const res = await fetch(`/api/permissions/${encodeURIComponent(ticketNumber)}/qr`, {
          headers,
          cache: "no-store",
        });
        const json = await res.json().catch(() => null);

        if (isCancelled) return;

        if (!res.ok || !json?.success || !json?.data?.qrText) {
          const msg = json?.error?.message || "Failed to load gate pass QR code.";
          setError(msg);
          return;
        }

        setQrText(json.data.qrText);
        setExpiresIn(json.data.expiresIn || 300);
      } catch (err: any) {
        if (!isCancelled) {
          setError(err?.message || "Network error loading QR credential.");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchQr();

    timer = setInterval(() => {
      setExpiresIn((prev) => {
        if (prev <= 1) {
          fetchQr();
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      isCancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [isOpen, ticketNumber]);

  if (!isOpen) return null;

  const downloadQr = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `gate-pass-${ticketNumber}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-6 max-w-sm w-full shadow-2xl relative space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-[var(--action-primary)]/10 text-[var(--action-primary)] border border-[var(--action-primary)]/20">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">{passTitle}</h3>
            <p className="text-xs font-mono text-[var(--text-muted)]">{ticketNumber}</p>
          </div>
        </div>

        {/* Body Content */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-[var(--action-primary)] animate-spin" />
            <p className="text-xs text-[var(--text-muted)]">Generating signed security credential…</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex flex-col items-center text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <span className="font-semibold text-rose-200">Credential Not Available</span>
            <p className="text-[11px] text-rose-300/80">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* QR Canvas */}
            <div
              ref={qrRef}
              className="bg-white p-5 rounded-2xl flex flex-col items-center justify-center shadow-inner border border-slate-200"
            >
              <QRCodeCanvas
                value={qrText || ""}
                size={210}
                level="M"
                includeMargin
              />
              <div className="mt-2 text-[10px] font-bold text-slate-700 font-mono flex items-center gap-1.5 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Gate Token • Refreshes in {expiresIn}s
              </div>
            </div>

            {/* Window and Instructions */}
            <div className="bg-[var(--bg-elevated)] p-3 rounded-2xl border border-[var(--border)] text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Approved Pass</span>
              </div>
              {fromDate && toDate && (
                <p className="text-[11px] text-[var(--text-muted)]">
                  Window: {new Date(fromDate).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} — {new Date(toDate).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              <p className="text-[10px] text-[var(--text-muted)]">
                Present this QR code to the gate security scanner upon exit and entry.
              </p>
            </div>

            {/* Download Button */}
            <button
              onClick={downloadQr}
              className="w-full py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--bg-base)] flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4" />
              <span>Save Pass QR Image</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
