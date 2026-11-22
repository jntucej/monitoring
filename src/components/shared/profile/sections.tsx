/**
 * shared/profile sections + persona modules.
 *
 * Shared sections (every persona): Identity, Preferences, Documents,
 * Privacy, Security.
 * Persona modules: Commute (day_scholar), Residence (hosteller),
 * Guardian (both), OutpassDefaults (hosteller).
 */

"use client";

import { useState, useEffect } from "react";
import {
  User, FileText, Shield, Car, Building, Ticket, Lock,
  CheckCircle2, Save,
} from "lucide-react";
import { getAuthHeaders, cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { usePersona } from "@/hooks/usePersona";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { EditableField } from "@/components/shared/EditableField";
import type { Persona } from "@/lib/pass-types";

// ═══════════════════════════════════════════════════════════
// Shared section: Identity
// ═══════════════════════════════════════════════════════════

export function IdentitySection() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (user) {
      setName((user as { name?: string }).name ?? "");
      setEmail((user as { email?: string }).email ?? "");
      setPhone((user as { phone?: string }).phone ?? "");
    }
  }, [user]);

  if (!user) return null;

  const save = async () => {
    try {
      await fetch("/api/student/identity", {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      addToast({ variant: "success", title: "Identity updated", message: "Your details have been saved." });
    } catch {
      addToast({ variant: "error", title: "Update failed", message: "Could not save your identity." });
    }
  };

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
        <User className="h-3.5 w-3.5" /> Identity
      </p>
      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="text-[10px] text-text-muted block mb-0.5">Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary focus:outline-none" />
        </div>
        <div>
          <label className="text-[10px] text-text-muted block mb-0.5">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)}
            className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary focus:outline-none" />
        </div>
        <div>
          <label className="text-[10px] text-text-muted block mb-0.5">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary focus:outline-none" />
        </div>
      </div>
      <button
        type="button"
        onClick={() => void save()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
      >
        <Save className="h-3.5 w-3.5" /> Save
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Shared section: Documents
// ═══════════════════════════════════════════════════════════

export function DocumentsSection() {
  const { addToast } = useUIStore();
  const [docs, setDocs] = useState<{ name: string; uploadedAt: string }[]>([]);

  useEffect(() => {
    fetch("/api/documents", { headers: getAuthHeaders(), cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => setDocs((b?.data ?? []) as { name: string; uploadedAt: string }[]))
      .catch(() => {});
  }, []);

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-4 space-y-3">
      <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5" /> Documents
      </p>
      {docs.length === 0 ? (
        <p className="text-xs text-text-muted">No documents uploaded.</p>
      ) : (
        <div className="space-y-1.5">
          {docs.map((d, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-bg-base px-3 py-2 text-xs">
              <span className="text-text-primary">{d.name}</span>
              <span className="text-text-muted">{new Date(d.uploadedAt).toLocaleDateString("en-IN")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Shared section: Privacy & Access
// ═══════════════════════════════════════════════════════════

export function PrivacySection() {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-4 space-y-3">
      <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
        <Shield className="h-3.5 w-3.5" /> Privacy & Access
      </p>
      <p className="text-xs text-text-muted">
        Who can see your location, mess preferences, and complaint history is
        managed by your school admin. Contact the front office for changes.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Shared section: Security
// ═══════════════════════════════════════════════════════════

export function SecuritySection() {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-4 space-y-3">
      <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
        <Lock className="h-3.5 w-3.5" /> Security
      </p>
      <p className="text-xs text-text-muted">
        Use the security controls in the app menu to change your password or
        re-issue your ID QR code.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Persona module: Commute (day_scholar)
// ═══════════════════════════════════════════════════════════

export function CommuteSection() {
  const { user } = useAuthStore();
  const [mode, setMode] = useState("bus");
  const [address, setAddress] = useState((user as { address?: string })?.address ?? "");
  const { addToast } = useUIStore();

  const save = async () => {
    try {
      await fetch("/api/student/commute", {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ mode, address }),
      });
      addToast({ variant: "success", title: "Commute updated", message: "Commute preferences saved." });
    } catch {
      addToast({ variant: "error", title: "Update failed", message: "Could not save changes." });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-4 space-y-3">
      <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
        <Car className="h-3.5 w-3.5" /> Commute
      </p>
      <div>
        <label className="text-[10px] text-text-muted block mb-1">Mode</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary focus:outline-none"
        >
          <option value="bus">School bus</option>
          <option value="parent">Parent drop/pickup</option>
          <option value="own">Own transport</option>
          <option value="walk">Walk</option>
        </select>
      </div>
      <div>
        <label className="text-[10px] text-text-muted block mb-1">Pickup / drop address</label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary focus:outline-none"
        />
      </div>
      <button
        type="button"
        onClick={() => void save()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
      >
        <Save className="h-3.5 w-3.5" /> Save commute
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Persona module: Residence (hosteller)
// ═══════════════════════════════════════════════════════════

export function ResidenceSection() {
  const { user } = useAuthStore();
  const { addToast } = useUIStore();
  const block = (user as { hostelBlock?: string })?.hostelBlock ?? "";
  const room = (user as { roomNumber?: string })?.roomNumber ?? "";
  const curfew = (user as { hostelCurfewTime?: string })?.hostelCurfewTime ?? "22:00";

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-4 space-y-3">
      <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
        <Building className="h-3.5 w-3.5" /> Residence
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border bg-bg-base p-2">
          <p className="text-[10px] text-text-muted uppercase">Block</p>
          <p className="text-sm font-bold text-text-primary">{block || "—"}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-base p-2">
          <p className="text-[10px] text-text-muted uppercase">Room</p>
          <p className="text-sm font-bold text-text-primary">{room || "—"}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-base p-2">
          <p className="text-[10px] text-text-muted uppercase">Curfew</p>
          <p className="text-sm font-bold text-rose-500 tabular-nums">{curfew}</p>
        </div>
      </div>
      <p className="text-[10px] text-text-muted">
        Assigned by admin. To request a room change, file a request to the warden.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Persona module: Guardian
// ═══════════════════════════════════════════════════════════

export function GuardianSection() {
  const { user } = useAuthStore();
  const guardianId = (user as { guardianId?: string })?.guardianId;
  const { addToast } = useUIStore();

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-4 space-y-3">
      <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
        <Shield className="h-3.5 w-3.5" /> Guardian
      </p>
      {guardianId ? (
        <div className="flex items-center gap-2 text-xs text-text-primary">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          Guardian linked: <span className="font-mono text-text-muted">{guardianId}</span>
        </div>
      ) : (
        <p className="text-xs text-text-muted">No guardian linked yet.</p>
      )}
      <p className="text-[10px] text-text-muted">
        Your guardian can see your passes, curfew status, and weekly digest.
        They can approve or decline passes that require parent consent.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Persona module: Outpass Defaults (hosteller)
// ═══════════════════════════════════════════════════════════

export function OutpassDefaultsSection() {
  const { addToast } = useUIStore();
  const [reason, setReason] = useState("Home");
  const [guardianAddr, setGuardianAddr] = useState("");

  const save = async () => {
    try {
      await fetch("/api/student/outpass-defaults", {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ defaultReason: reason, defaultGuardianAddress: guardianAddr }),
      });
      addToast({ variant: "success", title: "Outpass defaults saved", message: "Defaults updated." });
    } catch {
      addToast({ variant: "error", title: "Update failed", message: "Could not save changes." });
    }
  };

  return (
    <div className="rounded-xl border border-border bg-bg-elevated p-4 space-y-3">
      <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5">
        <Ticket className="h-3.5 w-3.5" /> Outpass Defaults
      </p>
      <div>
        <label className="text-[10px] text-text-muted block mb-1">Default reason</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary focus:outline-none"
        >
          <option>Home</option>
          <option>Local outing</option>
          <option>Medical</option>
          <option>Event</option>
        </select>
      </div>
      <div>
        <label className="text-[10px] text-text-muted block mb-1">Default guardian address</label>
        <input
          value={guardianAddr}
          onChange={(e) => setGuardianAddr(e.target.value)}
          className="surface-card w-full bg-bg-base px-3 py-1.5 text-xs text-text-primary focus:outline-none"
        />
      </div>
      <button
        type="button"
        onClick={() => void save()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-action-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
      >
        <Save className="h-3.5 w-3.5" /> Save defaults
      </button>
      <p className="text-[10px] text-text-muted">
        These pre-fill the outpass form. You can override per request.
      </p>
    </div>
  );
}
