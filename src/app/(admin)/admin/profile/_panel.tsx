"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { WidgetBoundary } from "@/components/admin/shared/WidgetBoundary";
import { SectionCard } from "@/components/admin/shared/SectionCard";
import {
  User as UserIcon,
  Mail,
  Shield,
  KeyRound,
  Lock,
  Save,
  Loader2,
  CheckCircle2,
  Bell,
  Eye,
  EyeOff,
  Palette,
  Sparkles,
  Moon,
  Sun,
  Droplet,
  Check,
  Activity,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "personal" | "security" | "appearance";
type Theme = "dark" | "light" | "glass";
type AccentId = "emerald" | "rose" | "sky" | "amber" | "violet";

const ACCENTS: Record<AccentId, { label: string; swatch: string; hex: string }> = {
  emerald: { label: "Emerald", swatch: "bg-emerald-500", hex: "#10b981" },
  rose: { label: "Rose", swatch: "bg-rose-500", hex: "#f43f5e" },
  sky: { label: "Sky", swatch: "bg-sky-500", hex: "#0ea5e9" },
  amber: { label: "Amber", swatch: "bg-amber-500", hex: "#f59e0b" },
  violet: { label: "Violet", swatch: "bg-violet-500", hex: "#8b5cf6" },
};

const ACCENT_KEY = "gate-monitor-account-accent";

function loadAccent(): AccentId {
  if (typeof window === "undefined") return "emerald";
  try {
    const v = window.localStorage.getItem(ACCENT_KEY) as AccentId | null;
    return v && v in ACCENTS ? v : "emerald";
  } catch {
    return "emerald";
  }
}

function applyAccent(id: AccentId) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--account-accent", ACCENTS[id].hex);
}

export function AdminProfilePanel({ tab: propTab }: { tab?: Tab } = {}) {
  const pathname = usePathname();
  const tab: Tab =
    propTab ??
    (pathname.includes("/security")
      ? "security"
      : pathname.includes("/appearance")
        ? "appearance"
        : "personal");
  const { user, role } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const addToast = useUIStore((s) => s.addToast);

  // Personal
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [photoUrl, setPhotoUrl] = useState(user?.photoUrl ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  // Security — password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Security telemetry
  const [sessions, setSessions] = useState<number | null>(null);
  const [audit, setAudit] = useState<{ action?: string; timestamp?: string }[]>([]);

  // Appearance
  const [accent, setAccent] = useState<AccentId>(loadAccent);

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  useEffect(() => {
    let alive = true;
    const headers = authHeaders();
    fetch("/api/admin/sessions", { headers, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive || !j || !Array.isArray(j.data)) return;
        setSessions(j.data.length);
      })
      .catch(() => {});
    fetch("/api/admin/audit?limit=4&offset=0", { headers, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive || !j || !Array.isArray(j.data)) return;
        setAudit(j.data);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const pickAccent = (id: AccentId) => {
    setAccent(id);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(ACCENT_KEY, id);
    } catch {}
    applyAccent(id);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined, phone: phone.trim() || null, photoUrl: photoUrl.trim() || null }),
      });
      const json = await res.json();
      if (res.ok && json.success) addToast({ title: "Profile Updated", message: "Details saved.", variant: "success" });
      else addToast({ title: "Update Failed", message: json.error?.message || json.error || "Could not save profile.", variant: "error" });
    } catch {
      addToast({ title: "Network Error", message: "Failed to save profile.", variant: "error" });
    } finally { setSavingProfile(false); }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { addToast({ title: "Mismatch", message: "New passwords do not match.", variant: "error" }); return; }
    if (newPassword.length < 8) { addToast({ title: "Too Short", message: "Password must be at least 8 characters.", variant: "error" }); return; }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", { method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const json = await res.json();
      if (res.ok && json.success) { addToast({ title: "Password Changed", message: "All other sessions have been revoked.", variant: "success" }); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
      else addToast({ title: "Password Change Failed", message: json.error?.message || json.error || "Current password may be incorrect.", variant: "error" });
    } catch { addToast({ title: "Network Error", message: "Failed to change password.", variant: "error" }); }
    finally { setSavingPassword(false); }
  };

  const changePin = async (_e: React.FormEvent) => {
    // PIN removed — password-only auth model
  };

  const initials = useMemo(() => (name || user?.name || role || "U").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join(""), [name, user?.name, role]);

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="My Profile" subtitle="Manage everything about this account — identity, credentials & sign-in security, and console appearance." />

      {/* Identity hero */}
      <WidgetBoundary title="Account">
        <SectionCard title="Account" description="Signed in to the admin console" icon={Shield} showHeader={false}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[var(--action-primary)]/15 flex items-center justify-center text-xl sm:text-2xl font-black text-[var(--action-primary)] ring-2 ring-[var(--action-primary)]/25 overflow-hidden shrink-0">
              {photoUrl ? <img src={photoUrl} alt="" width={80} height={80} className="w-full h-full object-cover" /> : initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-[var(--text-primary)] truncate">{user?.name || "Administrator"}</p>
              <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5 truncate">
                <Mail className="w-3.5 h-3.5" />
                {user?.email || "admin@jntuhcej.ac.in"}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--action-primary)]/15 text-[var(--action-primary)] uppercase tracking-wider">{role || "ADMIN"}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Active
                </span>
              </div>
            </div>
          </div>
        </SectionCard>
      </WidgetBoundary>

      {/* ── Personal ── */}
      {tab === "personal" && (
        <WidgetBoundary title="Personal Details">
          <SectionCard title="Personal Details" description="Modify your display identity and contact information" icon={UserIcon}>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Full Name</label>
                <Field value={name} onChange={setName} placeholder="Full Legal Name" required />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)]">Email (Immutable)</label>
                <Field value={user?.email ?? ""} disabled />
                <p className="text-[11px] text-[var(--text-muted)]">Email changes require a root database migration.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Official Phone</label>
                  <Field value={phone} onChange={setPhone} placeholder="+91 98765 43210" type="tel" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Avatar / Photo URL</label>
                  <Field value={photoUrl} onChange={setPhotoUrl} placeholder="https://…" type="url" />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <PrimaryButton type="submit" disabled={savingProfile} icon={Save} loading={savingProfile}>Save Changes</PrimaryButton>
              </div>
            </form>
          </SectionCard>
        </WidgetBoundary>
      )}

      {/* ── Security ── */}
      {tab === "security" && (
        <div className="space-y-6">
          <WidgetBoundary title="Change Password">
            <SectionCard title="Change Password" description="Update your web sign-in credential" icon={KeyRound}>
              <form onSubmit={changePassword} className="space-y-4">
                <div className="relative space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">Current Password</label>
                  <div className="relative">
                    <Field value={currentPassword} onChange={setCurrentPassword} type={showPw ? "text" : "password"} placeholder="Enter existing password" required />
                    <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">New Password</label>
                    <Field value={newPassword} onChange={setNewPassword} type={showPw ? "text" : "password"} placeholder="Min 8 characters" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--text-secondary)]">Confirm Password</label>
                    <Field value={confirmPassword} onChange={setConfirmPassword} type={showPw ? "text" : "password"} placeholder="Repeat new password" required />
                  </div>
                </div>
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300/90 flex items-start gap-2.5">
                  <KeyRound className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Changing your password revokes every other active session and device immediately.</span>
                </div>
                <div className="flex justify-end">
                  <PrimaryButton type="submit" disabled={savingPassword} icon={Lock} loading={savingPassword}>Change Password</PrimaryButton>
                </div>
              </form>
            </SectionCard>
          </WidgetBoundary>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoTile icon={Activity} tone="sky" title="Active Sessions" body={sessions === null ? "Live count unavailable" : `${sessions} signed in`} action={{ label: "Manage", href: "/admin/users" }} />
            <InfoTile icon={Shield} tone="rose" title="Credential Security" body="Password & session controls active" action={{ label: "Manage", href: "/admin/users" }} />
            <InfoTile icon={ScrollText} tone="emerald" title="Recent Activity" body={audit.length ? audit.slice(0, 2).map((a) => a.action || "Event").join(" · ") : "No recent events"} action={{ label: "Audit Log", href: "/admin/audit-logs" }} />
          </div>
        </div>
      )}

      {/* ── Appearance ── */}
      {tab === "appearance" && (
        <div className="space-y-6">
          <WidgetBoundary title="Console Theme">
            <SectionCard title="Console Theme" description="Choose how the admin console looks" icon={Palette}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {([
                  { id: "dark", label: "Dark", Icon: Moon },
                  { id: "light", label: "Light", Icon: Sun },
                  { id: "glass", label: "Glossy", Icon: Droplet },
                ] as const).map(({ id, label, Icon }) => {
                  const active = theme === id;
                  return (
                    <button key={id} type="button" onClick={() => setTheme(id as Theme)} aria-pressed={active}
                      className={cn("flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all",
                        active ? "border-[var(--action-primary)] bg-[var(--action-primary)]/10 text-[var(--text-primary)] shadow-lg" : "border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]")}>
                      <Icon className={cn("w-5 h-5", active && "text-[var(--action-primary)]")} />
                      <span className="text-xs font-semibold">{label}</span>
                      {active && <span className="text-[10px] text-[var(--action-primary)]">Active</span>}
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          </WidgetBoundary>

          <WidgetBoundary title="Accent & Backgrounds">
            <SectionCard title="Accent & Backgrounds" description="Signature color that tints your active background" icon={Sparkles}>
              <div className="space-y-3">
                <p className="text-xs text-[var(--text-muted)]">Pick a signature accent that tints your active background and recolors buttons, rings, and the active nav.</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {(Object.keys(ACCENTS) as AccentId[]).map((id) => {
                    const a = ACCENTS[id];
                    const active = accent === id;
                    return (
                      <button key={id} type="button" onClick={() => pickAccent(id)} aria-pressed={active} aria-label={`Use ${a.label} accent`} title={a.label}
                        className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95", a.swatch,
                          active ? "ring-2 ring-offset-2 ring-offset-[var(--bg-surface)] ring-white/70 scale-105" : "opacity-70 hover:opacity-100")}>
                        {active && <Check className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="capitalize">Current accent: {ACCENTS[accent].label}</span>
                </div>
              </div>
            </SectionCard>
          </WidgetBoundary>

          <WidgetBoundary title="Notifications">
            <SectionCard title="Notifications" description="How you are notified of gate and campus events" icon={Bell}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Gate passes, visitor arrivals &amp; emergency alerts</p>
                  <p className="text-xs text-[var(--text-muted)]">Configure which events reach you, and where.</p>
                </div>
                <a href="/admin/notification-settings" className="text-xs font-semibold text-[var(--action-primary)] hover:underline shrink-0 mt-1">Configure →</a>
              </div>
            </SectionCard>
          </WidgetBoundary>
        </div>
      )}
    </div>
  );
}

/* ── Small form primitives ── */

function Field({ value, onChange, placeholder, type = "text", disabled, required, inputMode }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean; required?: boolean; inputMode?: "numeric" | "text" | "email" | "tel" | "url";
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange?.(e.target.value)}
      onInput={(e) => { const raw = (e.target as HTMLInputElement).value; if (inputMode === "numeric") onChange?.(raw.replace(/\D/g, "")); }}
      placeholder={placeholder} disabled={disabled} required={required}
      className={cn("w-full px-3.5 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--action-primary)] transition-colors",
        disabled && "bg-[var(--bg-base)] text-[var(--text-muted)] cursor-not-allowed opacity-80")} />
  );
}

function PrimaryButton({ children, type = "button", icon: Icon, loading, disabled }: {
  children: React.ReactNode; type?: "button" | "submit"; icon: LucideIcon; loading?: boolean; disabled?: boolean;
}) {
  return (
    <button type={type} disabled={disabled || loading}
      className={cn("px-5 py-2.5 rounded-xl bg-[var(--action-primary)] hover:opacity-90 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg")}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
}

function InfoTile({ icon: Icon, tone, title, body, action }: {
  icon: LucideIcon; tone: "sky" | "rose" | "emerald"; title: string; body: string; action?: { label: string; href: string };
}) {
  const toneClass = tone === "sky" ? "text-sky-400" : tone === "rose" ? "text-rose-400" : "text-emerald-400";
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 space-y-1.5">
      <div className={cn("flex items-center gap-2 font-bold text-sm", toneClass)}>
        <Icon className="w-4 h-4" />
        {title}
      </div>
      <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{body}</p>
      {action && (
        <a href={action.href} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--action-primary)] hover:underline">
          {action.label} →
        </a>
      )}
    </div>
  );
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const state = useAuthStore.getState();
  const token = state.token;
  if (token) return { Authorization: `Bearer ${token}` };
  try {
    const raw = window.localStorage.getItem("gate-monitor-auth") || window.localStorage.getItem("gate-monitor-token");
    const t = raw ? JSON.parse(raw)?.state?.token || raw : null;
    if (t && !t.startsWith("{")) return { Authorization: `Bearer ${t}` };
  } catch {}
  return {};
}
