"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PageLoading } from "@/components/shared/LoadingStates";

function LockInner() {
  const params = useSearchParams();
  const token = params.get("t") ?? "";
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lock = async () => {
    if (!token) {
      setErr("This link is missing its token.");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    setBusy(false);
    if (res && res.ok) setDone(true);
    else setErr("This link is invalid or has already been used.");
  };

  if (done) {
    return (
      <div className="p-10 max-w-md mx-auto">
        <h1 className="text-xl font-bold">Account locked</h1>
        <p className="mt-2 text-sm">
          All sessions have been revoked. Contact your administrator to unlock.
        </p>
      </div>
    );
  }
  if (err) {
    return (
      <div className="p-10 max-w-md mx-auto">
        <h1 className="text-xl font-bold">Link invalid</h1>
        <p className="mt-2 text-sm">{err}</p>
      </div>
    );
  }
  return (
    <div className="p-10 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Lock your account</h1>
      <p className="mt-2 text-sm">
        If someone else logged into your account, click below to immediately
        revoke all sessions.
      </p>
      <button
        onClick={lock}
        disabled={busy}
        className="mt-4 rounded bg-red-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {busy ? "Locking..." : "Lock now"}
      </button>
    </div>
  );
}

export default function LockPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <LockInner />
    </Suspense>
  );
}
