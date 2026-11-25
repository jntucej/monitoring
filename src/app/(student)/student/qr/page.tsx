"use client";

import { useEffect, useState } from "react";

export default function StudentQrPage() {
  const [tab, setTab] = useState<"identity" | "mess">("identity");
  const [identityQr, setIdentityQr] = useState<{ qr: string; roll: string; salt_day: string } | null>(null);
  const [messQr, setMessQr] = useState<{ qr: string; expires_in_s: number } | null>(null);
  const [messErr, setMessErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/qr/me/identity")
      .then((r) => r.json())
      .then((j) => {
        if (j?.data?.qr) setIdentityQr(j.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab !== "mess") return;
    const load = () => {
      fetch("/api/mess/my-qr")
        .then((r) => r.json())
        .then((j) => {
          if (j?.data?.qr) {
            setMessQr(j.data);
            setMessErr(null);
          } else {
            setMessQr(null);
            setMessErr(j?.error?.message ?? "Mess token unavailable");
          }
        })
        .catch(() => setMessErr("Failed to load mess QR"));
    };
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [tab]);

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">My QR Codes</h1>
        <div className="flex gap-2">
          {(["identity", "mess"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-1 text-xs font-semibold uppercase border ${
                tab === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "identity" && identityQr && (
        <div className="space-y-2 border border-border bg-card p-5 text-center">
          <div className="text-sm font-semibold text-foreground">Roll: {identityQr.roll}</div>
          <div className="break-all bg-muted p-3 font-mono text-xs text-foreground">{identityQr.qr}</div>
          <div className="text-xs text-muted-foreground">Daily salted identity QR ({identityQr.salt_day})</div>
        </div>
      )}

      {tab === "mess" && (
        <div className="space-y-2 border border-border bg-card p-5 text-center">
          {messErr ? (
            <div className="text-sm text-destructive">{messErr}</div>
          ) : messQr ? (
            <>
              <div className="break-all bg-muted p-3 font-mono text-xs text-foreground">{messQr.qr}</div>
              <div className="text-xs text-muted-foreground">Rotates every 30s (~{messQr.expires_in_s}s left)</div>
            </>
          ) : (
            <div className="text-sm text-foreground">Loading mess QR...</div>
          )}
        </div>
      )}
    </div>
  );
}
