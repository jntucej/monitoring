"use client";
import { errMsg } from "@/lib/err-msg";

import { useEffect, useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { QrCode, X, AlertCircle, ShieldCheck, Download, Loader2 } from "lucide-react";
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
      } catch (err) {
        if (!isCancelled) {
          setError(errMsg(err) || "Network error loading QR credential.");
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
    <div className="surface-card bg-bg-surface p-4 sm:p-6 max-w-[calc(100vw-2rem)] sm:max-w-sm w-full relative space-y-4 overflow-y-auto max-h-[90dvh]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="surface-card absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary hover:bg-bg-elevated transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="surface-card p-2.5 bg-action-primary/10 text-action-primary">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">{passTitle}</h3>
            <p className="text-xs font-mono text-text-muted">{ticketNumber}</p>
          </div>
        </div>

        {/* Body Content */}
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="size-6 text-action-primary animate-spin" />
            <p className="text-xs text-text-muted">Generating signed security credential…</p>
          </div>
        ) : error ? (
          <div className="surface-card p-4 bg-rose-500/10 text-action-danger text-xs flex flex-col items-center text-center space-y-2">
            <AlertCircle className="size-6 text-action-danger" />
            <span className="font-semibold text-rose-200">Credential Not Available</span>
            <p className="text-xs text-rose-300/80">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* QR Canvas */}
            <div
              ref={qrRef}
              className="surface-card bg-white p-5 flex flex-col items-center justify-center"
            >
              <QRCodeCanvas
                value={qrText || ""}
                size={210}
                level="M"
                includeMargin
                style={{ width: "100%", maxWidth: 210, height: "auto" }}
              />
              <div className="surface-card mt-2 text-xs font-bold text-text-muted font-mono flex items-center gap-1.5 bg-bg-elevated px-3 py-1">
                <span className="w-4 h-4 rounded-full bg-action-success animate-ping" />
                Live Gate Token • Refreshes in {expiresIn}s
              </div>
            </div>

            {/* Window and Instructions */}
            <div className="surface-card bg-bg-elevated p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 text-action-success font-semibold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Approved Pass</span>
              </div>
              {fromDate && toDate && (
                <p className="text-xs text-text-muted">
                  Window: {new Date(fromDate).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} — {new Date(toDate).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
              <p className="text-xs text-text-muted">
                Present this QR code to the gate security scanner upon exit and entry.
              </p>
            </div>

            {/* Download Button */}
            <button
              onClick={downloadQr}
              className="surface-card w-full py-2.5 bg-bg-elevated text-text-primary text-xs font-bold hover:bg-bg-base flex items-center justify-center gap-2 transition"
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
