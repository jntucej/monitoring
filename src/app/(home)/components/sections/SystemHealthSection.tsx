"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Activity, Database, CheckCircle2 } from "lucide-react";

const AUDIT_METRICS = [
  { label: "Audit Log Integrity", status: "Verified 100%", desc: "Append-only cryptographic chain with actor context" },
  { label: "System Health", status: "All Nodes Active", desc: "Real-time health telemetry & database connection pooling" },
  { label: "RLS Governance", status: "Enforced", desc: "Postgres Row-Level Security active across tenant partitions" },
  { label: "Session Control", status: "Secure", desc: "Instant token revocation & 2FA break-glass mechanism" }
];

export function SystemHealthSection() {
  return (
    <section aria-label="System Health and Audits" className="mx-auto w-full max-w-6xl px-6 py-16">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              Live Telemetry &amp; Compliance Audit
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
              Transparent Security &amp; Health Audits
            </h2>
            <p className="mt-1 text-sm text-[var(--home-text-secondary,#9CA3AF)]">
              Continuous monitoring of access policies, database RLS, and cryptographic audit trails.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-4 py-2 text-sm font-medium border border-white/10">
              <ShieldCheck className="h-4 w-4 text-[var(--home-accent-gold,#FBBF24)]" />
              Production Hardened
            </span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIT_METRICS.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-slate-400">
                  {item.label}
                </span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {item.status}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
