"use client";
import { errMsg } from "@/lib/err-msg";


// src/app/(sysadmin)/sysadmin/profile/page.tsx

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useApi } from "@/hooks/useApi";
import {Shield, KeyRound, Lock, Save, Loader2, CheckCircle2, Eye, EyeOff, User, Mail, Phone, Building2, Clock, ArrowRight, RefreshCw, AlertTriangle, Activity, ShieldCheck, ShieldAlert}  from "lucide-react";

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
const api = useApi();
  const { addToast} = useUIStore();
  const { user: authUser, setUser } = useAuthStore();

  const [profile, setProfile] = useState<SysAdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

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

  // Telemetry & audit
  const [_recentAudits, setRecentAudits] = useState<RecentAuditItem[]>([]);
  const [activeSessionsCount, setActiveSessionsCount] = useState<number | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const headers = api.getHeaders();
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
            email: authUser.email || "",
            phone: authUser.phone || null,
            role: "sysadmin",
            status: "ACTIVE",
            uniqueId: authUser.uniqueId || null,
            photoUrl: authUser.photoUrl || null,
            departmentId: authUser.departmentId || null,
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
    } catch (err) {
      addToast({
        title: "Telemetry Notice",
        message: errMsg(err) || "Loaded profile from active session cache.",
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
      const headers = { ...api.getHeaders(), "Content-Type": "application/json" };
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
    } catch (err) {
      addToast({
        title: "Network Error",
        message: errMsg(err) || "Failed to communicate with profile service.",
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
      const headers = { ...api.getHeaders(), "Content-Type": "application/json" };
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
    } catch (err) {
      addToast({
        title: "Network Error",
        message: errMsg(err) || "Failed to communicate with authentication service.",
        variant: "error",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="size-6 animate-spin text-action-danger" />
        <p className="text-xs text-text-muted font-medium">Loading administrator profile...</p>
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
          <p className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <Shield className="size-6 text-action-danger" />
            System Administrator Profile
          </p>
          <p className="text-xs text-text-muted mt-1">
            Root identity control, privileged credential governance, and security telemetry for the campus gate platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadProfile}
            className="surface-card px-3.5 py-2 bg-bg-surface text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <Link
            href="/sysadmin"
            className="surface-card px-3.5 py-2 bg-bg-surface text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-all flex items-center gap-2"
          >
            Control Room <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Hero Administrator Card */}
      <div className="surface-card bg-bg-surface p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-6 h-6 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
          <div className="relative">
            <div className="w-6 h-6 rounded-card bg-action-warning flex items-center justify-center text-white text-2xl font-black overflow-hidden">
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="surface-card absolute -bottom-1 -right-1 p-1 bg-action-success" title="Active Root Session">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-4 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold text-text-primary truncate">
                {profile?.name || authUser?.name || "System Administrator"}
              </h2>
              <span className="surface-card px-2.5 py-0.5 text-xs font-bold bg-rose-500/10 text-action-danger uppercase tracking-wider">
                SYSADMIN (ROOT)
              </span>
              <span className="surface-card px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-action-success flex items-center gap-1">
                <ShieldCheck className="size-3.5" /> Zero-Trust Verified
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-text-muted font-mono">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-text-muted" />
                {profile?.email || authUser?.email || "sysadmin@jntuhcej.ac.in"}
              </span>
              {profile?.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-text-muted" />
                  {profile.phone}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-text-muted" />
                {department}
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap sm:flex-nowrap gap-3 pt-2 md:pt-0 w-full md:w-auto">
            <div className="surface-card px-4 py-2.5 bg-bg-elevated text-center min-w25 flex-1 sm:flex-initial">
              <div className="text-xs uppercase font-bold text-text-muted tracking-wider">Credential Guard</div>
              <div className="text-xs font-bold text-action-success mt-0.5 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Active
              </div>
            </div>
            <div className="surface-card px-4 py-2.5 bg-bg-elevated text-center min-w25 flex-1 sm:flex-initial">
              <div className="text-xs uppercase font-bold text-text-muted tracking-wider">Active Sessions</div>
              <div className="text-xs font-bold text-action-info mt-0.5">
                {activeSessionsCount !== null ? activeSessionsCount : "1 Online"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Profile Updation & Password Changing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Update Profile Information */}
        <div className="surface-card bg-bg-surface p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="surface-card flex items-center justify-between pb-4">
            <div className="flex items-center gap-2.5">
              <div className="surface-card p-2 bg-sky-500/10 text-action-info">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Update Profile Details</h3>
                <p className="text-xs text-text-muted">Modify display identity and contact information.</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary block">
                Administrator Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Full Legal Name"
                className="surface-card w-full px-3.5 py-2.5 bg-bg-elevated text-sm text-text-primary focus:outline-none focus: transition-colors"
              />
              <p className="text-xs text-text-muted">
                This display name appears in system audit logs and broadcast messages.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary block">
                Email Address (Immutable)
              </label>
              <input
                type="email"
                value={profile?.email || authUser?.email || ""}
                disabled
                className="surface-card w-full px-3.5 py-2.5 bg-bg-base text-sm text-text-muted cursor-not-allowed opacity-80"
              />
              <p className="text-xs text-text-muted">
                Email changes require root database migration to preserve audit foreign keys.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">
                  Official Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="surface-card w-full px-3.5 py-2.5 bg-bg-elevated text-sm text-text-primary focus:outline-none focus: transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">
                  Department / Division
                </label>
                <input
                  type="text"
                  value={department}
                  disabled
                  className="surface-card w-full px-3.5 py-2.5 bg-bg-base text-sm text-text-muted opacity-80 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary block">
                Avatar / Photo URL (Optional)
              </label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="surface-card w-full px-3.5 py-2.5 bg-bg-elevated text-sm text-text-primary focus:outline-none focus: transition-colors"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="surface-card px-5 py-2.5 bg-sky-600 hover:bg-action-info text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
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
          <div className="surface-card bg-bg-surface p-4 sm:p-6 space-y-4 sm:space-y-6">
            <div className="surface-card flex items-center justify-between pb-4">
              <div className="flex items-center gap-2.5">
                <div className="surface-card p-2 bg-rose-500/10 text-action-danger">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">Change Master Password</h3>
                  <p className="text-xs text-text-muted">Update authentication credential for web access.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">
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
                    className="surface-card w-full pl-3.5 pr-10 py-2.5 bg-bg-elevated text-sm text-text-primary focus:outline-none focus: transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary block">
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
                    className="surface-card w-full px-3.5 py-2.5 bg-bg-elevated text-sm text-text-primary focus:outline-none focus: transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary block">
                    Confirm New Password *
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    placeholder="Repeat new password"
                    className="surface-card w-full px-3.5 py-2.5 bg-bg-elevated text-sm text-text-primary focus:outline-none focus: transition-colors"
                  />
                </div>
              </div>

              <div className="surface-card bg-amber-500/10 p-3 text-xs text-amber-300/90 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-action-warning shrink-0 mt-0.5" />
                <span>
                  <strong>Zero-Trust Revocation:</strong> Changing this password increments the account&apos;s session version. All other browser tabs and active API sessions will be signed out immediately.
                </span>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="surface-card px-5 py-2.5 bg-action-danger hover:bg-action-danger text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
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
        </div>
      </div>

      {/* Bottom Section: Security Governance & Recent Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Security Governance Status */}
        <div className="surface-card bg-bg-surface p-5 space-y-3">
          <div className="flex items-center gap-2 text-action-danger font-bold text-sm">
            <ShieldAlert className="w-4 h-4" /> Credential Governance
          </div>
          <p className="text-xs text-text-secondary">
            Password and session controls are enforced on all SysAdmin accounts.
          </p>
          <div className="pt-2">
            <Link
              href="/sysadmin/security"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-action-danger hover:text-action-danger hover:underline"
            >
              Manage Security Keys <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Active Sessions Control */}
        <div className="surface-card bg-bg-surface p-5 space-y-3">
          <div className="flex items-center gap-2 text-action-info font-bold text-sm">
            <Activity className="w-4 h-4" /> Concurrent Session Management
          </div>
          <p className="text-xs text-text-secondary">
            Inspect active JWT tokens and single-device session handles across campus workstations.
          </p>
          <div className="pt-2">
            <Link
              href="/sysadmin/sessions"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-action-info hover:text-action-info hover:underline"
            >
              View Active Sessions <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Audit Trail Quicklink */}
        <div className="surface-card bg-bg-surface p-5 space-y-3">
          <div className="flex items-center gap-2 text-action-success font-bold text-sm">
            <Clock className="w-4 h-4" /> Privileged Audit Logs
          </div>
          <p className="text-xs text-text-secondary">
            Every permission grant, pass override, and credential change is recorded in immutable telemetry.
          </p>
          <div className="pt-2">
            <Link
              href="/sysadmin/audit"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-action-success hover:text-action-success hover:underline"
            >
              Open Audit Telemetry <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
