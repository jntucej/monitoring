// src/app/profile/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getAuthHeaders } from "@/lib/utils";
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  KeyRound,
  Lock,
  Save,
  Loader2,
  CheckCircle2,
  Fingerprint,
  Bell,
  Eye,
  EyeOff,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 *  Types
 * ------------------------------------------------------------------ */
interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  uniqueId: string | null;
  photoUrl: string | null;
  departmentId: string | null;
  twoFactorEnabled: boolean;
  studentDetails?: { roll?: string; year?: number; section?: string; hostel_block?: string; room_number?: string } | null;
  employeeDetails?: { employee_id?: string; designation?: string; department_id?: string } | null;
}

type Tab = "personal" | "security" | "appearance";

/* ------------------------------------------------------------------ *
 *  Helpers
 * ------------------------------------------------------------------ */
function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const utilHeaders = getAuthHeaders();
  if (Object.keys(utilHeaders).length > 0) return utilHeaders;

  const token =
    localStorage.getItem("auth-token") ||
    sessionStorage.getItem("auth-token") ||
    (() => {
      try {
        const raw = localStorage.getItem("gate-monitor-auth") || localStorage.getItem("auth-store");
        return raw ? JSON.parse(raw)?.state?.token : null;
      } catch {
        return null;
      }
    })();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    sysadmin: "System Administrator",
    admin: "Administrator",
    operator: "Gate Operator",
    student: "Student",
    faculty: "Faculty",
    staff: "Staff",
    worker: "Worker",
    visitor: "Visitor",
    parent: "Parent",
    guardian: "Guardian",
    warden: "Warden",
    hod: "Head of Department",
    supervisor: "Supervisor",
  };
  return map[role] || role;
}

/* ------------------------------------------------------------------ *
 *  Page
 * ------------------------------------------------------------------ */
export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileDashboard />
    </AuthGuard>
  );
}

function ProfileDashboard() {
  const addToast = useUIStore((s) => s.success);
  const addError = useUIStore((s) => s.error);
  const setUser = useAuthStore((s) => s.setUser);

  const [tab, setTab] = useState<Tab>("personal");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  // Personal form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  // PIN form
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  /* -------------------- Load profile -------------------- */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile", { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load profile");
      }
      setProfile(json.data);
      setName(json.data.name ?? "");
      setPhone(json.data.phone ?? "");
    } catch (e: any) {
      addError(e.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [addError]);

  useEffect(() => {
    load();
  }, [load]);

  /* -------------------- Save name/phone -------------------- */
  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingName(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Update failed");

      setProfile({ ...profile, name, phone });
      // Keep the auth store in sync so the sidebar/header update immediately
      const current = useAuthStore.getState().user;
      if (current) setUser({ ...current, name });
      addToast("Profile updated");
    } catch (e: any) {
      addError(e.message || "Update failed");
    } finally {
      setSavingName(false);
    }
  };

  /* -------------------- Change password -------------------- */
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addError("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      addError("Password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || json.error || "Password change failed");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      addToast("Password changed — you will be signed out on other devices");
    } catch (e: any) {
      addError(e.message || "Password change failed");
    } finally {
      setSavingPassword(false);
    }
  };

  /* -------------------- Change PIN -------------------- */
  const changePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      addError("New PINs do not match");
      return;
    }
    if (!/^\d{4,8}$/.test(newPin)) {
      addError("PIN must be 4–8 digits");
      return;
    }
    setSavingPin(true);
    try {
      const res = await fetch("/api/auth/pin-change", {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message || json.error || "PIN change failed");

      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      addToast("PIN updated");
    } catch (e: any) {
      addError(e.message || "PIN change failed");
    } finally {
      setSavingPin(false);
    }
  };

  /* -------------------- Render -------------------- */
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin w-8 h-8 text-[var(--action-primary)]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto mt-16 glass-card p-8 text-center">
        <p className="text-[var(--text-secondary)]">Could not load profile.</p>
        <Button className="mt-4" onClick={load}>Retry</Button>
      </div>
    );
  }

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header card */}
      <div className="glass-card p-6 flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold">
          {initials || <UserIcon className="w-8 h-8" />}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] truncate">
            {profile.name}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] truncate">
            {profile.email}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="success">{roleLabel(profile.role)}</Badge>
            <Badge variant={profile.status === "ACTIVE" ? "success" : "error"}>
              {profile.status}
            </Badge>
            {profile.twoFactorEnabled && (
              <Badge variant="success">
                <Shield className="w-3 h-3 mr-1" /> 2FA On
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)]">
        {([
          { id: "personal", label: "Personal", icon: UserIcon },
          { id: "security", label: "Security", icon: Lock },
          { id: "appearance", label: "Notifications", icon: Bell },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
              tab === t.id
                ? "border-[var(--action-primary)] text-[var(--action-primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* ---------------- Personal tab ---------------- */}
      {tab === "personal" && (
        <form onSubmit={saveName} className="glass-card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Personal details
          </h2>

          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">
              Full name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              required
              minLength={2}
              maxLength={100}
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              This is the name shown on gate passes, logs and the campus dashboard.
            </p>
          </div>

          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">
              Email
            </label>
            <Input value={profile.email} disabled />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Email changes require administrator approval.
            </p>
          </div>

          <div>
            <label className="block text-sm mb-1 text-[var(--text-secondary)]">
              Phone
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              type="tel"
            />
          </div>

          {profile.uniqueId && (
            <div>
              <label className="block text-sm mb-1 text-[var(--text-secondary)]">
                {profile.role === "student" ? "Roll number" : "Employee ID"}
              </label>
              <Input value={profile.uniqueId} disabled />
            </div>
          )}

          {profile.studentDetails && (
            <div className="grid grid-cols-2 gap-4">
              {profile.studentDetails.year != null && (
                <div>
                  <label className="block text-sm mb-1 text-[var(--text-secondary)]">Year</label>
                  <Input value={String(profile.studentDetails.year)} disabled />
                </div>
              )}
              {profile.studentDetails.hostel_block && (
                <div>
                  <label className="block text-sm mb-1 text-[var(--text-secondary)]">Hostel</label>
                  <Input value={profile.studentDetails.hostel_block} disabled />
                </div>
              )}
            </div>
          )}

          {profile.employeeDetails && (
            <div className="grid grid-cols-2 gap-4">
              {profile.employeeDetails.designation && (
                <div>
                  <label className="block text-sm mb-1 text-[var(--text-secondary)]">Designation</label>
                  <Input value={profile.employeeDetails.designation} disabled />
                </div>
              )}
              {profile.employeeDetails.employee_id && (
                <div>
                  <label className="block text-sm mb-1 text-[var(--text-secondary)]">Employee ID</label>
                  <Input value={profile.employeeDetails.employee_id} disabled />
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={savingName}>
              {savingName ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
              ) : (
                <><Save className="w-4 h-4 mr-2" /> Save changes</>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* ---------------- Security tab ---------------- */}
      {tab === "security" && (
        <div className="space-y-6">
          {/* Password */}
          <form onSubmit={changePassword} className="glass-card p-6 space-y-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <KeyRound className="w-5 h-5" /> Change password
            </h2>

            <div>
              <label className="block text-sm mb-1 text-[var(--text-secondary)]">
                Current password
              </label>
              <Input
                type={showPw ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="block text-sm mb-1 text-[var(--text-secondary)]">
                New password
              </label>
              <Input
                type={showPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Minimum 8 characters. All other sessions will be signed out.
              </p>
            </div>

            <div>
              <label className="block text-sm mb-1 text-[var(--text-secondary)]">
                Confirm new password
              </label>
              <Input
                type={showPw ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPw}
                onChange={(e) => setShowPw(e.target.checked)}
                className="rounded"
              />
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              Show passwords
            </label>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingPassword}>
                {savingPassword ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…</>
                ) : (
                  <><Lock className="w-4 h-4 mr-2" /> Change password</>
                )}
              </Button>
            </div>
          </form>

          {/* PIN — operators, workers, staff */}
          {["operator", "worker", "staff", "faculty", "admin", "sysadmin"].includes(profile.role) && (
            <form onSubmit={changePin} className="glass-card p-6 space-y-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <Fingerprint className="w-5 h-5" /> Change gate PIN
              </h2>

              <div>
                <label className="block text-sm mb-1 text-[var(--text-secondary)]">
                  Current PIN
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  pattern="\d*"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                  maxLength={8}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-[var(--text-secondary)]">
                    New PIN
                  </label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="\d*"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    maxLength={8}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-[var(--text-secondary)]">
                    Confirm PIN
                  </label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    pattern="\d*"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    maxLength={8}
                    required
                  />
                </div>
              </div>

              <p className="text-xs text-[var(--text-muted)]">
                4–8 digits. Used for kiosk/gate login, not for web sign-in.
              </p>

              <div className="flex justify-end">
                <Button type="submit" disabled={savingPin}>
                  {savingPin ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Update PIN</>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* 2FA */}
          <div className="glass-card p-6 space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Shield className="w-5 h-5" /> Two-factor authentication
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              {profile.twoFactorEnabled
                ? "2FA is enabled on this account. You will be asked for a TOTP code at sign-in."
                : "2FA is not enabled. System administrators are required to enable it."}
            </p>
            <div className="flex justify-end">
              <a
                href="/sysadmin/security"
                className="text-sm text-[var(--action-primary)] hover:underline"
              >
                Manage 2FA →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Notifications tab ---------------- */}
      {tab === "appearance" && (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Bell className="w-5 h-5" /> Notification preferences
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Choose how you receive gate passes, visitor arrivals and emergency alerts.
          </p>
          <div className="flex justify-end">
            <a
              href="/settings/notifications"
              className="text-sm text-[var(--action-primary)] hover:underline"
            >
              Open notification settings →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
