"use client";


import React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldAlert, ShieldQuestion, ArrowLeft, Lock, KeyRound, Database, Globe2, ServerCog, UserCheck, CheckCircle2, QrCode, Layers, ChevronRight } from "lucide-react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { useGlass } from "@/context/GlassContext";
import type { SecurityMode } from "@/context/GlassContext";


const POSTURE: Record<
  SecurityMode,
  { icon: typeof ShieldCheck; label: string; note: string; cls: string; badgeCls: string }
> = {
  secure: {
    icon: ShieldCheck,
    label: "System Secured",
    note: "6 Active Security Shields",
    cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    badgeCls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  elevated: {
    icon: ShieldQuestion,
    label: "Elevated Monitoring",
    note: "High Telemetry Active",
    cls: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    badgeCls: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  critical: {
    icon: ShieldAlert,
    label: "Critical Verification",
    note: "Step-Up Auth Enforced",
    cls: "bg-rose-500/10 border-rose-500/30 text-rose-400",
    badgeCls: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  },
};

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: "Administrator",
  sysadmin: "System Administrator",
  operator: "Gate Security Operator",
  supervisor: "Security Supervisor",
  guardian: "Parent / Guardian",
  parent: "Parent / Guardian",
  student: "Student Member",
  principal: "Principal",
  faculty: "Faculty Member",
  staff: "University Staff",
  worker: "Campus Worker",
  visitor: "Registered Visitor",
};

export default function SecurityPage() {
  const router = useRouter();
  const {role, user} = useAuthStore();
  const {securityMode, wsConnected, gateTraffic} = useGlass();


  const mode = securityMode in POSTURE ? securityMode : "secure";
  const p = POSTURE[mode];
  const MainIcon = p.icon;

  const userRole = role || "student";
  const displayRoleName = ROLE_DISPLAY_NAMES[userRole] || userRole.toUpperCase();
  const isSysadmin = userRole === "sysadmin";
















































































































  const CARDS = [
    {
      id: "identity",
      title: "Account Identity",
      icon: UserCheck,
      metric: "100%",
      submetric: "Verified Identity",
      badge: "ACTIVE",
      barColor: "bg-emerald-400",
      barWidth: "w-full",
      tag: "Identity & Role Scope",
    },
    {
      id: "session",
      title: "Session Hardening",
      icon: Lock,
      metric: "256-Bit",
      submetric: "TLS 1.3 JWT Encrypted",
      badge: "ACTIVE",
      barColor: "bg-cyan-400",
      barWidth: "w-[95%]",
      tag: "Session & Token",
    },
    {
      id: "mfa",
      title: "Auth Guard",
      icon: KeyRound,
      metric: "0 Failures",
      submetric: "Brute-force Shielded",
      badge: "ACTIVE",
      barColor: "bg-indigo-400",
      barWidth: "w-full",
      tag: "Credential Lock",
    },
    {
      id: "privacy",
      title: "Data Privacy & RLS",
      icon: Database,
      metric: "AES-256",
      submetric: "Isolated Data Scope",
      badge: "ISOLATED",
      barColor: "bg-purple-400",
      barWidth: "w-full",
      tag: "Row Level Protection",
    },
    {
      id: "network",
      title: "Device & Telemetry",
      icon: Globe2,
      metric: `${gateTraffic} r/m`,
      submetric: wsConnected ? "Live WS Feed Sync" : "Standby Feed Sync",
      badge: wsConnected ? "ONLINE" : "STANDBY",
      barColor: wsConnected ? "bg-emerald-400" : "bg-amber-400",
      barWidth: "w-[88%]",
      tag: "Network Telemetry",
    },
    {
      id: "gate-pass",
      title: "Pass & Gate Access",
      icon: QrCode,
      metric: "Anti-Spoof",
      submetric: "Dynamic Token Active",
      badge: "SECURED",
      barColor: "bg-teal-400",
      barWidth: "w-full",
      tag: `${displayRoleName} Access`,
    },
  ];

  return (
    <AuthGuard>
      <div className="min-h-dvh bg-[var(--bg-base)] text-[var(--text-primary)] p-4 md:p-6 space-y-4 max-w-5xl mx-auto select-none">
        
        {/* Minimal Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Security Hub
              </h1>
              <p className="text-xs text-[var(--text-muted)]">
                {user?.name || "Account"} • <span className="font-semibold">{displayRoleName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSysadmin && (
              <button
                onClick={() => router.push("/sysadmin/security")}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
              >
                <ServerCog className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
          </div>
        </div>

        {/* Minimal Posture Banner */}
        <div className={`rounded-2xl border p-3.5 transition-all ${p.cls}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <MainIcon className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-[var(--text-primary)]">{p.label}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${p.badgeCls}`}>
                    100% SECURED
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">{p.note}</p>
              </div>
            </div>
          </div>
        </div>

        {/* The 6 Infographic Security Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-1">
            <span className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Click any container to inspect individual parameters ({CARDS.length})
            </span>
            <span className="font-mono text-[10px]">Role: <strong className="text-[var(--text-primary)]">{displayRoleName}</strong></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {CARDS.map((card) => {
              const CardIcon = card.icon;
              return (
                <div
                  key={card.id}
                  onClick={() => router.push(`/security/${card.id}`)}
                  className="group relative rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 hover:border-emerald-500/50 hover:bg-[var(--bg-elevated)] transition-all cursor-pointer select-none space-y-3 shadow-sm active:scale-[0.99]"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                        <CardIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[var(--text-primary)] group-hover:text-emerald-400 transition-colors">
                          {card.title}
                        </h3>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          {card.tag}
                        </span>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                      {card.badge}
                    </span>
                  </div>

                  {/* Main Metric Infographic Display */}
                  <div className="bg-[var(--bg-base)]/80 rounded-xl p-3 border border-[var(--border)]/60 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-lg font-black text-[var(--text-primary)] tracking-tight font-mono">
                        {card.metric}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] font-medium">
                        {card.submetric}
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 opacity-80" />
                  </div>

                  {/* Visual Progress / Infographic Bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-[var(--bg-base)] rounded-full overflow-hidden border border-[var(--border)]/40">
                      <div className={`h-full ${card.barColor} ${card.barWidth} rounded-full transition-all duration-500`} />
                    </div>
                  </div>

                  {/* Footer tap indicator */}
                  <div className="flex items-center justify-between text-[10px] font-medium text-[var(--text-muted)] group-hover:text-emerald-400 transition-colors pt-1">
                    <span>Inspect Parameters</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clean Footer */}
        <div className="text-center pt-2 text-[10px] font-mono text-[var(--text-muted)]">
          Gate Monitor Security Core • Role: {displayRoleName} • Click any container to enter
        </div>

      </div>
    </AuthGuard>
  );
}
