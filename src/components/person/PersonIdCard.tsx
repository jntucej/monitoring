"use client";
import { useEffect, useState } from "react";
import { QrCode, Loader2 } from "lucide-react";
import { QRCode } from "react-qrcode-logo";
import { parseRollNumber } from "@/lib/rollNumber";
import type { Person } from "@/lib/types";
import { PersonBadge } from "@/components/shared/PersonBadge";

interface PersonIdCardProps {
  person?: Person | null;
  type?: string;
}

export function PersonIdCard({ person: initialPerson, type }: PersonIdCardProps = {}) {
  const [person, setPerson] = useState<Person | null>(initialPerson || null);
  const [loading, setLoading] = useState(!initialPerson);

  useEffect(() => {
    if (initialPerson) {
      setPerson(initialPerson);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const authRaw = localStorage.getItem("gate-monitor-auth");
        const auth = authRaw ? JSON.parse(authRaw) : null;
        const uniqueId = auth?.user?.uniqueId ?? auth?.user?.roll ?? auth?.user?.studentRoll ?? "24JJ1A0501";
        const res = await fetch(`/api/persons/${encodeURIComponent(uniqueId)}`, { cache: "no-store" });
        const json = await res.json();
        if (!cancelled) {
          const data = json.data?.person ?? json.data ?? null;
          setPerson(data);
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
  }, [initialPerson]);

  if (loading) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-8 flex items-center gap-2 text-[var(--text-muted)] text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading ID...
      </div>
    );
  }

  if (!person) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-8 text-sm text-[var(--text-muted)]">
        Person record not found.
      </div>
    );
  }

  const uniqueId = person.uniqueId || person.roll;
  const decoded = person.personType === "student" && uniqueId ? parseRollNumber(uniqueId) : null;
  const photoSrc = person.photoUrl || person.photo || "/avatar-placeholder.png";

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-8 flex flex-col items-center">
      {/* Person Photo */}
      <div className="relative w-32 h-32 rounded-full mb-4 border-4 border-sky-500 overflow-hidden">
        <img src={photoSrc} alt={person.fullName || person.name} className="rounded-full w-full h-full object-cover" />
      </div>

      {/* Basic Info */}
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-2xl font-bold text-white">{person.fullName || person.name}</h2>
        <PersonBadge type={person.personType} />
      </div>
      <p className="text-[var(--text-secondary)] font-mono text-lg">{uniqueId}</p>
      {person.department && (
        <p className="text-sm font-medium text-slate-300 mt-1">{person.department} {person.designation ? `• ${person.designation}` : ""}</p>
      )}

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

      {/* QR Code */}
      <div className="mt-6 p-4 bg-white rounded-lg">
        <QRCode value={uniqueId || person.id} size={160} />
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)] flex items-center gap-1">
        <QrCode className="w-3 h-3" />
        Scan for gate entry / exit
      </p>
    </div>
  );
}

export { PersonIdCard as DigitalIdCard };
