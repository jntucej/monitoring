"use client";
import { useEffect, useState } from "react";
import { QrCode, Loader2 } from "lucide-react";
import { QRCode } from "react-qrcode-logo";
import { parseRollNumber } from "@/lib/rollNumber";
import type { Student } from "@/lib/types";

export function DigitalIdCard() {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const authRaw = localStorage.getItem("gate-monitor-auth");
        const auth = authRaw ? JSON.parse(authRaw) : null;
        // Demo: roll from auth or fallback to sample
        const roll = auth?.user?.roll ?? auth?.user?.studentRoll ?? "24JJ1A0501";
        const res = await fetch(`/api/students/${encodeURIComponent(roll)}`, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          setStudent(json.data ?? null);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
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

  if (!student) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-8 text-sm text-[var(--text-muted)]">
        Student record not found.
      </div>
    );
  }

  const decoded = parseRollNumber(student.roll);
  const photoSrc = student.photo || "/avatar-placeholder.png";

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-8 flex flex-col items-center">
      {/* Student Photo */}
      <div className="relative w-32 h-32 rounded-full mb-4 border-4 border-sky-500 overflow-hidden">
        <img src={photoSrc} alt={student.name} className="rounded-full w-full h-full object-cover" />
      </div>

      {/* Basic Info */}
      <h2 className="text-2xl font-bold">{student.name}</h2>
      <p className="text-[var(--text-secondary)] font-mono text-lg">{student.roll}</p>

      {decoded && (
        <div className="mt-3 px-4 py-2 bg-[var(--bg-base)]/50 rounded-lg text-center">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {decoded.departmentFullName}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {decoded.entryMode} • Batch {decoded.admissionYear}
          </p>
        </div>
      )}

      {/* Roll Number Breakdown */}
      <div className="mt-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-[var(--text-muted)] uppercase">Roll Number Breakdown</span>
        </div>
        <div className="grid grid-cols-5 gap-px bg-[var(--border)] rounded-lg overflow-hidden">
          <div className="bg-[var(--bg-base)] p-2 text-center">
            <div className="text-xs text-[var(--text-muted)]">Year</div>
            <div className="font-mono text-sm font-medium text-[var(--text-primary)]">{decoded?.yearCode ?? "—"}</div>
          </div>
          <div className="bg-[var(--bg-base)] p-2 text-center">
            <div className="text-xs text-[var(--text-muted)]">College</div>
            <div className="font-mono text-sm font-medium text-[var(--text-primary)]">{decoded?.collegeCode ?? "—"}</div>
          </div>
          <div className="bg-[var(--bg-base)] p-2 text-center">
            <div className="text-xs text-[var(--text-muted)]">Entry</div>
            <div className="font-mono text-sm font-medium text-[var(--text-primary)]">{decoded?.entryModeCode ?? "—"}</div>
          </div>
          <div className="bg-[var(--bg-base)] p-2 text-center">
            <div className="text-xs text-[var(--text-muted)]">Dept</div>
            <div className="font-mono text-sm font-medium text-[var(--text-primary)]">{decoded?.departmentCode ?? "—"}</div>
          </div>
          <div className="bg-[var(--bg-base)] p-2 text-center">
            <div className="text-xs text-[var(--text-muted)]">Serial</div>
            <div className="font-mono text-sm font-medium text-[var(--text-primary)]">{decoded?.serial ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* QR Code */}
      <div className="mt-6 p-4 bg-white rounded-lg">
        <QRCode value={student.roll} size={160} />
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)] flex items-center gap-1">
        <QrCode className="w-3 h-3" />
        Scan for verification
      </p>
    </div>
  );
}
