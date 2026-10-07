"use client";

import React, { useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  Lock,
  KeyRound,
  Database,
  Globe2,
  QrCode,
  CheckCircle2,
  RefreshCw,
  Shield,
  Activity,
} from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { useGlass } from "@/context/GlassContext";

interface PageProps {
  params: Promise<{ category: string }>;
}

const ROLE_NAMES: Record<string, string> = {
  admin: "Administrator",
  sysadmin: "System Administrator",
  operator: "Gate Security Operator",
  supervisor: "Security Supervisor",
  guardian: "Parent / Guardian",
  parent: "Parent / Guardian",
  student: "Student Member",
  warden: "Hostel Warden",
  faculty: "Faculty Member",
  staff: "University Staff",
  worker: "Campus Worker",
  visitor: "Registered Visitor",
};

export default function SecurityCategoryPage({ params }: PageProps) {
  const router = useRouter();
  const { category } = use(params);
  const { role, user, token } = useAuthStore();
  const { wsConnected, gateTraffic } = useGlass();

  const [verifying, setVerifying] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>("Just now");
  const [logs, setLogs] = useState<string[]>([
    "Initial security handshake completed.",
    "Role isolation scope verified.",
  ]);

  const userRole = role || "student";
  const displayRoleName = ROLE_NAMES[userRole] || userRole.toUpperCase();

  const runVerification = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setLastCheck(new Date().toLocaleTimeString());
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Audit check passed. All parameters nominal.`,
        ...prev,
      ]);
    }, 750);
  };

  const getCategoryDetails = (cat: string) => {
    switch (cat) {
      case "identity":
        return {
          title: "Identity Parameters",
          categoryName: "Container 1",
          icon: UserCheck,
          accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          metrics: [
            { label: "Status", value: "Verified" },
            { label: "Account", value: user?.name || "User" },
            { label: "Email", value: user?.email || "user@college.edu" },
            { label: "Role", value: displayRoleName },
            { label: "Scope", value: userRole === "sysadmin" || userRole === "admin" ? "System Admin" : "User Scope" },
            { label: "Account State", value: user?.status || "ACTIVE" },
          ],
        };
      case "session":
        return {
          title: "Session Parameters",
          categoryName: "Container 2",
          icon: Lock,
          accent: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
          metrics: [
            { label: "Token Type", value: "JWT (HS256)" },
            { label: "Encryption", value: "TLS 1.3 | 256-Bit" },
            { label: "Inactivity Timeout", value: "15 Minutes" },
            { label: "Storage", value: "Session Storage" },
            { label: "Token State", value: token ? "Active Token" : "Mock Session" },
          ],
        };
      case "mfa":
        return {
          title: "MFA & Auth Parameters",
          categoryName: "Container 3",
          icon: KeyRound,
          accent: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
          metrics: [
            { label: "2FA Policy", value: userRole === "sysadmin" || userRole === "admin" ? "Enforced" : "Active" },
            { label: "PIN Lock", value: "Verified" },
            { label: "Biometrics", value: "WebAuthn Ready" },
            { label: "Failed Logins", value: "0 (24h)" },
            { label: "Rate Shield", value: "Active" },
          ],
        };
      case "privacy":
        return {
          title: "Privacy Parameters",
          categoryName: "Container 4",
          icon: Database,
          accent: "text-purple-400 bg-purple-500/10 border-purple-500/30",
          metrics: [
            { label: "Encryption", value: "AES-256-GCM" },
            { label: "RLS Isolation", value: "PostgreSQL RLS" },
            { label: "Audit Ledger", value: "Immutable" },
            { label: "Retention", value: "1 Year Standard" },
          ],
        };
      case "network":
        return {
          title: "Network Parameters",
          categoryName: "Container 5",
          icon: Globe2,
          accent: "text-sky-400 bg-sky-500/10 border-sky-500/30",
          metrics: [
            { label: "Platform", value: typeof window !== "undefined" ? window.navigator.platform : "Web Browser" },
            { label: "Telemetry Feed", value: wsConnected ? "Live WS" : "Standby" },
            { label: "Traffic", value: `${gateTraffic} req/m` },
            { label: "DDoS Shield", value: "Active" },
          ],
        };
      case "gate-pass":
      default:
        return {
          title: `${displayRoleName} Pass Parameters`,
          categoryName: "Container 6",
          icon: QrCode,
          accent: "text-teal-400 bg-teal-500/10 border-teal-500/30",
          metrics: [
            { label: "Token Type", value: "HMAC Dynamic" },
            { label: "QR Refresh TTL", value: "60 Seconds" },
            { label: "Authorization", value: userRole === "student" ? "Curfew Synced" : "Granted" },
            { label: "Device Link", value: "Bound to Device" },
          ],
        };
    }
  };

  const details = getCategoryDetails(category);
  const Icon = details.icon;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] p-4 md:p-6 space-y-4 max-w-3xl mx-auto select-none">
        
        {/* Navigation Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/security")}
              className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <span className="text-[10px] font-mono font-bold text-emerald-400">
                {details.categoryName}
              </span>
              <h1 className="text-base md:text-lg font-bold tracking-tight text-[var(--text-primary)]">
                {details.title}
              </h1>
            </div>
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Container Parameters ({details.metrics.length})
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {details.metrics.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3 flex items-center justify-between gap-2"
              >
                <span className="text-xs text-[var(--text-muted)] font-medium">{item.label}</span>
                <span className="text-xs font-bold font-mono text-[var(--text-primary)]">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Compact Audit Log */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
            <span>Security Audit Log</span>
            <span className="text-[10px] font-mono text-emerald-400">STATUS: OK</span>
          </div>

          <div className="bg-[var(--bg-base)] rounded-lg p-2.5 border border-[var(--border)]/60 font-mono text-[11px] space-y-1 text-[var(--text-muted)] max-h-32 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="flex items-center gap-1.5 text-emerald-400/90">
                <span>✓</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AuthGuard>
  );
}