"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Lock,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  GraduationCap,
  Users,
  ShieldAlert,
  Sliders,
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { parseRollNumber } from "@/lib/rollNumber";
import type { Role } from "@/lib/types";

const ROLE_REDIRECTS: Record<Role, string> = {
  operator: "/gate/1",
  supervisor: "/supervisor/live",
  admin: "/admin",
  sysadmin: "/sysadmin",
  parent: "/parent",
  student: "/person",
  warden: "/sysadmin",
  faculty: "/person",
  staff: "/person",
  worker: "/person",
  visitor: "/person",
};

interface DemoCredential {
  role: Role;
  roleTitle: string;
  name: string;
  id: string;
  email: string;
  pin: string;
  badgeColor: string;
  description: string;
}

const DEMO_CREDENTIALS: Record<string, DemoCredential> = {
  student: {
    role: "student",
    roleTitle: "Student",
    name: "K. Rajesh (CSE 4th Year)",
    id: "24JJ1A0501",
    email: "student@gatekeeper.edu",
    pin: "1234",
    badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    description: "Access digital ID card, request outing passes, and track gate entry/exit logs.",
  },
  supervisor: {
    role: "supervisor",
    roleTitle: "Gate Supervisor",
    name: "Dr. A. Sharma (Chief Supervisor)",
    id: "SUP001",
    email: "supervisor@gatekeeper.edu",
    pin: "1234",
    badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    description: "Monitor live gate camera feeds, perform manual log corrections, and manage alerts.",
  },
  operator: {
    role: "operator",
    roleTitle: "Gate Guard / Operator",
    name: "R. Kumar (Main Gate 1 Guard)",
    id: "OP001",
    email: "operator@gatekeeper.edu",
    pin: "1234",
    badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    description: "Scan student QR passes at campus entry/exit gates and trigger emergency alerts.",
  },
  admin: {
    role: "admin",
    roleTitle: "Campus Admin",
    name: "S. Verma (Administrative Officer)",
    id: "ADM001",
    email: "admin@gatekeeper.edu",
    pin: "1234",
    badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    description: "View campus occupancy analytics, manage student rosters, and generate compliance reports.",
  },
  sysadmin: {
    role: "sysadmin",
    roleTitle: "System Administrator",
    name: "System Administrator",
    id: "SYS001",
    email: "sysadmin@gatekeeper.edu",
    pin: "1234",
    badgeColor: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    description: "Manage system access controls, security policies, gate hardware, and audit logs.",
  },
  parent: {
    role: "parent",
    roleTitle: "Parent Portal",
    name: "P. Rao (Parent)",
    id: "PAR001",
    email: "parent@gatekeeper.edu",
    pin: "1234",
    badgeColor: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    description: "Track child's campus presence, view movement activity, and submit pass requests.",
  },
};

type LoginTab = "student" | "supervisor" | "operator" | "admin" | "sysadmin" | "parent";

export default function LoginPage() {
  const router = useRouter();
  const { login, pinLogin, loading } = useAuthStore();
  const { addToast } = useUIStore();

  const [activeTab, setActiveTab] = useState<LoginTab>("student");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [passwordOrPin, setPasswordOrPin] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [showCredDetails, setShowCredDetails] = useState(false);

  const currentDemo = DEMO_CREDENTIALS[activeTab];

  const triggerShake = (msg: string) => {
    setErrorMsg(msg);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleTabChange = (tab: LoginTab) => {
    setActiveTab(tab);
    setErrorMsg("");
    setLoginIdentifier("");
    setPasswordOrPin("");
  };

  const fillQuickCreds = (cred: DemoCredential) => {
    setLoginIdentifier(cred.id);
    setPasswordOrPin(cred.pin);
    setErrorMsg("");
    addToast({
      title: `${cred.roleTitle} Credentials Loaded`,
      message: `Loaded ${cred.id} into login fields.`,
      variant: "info",
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const identifier = loginIdentifier.trim();
    if (!identifier) {
      triggerShake(`Please enter your ${currentDemo.roleTitle} ID / Roll Number.`);
      return;
    }
    if (!passwordOrPin) {
      triggerShake("Please enter your Password or Security PIN.");
      return;
    }

    if (activeTab === "student") {
      const upperRoll = identifier.toUpperCase();
      if (upperRoll.length < 3) {
        triggerShake("Please enter a valid Student Roll Number or ID.");
        return;
      }
    }

    // Primary login attempt
    const result = await login(identifier, passwordOrPin);
    if (result.success) {
      const userRole = useAuthStore.getState().role || currentDemo.role;
      if (rememberMe) {
        localStorage.setItem("gate-monitor-remember", "true");
      }
      addToast({
        title: "Access Granted",
        message: `Authenticated as ${userRole.toUpperCase()}. Redirecting to portal...`,
        variant: "success",
      });
      router.push(ROLE_REDIRECTS[userRole as Role] || "/student");
      return;
    }

    // Secondary PIN fallback
    const pinResult = await pinLogin(identifier, passwordOrPin);
    if (pinResult.success) {
      const userRole = useAuthStore.getState().role || currentDemo.role;
      addToast({
        title: "Access Granted",
        message: `Authenticated via Security PIN. Redirecting...`,
        variant: "success",
      });
      router.push(ROLE_REDIRECTS[userRole as Role] || "/student");
    } else {
      triggerShake(result.error || pinResult.error || `Invalid credentials for ${currentDemo.roleTitle}.`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-4 sm:p-6 lg:p-8 select-none">
      <div
        className={`w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 transition-all ${
          isShaking ? "animate-shake border-[var(--action-danger)]" : ""
        }`}
      >
        {/* Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--action-primary)]/10 text-[var(--action-primary)] border border-[var(--action-primary)]/20 shadow-xs mb-1">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            JNTUH CEJ Gate Monitor
          </h1>
          <p className="text-xs text-[var(--text-muted)] font-medium max-w-xs mx-auto">
            Authorized Role-Based Security Portal — Select your role to sign in
          </p>
        </div>

        {/* Role Selection Tabs Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1 font-semibold">
            <span>Portal Select</span>
            <button
              type="button"
              onClick={() => setShowCredDetails(!showCredDetails)}
              className="text-[var(--action-primary)] hover:underline flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showCredDetails ? "Hide Demo Credentials" : "Show Credentials"}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleTabChange("student")}
              className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "student"
                  ? "bg-[var(--bg-surface)] text-[var(--action-primary)] shadow-sm font-bold border border-[var(--border)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("supervisor")}
              className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "supervisor"
                  ? "bg-[var(--bg-surface)] text-[var(--action-primary)] shadow-sm font-bold border border-[var(--border)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Supervisor</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("operator")}
              className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "operator"
                  ? "bg-[var(--bg-surface)] text-[var(--action-primary)] shadow-sm font-bold border border-[var(--border)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Operator</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("admin")}
              className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "admin"
                  ? "bg-[var(--bg-surface)] text-[var(--action-primary)] shadow-sm font-bold border border-[var(--border)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Building2 className="w-4 h-4 shrink-0" />
              <span>Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("sysadmin")}
              className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "sysadmin"
                  ? "bg-[var(--bg-surface)] text-[var(--action-primary)] shadow-sm font-bold border border-[var(--border)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span>SysAdmin</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("parent")}
              className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === "parent"
                  ? "bg-[var(--bg-surface)] text-[var(--action-primary)] shadow-sm font-bold border border-[var(--border)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Parent</span>
            </button>
          </div>
        </div>

        {/* Role Portal Details */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border)] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${currentDemo.badgeColor}`}>
                {currentDemo.roleTitle}
              </span>
            </div>
            <button
              type="button"
              onClick={() => fillQuickCreds(currentDemo)}
              className="text-[11px] font-bold text-[var(--action-primary)] hover:underline flex items-center gap-1 bg-[var(--action-primary)]/10 px-2.5 py-1 rounded-lg border border-[var(--action-primary)]/20 transition-all active:scale-95"
            >
              <Sparkles className="w-3 h-3" />
              <span>Fill Demo Credentials</span>
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">{currentDemo.description}</p>

          {showCredDetails && (
            <div className="pt-2 border-t border-[var(--border)] text-[11px] font-mono text-[var(--text-secondary)] space-y-1 bg-[var(--bg-base)]/60 p-2.5 rounded-xl">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Login ID / Roll:</span>
                <span className="font-bold text-[var(--text-primary)]">{currentDemo.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Registered Email:</span>
                <span>{currentDemo.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Password / PIN:</span>
                <span className="font-bold text-[var(--action-primary)]">{currentDemo.pin}</span>
              </div>
            </div>
          )}
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[var(--action-danger)]/10 text-[var(--action-danger)] border border-[var(--action-danger)]/20 text-xs font-semibold animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dynamic Login Form */}
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">
              {activeTab === "student"
                ? "JNTUH Student Roll Number"
                : activeTab === "parent"
                ? "Parent ID / Mobile / Email"
                : `${currentDemo.roleTitle} ID / Email`}
            </label>
            <div className="relative">
              <input
                type="text"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder={
                  activeTab === "student"
                    ? "Enter Roll No (e.g. 21001A0501)"
                    : activeTab === "parent"
                    ? "Enter Parent ID (e.g. PAR001)"
                    : `Enter ID (e.g. ${currentDemo.id})`
                }
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none transition-all"
              />
              <UserCheck className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">
              Password or Security PIN
            </label>
            <div className="relative">
              <input
                type="password"
                value={passwordOrPin}
                onChange={(e) => setPasswordOrPin(e.target.value)}
                placeholder="Enter password or 4-digit PIN"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg-base)] border border-[var(--border)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-[var(--focus-ring)] outline-none transition-all"
              />
              <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-[var(--text-muted)]" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !loginIdentifier || !passwordOrPin}
            className="w-full touch-target-primary rounded-xl bg-[var(--action-primary)] text-white font-bold text-sm hover:opacity-95 transition-all disabled:opacity-40 shadow-md flex items-center justify-center gap-2 py-3 mt-2 active:scale-[0.99]"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to {currentDemo.roleTitle} Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Session & Security Info */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--action-primary)] focus:ring-[var(--focus-ring)] accent-[var(--action-primary)]"
            />
            <span>Remember login</span>
          </label>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[var(--action-primary)] font-bold">
            <ShieldAlert className="w-3 h-3" />
            <span>Encrypted Authorization</span>
          </span>
        </div>
      </div>
    </div>
  );
}
