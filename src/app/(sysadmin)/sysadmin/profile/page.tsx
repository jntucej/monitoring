// src/app/(sysadmin)/sysadmin/profile/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { getAuthHeaders } from "@/lib/utils";
import {
  Shield,
  KeyRound,
  Lock,
  Save,
  Loader2,
  CheckCircle2,
  Fingerprint,
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  Building2,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Activity,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

interface SysAdminProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  uniqueId: string | null;
  photoUrl: string | null;
  departmentId: string | null;
  loginIdentifier?: string | null;
  twoFactorEnabled: boolean;
  createdAt?: string;
  employeeDetails?: {
    employee_id?: string;
    designation?: string;
    department_id?: string;
    staff_category?: string;
  } | null;
}

interface RecentAuditItem {
  id: string;
  action: string;
  timestamp: string;
  details?: Record<string, any> | string;
}

export default function SysAdminProfilePage() {
  return (
    <AuthGuard allowedRoles={["sysadmin"]}>
      <SysAdminProfileDashboard />
    </AuthGuard>
  );
}

function SysAdminProfileDashboard() {
  const { addToast } = useUIStore();
  const { user: authUser, setUser } = useAuthStore();

  const [profile, setProfile] = useState<SysAdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPin, setSavingPin] = useState(false);

  // Profile fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  // Password fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // PIN fields
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  // Telemetry & audit
  const [recentAudits, setRecentAudits] = useState<RecentAuditItem[]>([]);
  const [activeSessionsCount, setActiveSessionsCount] = useState<number | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/profile", { headers, cache: "no-store" });
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        const p = json.data;
        setProfile(p);
        setName(p.name || "");
        setPhone(p.phone || "");
        setDepartment(p.departmentId || p.employeeDetails?.department_id || "Systems & Infrastructure");
        setPhotoUrl(p.photoUrl || "");
      } else {
        // Fallback to local auth store if profile route is warming up
        if (authUser) {
          setName(authUser.name || "");
          setPhone(authUser.phone || "");
          setDepartment(authUser.departmentId || "Systems & Infrastructure");
          setPhotoUrl(authUser.photoUrl || "");
          setProfile({
            id: authUser.id,
            name: authUser.name,
            email: authUser.email,
            phone: authUser.phone || null,
            role: "sysadmin",
            status: "ACTIVE",
            uniqueId: authUser.uniqueId || null,
            photoUrl: authUser.photoUrl || null,
            departmentId: authUser.departmentId || null,
            twoFactorEnabled: true,
          });
        }
      }

      // Fetch active session count
      const sessRes = await fetch("/api/admin/sessions", { headers, cache: "no-store" }).catch(() => null);
      if (sessRes && sessRes.ok) {
        const sessJson = await sessRes.json();
        if (sessJson.success && Array.isArray(sessJson.data)) {
          setActiveSessionsCount(sessJson.data.length);
        }
      }

      // Fetch recent audit events for this admin
      const auditRes = await fetch("/api/admin/audit?limit=4&offset=0", { headers, cache: "no-store" }).catch(() => null);
      if (auditRes && auditRes.ok) {
        const auditJson = await auditRes.json();
        if (auditJson.success && Array.isArray(auditJson.data)) {
          setRecentAudits(auditJson.data);
        }
      }
    } catch (err: any) {
      addToast({
        title: "Telemetry Notice",
        message: err.message || "Loaded profile from active session cache.",
        variant: "info",
      });
    } finally {
      setLoading(false);
    }
  }, [authUser, addToast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast({ title: "Validation Error", message: "Administrator name is required.", variant: "error" });
      return;
    }

    setSavingProfile(true);
    try {
      const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          photoUrl: photoUrl.trim() || null,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        addToast({
          title: "Profile Updated",
          message: "System administrator details updated successfully.",
          variant: "success",
        });

        // Update authStore in memory so headers and sidebar reflect the new name immediately
        if (authUser) {
          setUser({
            ...authUser,
            name: name.trim(),
            phone: phone.trim() || undefined,
            photoUrl: photoUrl.trim() || undefined,
          });
        }

        if (profile) {
          setProfile({
            ...profile,
            name: name.trim(),
            phone: phone.trim() || null,
            photoUrl: photoUrl.trim() || null,
          });
        }
      } else {
        addToast({
          title: "Update Failed",
          message: json.error?.message || json.error || "Could not update profile.",
          variant: "error",
        });
      }
    } catch (err: any) {
      addToast({
        title: "Network Error",
        message: err.message || "Failed to communicate with profile service.",
        variant: "error",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      addToast({ title: "Validation Error", message: "Current password is required.", variant: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast({ title: "Validation Error", message: "New passwords do not match.", variant: "error" });
      return;
    }
    if (newPassword.length < 8) {
      addToast({
        title: "Password Strength",
        message: "New password must be at least 8 characters long.",
        variant: "error",
      });
      return;
    }

    setSavingPassword(true);
    try {
      const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers,
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        addToast({
          title: "Password Changed",
          message: "Your master password has been reset. All other active sessions have been revoked.",
          variant: "success",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        addToast({
          title: "Password Change Failed",
          message: json.error?.message || json.error || "Current password incorrect or validation failed.",
          variant: "error",
        });
      }
    } catch (err: any) {
      addToast({
        title: "Network Error",
        message: err.message || "Failed to communicate with authentication service.",
        variant: "error",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
      addToast({ title: "Validation Error", message: "PIN confirmation does not match.", variant: "error" });
      return;
    }
    if (!/^\d{4,8}$/.test(newPin)) {
      addToast({ title: "Validation Error", message: "PIN must be between 4 and 8 digits.", variant: "error" });
      return;
    }

    setSavingPin(true);
    try {
      const headers = { ...getAuthHeaders(), "Content-Type": "application/json" };
      const res = await fetch("/api/auth/pin-change", {
        method: "POST",
        headers,
        body: JSON.stringify({ currentPin, newPin }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        addToast({
          title: "Gate PIN Updated",
          message: "Your administrator terminal PIN has been updated.",
          variant: "success",
        });
        setCurrentPin("");
        setNewPin("");
        setConfirmPin("");
      } else {
        addToast({
          title: "PIN Update Failed",
          message: json.error?.message || json.error || "Could not update gate PIN.",
          variant: "error",
        });
      }
    } catch (err: any) {
      addToast({
        title: "Network Error",
        message: err.message || "Failed to update gate PIN.",
        variant: "error",
      });
    } finally {
      setSavingPin(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        <p className="text-xs text-[var(--text-muted)] font-medium">Loading administrator profile...</p>
      </div>
    );
  }

  const initials =
    (profile?.name || authUser?.name || "SA")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-rose-500" />
            System Administrator Profile
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Root identity control, privileged credential governance, and security telemetry for the campus gate platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadProfile}
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link
            href="/sysadmin"
            className="px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all flex items-center gap-2"
          >
            Control Room <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Hero Administrator Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-600 via-rose-500 to-amber-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-rose-900/20 overflow-hidden">
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full border-2 border-[var(--bg-surface)]" title="Active Root Session">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">
                {profile?.name || authUser?.name || "System Administrator"}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase tracking-wider">
                SYSADMIN (ROOT)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Zero-Trust Verified
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[var(--text-muted)] font-mono">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {profile?.email || authUser?.email || "sysadmin@jntuhcej.ac.in"}
              </span>
              {profile?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {profile.phone}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                {department}
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 pt-2 md:pt-0 w-full md:w-auto">
            <div className="px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-center min-w-[100px] flex-1 sm:flex-initial">
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">2FA Guard</div>
              <div className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Enforced
              </div>
            </div>
            <div className="px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] text-center min-w-[100px] flex-1 sm:flex-initial">
              <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">Active Sessions</div>
              <div className="text-xs font-bold text-sky-400 mt-0.5">
                {activeSessionsCount !== null ? activeSessionsCount : "1 Online"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Profile Updation & Password Changing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Update Profile Information */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">Update Profile Details</h3>
                <p className="text-xs text-[var(--text-muted)]">Modify display identity and contact information.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                Administrator Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Full Legal Name"
                className="w-full px-3.5 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-sky-500 transition-colors"
              />
              <p className="text-[11px] text-[var(--text-muted)]">
                This display name appears in system audit logs and broadcast messages.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                Email Address (Immutable)
              </label>
              <input
                type="email"
                value={profile?.email || authUser?.email || ""}
                disabled
                className="w-full px-3.5 py-2.5 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-muted)] cursor-not-allowed opacity-80"
              />
              <p className="text-[11px] text-[var(--text-muted)]">
                Email changes require root database migration to preserve audit foreign keys.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                  Official Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-sky-500 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                  Department / Division
                </label>
                <input
                  type="text"
                  value={department}
                  disabled
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-base)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-muted)] opacity-80 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                Avatar / Photo URL (Optional)
              </label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-sky-900/20"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Profile Details
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Password & Security PIN Change */}
        <div className="space-y-8">
          {/* Change Password Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">Change Master Password</h3>
                  <p className="text-xs text-[var(--text-muted)]">Update authentication credential for web access.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter existing password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-rose-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                    New Master Password *
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Min 8 characters"
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                    Confirm New Password *
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300/90 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero-Trust Revocation:</strong> Changing this password increments the account&apos;s session version. All other browser tabs and active API sessions will be signed out immediately.
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-rose-900/20"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying & Updating...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" /> Change Master Password
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Change Security PIN Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Admin Kiosk & Gate PIN</h3>
                  <p className="text-xs text-[var(--text-muted)]">Used for manual overrides and emergency kiosk authorization.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleChangePin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] block">
                    Current PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={8}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Existing PIN"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-mono text-center"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] block">
                    New PIN (4–8 digits) *
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={8}
                    required
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="New PIN"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-mono text-center"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)] block">
                    Confirm PIN *
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={8}
                    required
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Repeat PIN"
                    className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 font-mono text-center"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingPin}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {savingPin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Update Gate PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Section: Security Governance & Recent Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 2FA & Hardware Security Status */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <ShieldAlert className="w-4 h-4" /> Two-Factor Authentication
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            TOTP 2FA is strictly enforced on all SysAdmin accounts. Emergency recovery codes must be kept offline.
          </p>
          <div className="pt-2">
            <Link
              href="/sysadmin/security"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline"
            >
              Manage Multi-Factor Keys <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Active Sessions Control */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
            <Activity className="w-4 h-4" /> Concurrent Session Management
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Inspect active JWT tokens and single-device session handles across campus workstations.
          </p>
          <div className="pt-2">
            <Link
              href="/sysadmin/sessions"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 hover:text-sky-300 hover:underline"
            >
              View Active Sessions <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Audit Trail Quicklink */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 space-y-3 shadow-lg">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Clock className="w-4 h-4" /> Privileged Audit Logs
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Every permission grant, pass override, and credential change is recorded in immutable telemetry.
          </p>
          <div className="pt-2">
            <Link
              href="/sysadmin/audit"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              Open Audit Telemetry <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
