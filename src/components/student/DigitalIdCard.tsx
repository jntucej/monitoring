"use client";
import { useEffect, useState, useRef } from "react";
import { usePolling } from "@/hooks/usePolling";
import { QrCode, Loader2, AlertCircle, Download } from "lucide-react";
import { QRCode } from "react-qrcode-logo";
import { parseRollNumber } from "@/lib/rollNumber";
import { useApi } from "@/hooks/useApi";
import { useAuthStore } from "@/stores/authStore";
import type { Student } from "@/lib/types";

export function DigitalIdCard() {
const api = useApi();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [downloading, setDownloading] = useState(false);
  const qrRef = useRef<HTMLDivElement | null>(null);

  usePolling(() => {
    setCountdown((prev) => (prev > 1 ? prev - 1 : 30));
  }, { intervalMs: 1000 });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const auth = useAuthStore.getState();
        const roll = auth?.user?.uniqueId;
        if (!roll) {
          if (!cancelled) {
            setError("No student roll number found in session. Please log in again.");
            setLoading(false);
          }
          return;
        }
        const res = await fetch(`/api/students/${encodeURIComponent(roll)}`, { headers: api.getHeaders(), cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          if (res.ok && json.success) {
            setStudent(json.data?.student ?? json.data ?? null);
          } else {
            setError(json.error?.message || "Failed to load student record.");
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Network error loading student data.");
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-8 flex items-center gap-2 text-[var(--text-muted)] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading ID…
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-8 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-[var(--action-danger)] mx-auto opacity-60" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">Unable to Load ID Card</p>
        <p className="text-xs text-[var(--text-muted)]">{error || "Student record not found."}</p>
      </div>
    );
  }

  const downloadQR = () => {
    if (!student) return;
    setDownloading(true);
    // Find the canvas that react-qrcode-logo renders inside the ref
    const container = qrRef.current;
    const canvas = container?.querySelector("canvas");
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `gate-id-${student.roll || "student"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    setTimeout(() => setDownloading(false), 500);
  };

  const decoded = parseRollNumber(student.roll);
  const photoSrc = student.photo || "/avatar-placeholder.png";

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col items-center">
      {/* Student Photo */}
      <div className="relative w-24 sm:w-28 md:w-28 lg:w-32 h-24 sm:h-28 md:h-28 lg:h-32 rounded-full mb-3 sm:mb-4 border-4 border-sky-500 overflow-hidden">
        <img src={photoSrc} alt={student.name} className="rounded-full w-full h-full object-cover" />
      </div>

      {/* Basic Info */}
      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-center">{student.name}</h2>
      <p className="text-sm sm:text-base md:text-lg font-mono">{student.roll}</p>

      {decoded && (
        <div className="mt-2 sm:mt-3 px-3 sm:px-4 py-1.5 sm:py-2 bg-[var(--bg-base)]/50 rounded-lg text-center">
          <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
            {decoded.departmentFullName}
          </p>
          <p className="text-[9px] sm:text-[10px] text-[var(--text-muted)]">
            {decoded.entryMode} • Batch {decoded.admissionYear}
          </p>
        </div>
      )}

      {/* Roll Number Breakdown */}
      <div className="mt-4 sm:mt-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] sm:text-xs font-medium text-[var(--text-muted)] uppercase">Roll Number Breakdown</span>
        </div>
        <div className="grid grid-cols-5 gap-px bg-[var(--border)] rounded-lg overflow-hidden">
          <div className="bg-[var(--bg-base)] p-1 sm:p-1.5 sm:p-2 text-center">
            <div className="text-[8px] sm:text-[9px] text-[var(--text-muted)]">Year</div>
            <div className="font-mono text-[8px] sm:text-xs sm:text-sm font-medium text-[var(--text-primary)]">{decoded?.yearCode ?? "—"}</div>
          </div>
          <div className="bg-[var(--bg-base)] p-1 sm:p-1.5 sm:p-2 text-center">
            <div className="text-[8px] sm:text-[9px] text-[var(--text-muted)]">College</div>
            <div className="font-mono text-[8px] sm:text-xs sm:text-sm font-medium text-[var(--text-primary)]">{decoded?.collegeCode ?? "—"}</div>
          </div>
          <div className="bg-[var(--bg-base)] p-1 sm:p-1.5 sm:p-2 text-center">
            <div className="text-[8px] sm:text-[9px] text-[var(--text-muted)]">Entry</div>
            <div className="font-mono text-[8px] sm:text-xs sm:text-sm font-medium text-[var(--text-primary)]">{decoded?.entryModeCode ?? "—"}</div>
          </div>
          <div className="bg-[var(--bg-base)] p-1 sm:p-1.5 sm:p-2 text-center">
            <div className="text-[8px] sm:text-[9px] text-[var(--text-muted)]">Dept</div>
            <div className="font-mono text-[8px] sm:text-xs sm:text-sm font-medium text-[var(--text-primary)]">{decoded?.departmentCode ?? "—"}</div>
          </div>
          <div className="bg-[var(--bg-base)] p-1 sm:p-1.5 sm:p-2 text-center">
            <div className="text-[8px] sm:text-[9px] text-[var(--text-muted)]">Serial</div>
            <div className="font-mono text-[8px] sm:text-xs sm:text-sm font-medium text-[var(--text-primary)]">{decoded?.serial ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Dynamic Anti-Screenshot QR Code */}
      <div ref={qrRef} className="mt-4 sm:mt-6 p-3 sm:p-4 bg-white rounded-2xl flex flex-col items-center shadow-lg relative">
        <QRCode value={JSON.stringify({ roll: student.roll, ts: Math.floor(Date.now() / 30000) })} size={140} />
        <div className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] font-bold text-slate-700 font-mono flex items-center gap-1 sm:gap-1.5 bg-slate-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border border-slate-200">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-ping" />
          Anti-Screenshot Security Token • Refreshes in {countdown}s
        </div>
        <button
          onClick={downloadQR}
          disabled={downloading}
          className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-700 disabled:opacity-50 transition"
        >
          <Download className="w-3.5 h-3.5" />
          {downloading ? "Saving…" : "Save QR as PNG"}
        </button>
      </div>
      <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-[var(--text-muted)] flex items-center gap-1">
        <QrCode className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-indigo-400" />
        Live Gate Verification Token
      </p>
    </div>
  );
}
