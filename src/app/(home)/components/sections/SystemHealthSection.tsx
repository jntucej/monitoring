"use client";

import { motion } from "framer-motion";
import { useNoMotion } from "../hooks/useNoMotion";
import { ShieldCheck, Activity, CheckCircle2 } from "lucide-react";

const AUDIT_METRICS = [
  { label: "Audit Log Integrity", status: "Verified 100%", desc: "Append-only cryptographic chain with actor context" },
  { label: "System Health", status: "All Nodes Active", desc: "Real-time health telemetry & database connection pooling" },
  { label: "RLS Governance", status: "Enforced", desc: "Postgres Row-Level Security active across tenant partitions" },
  { label: "Session Control", status: "Secure", desc: "Instant token revocation & 2FA break-glass mechanism" }
];

export function SystemHealthSection() {
  const reduced = useNoMotion();
  return (
    <section aria-label="System Health and Audits" className="mx-auto w-full max-w-6xl px-6 py-16">
      <div className="surface-card bg-white/[0.03] p-8 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="surface-card inline-flex items-center gap-2 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-action-success">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              Live Telemetry &amp; Compliance Audit
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
              Transparent Security &amp; Health Audits
            </h2>
            <p className="mt-1 text-sm text-[var(--home-text-secondary,var(--text-muted))]">
              Continuous monitoring of access policies, database RLS, and cryptographic audit trails.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="surface-card inline-flex items-center gap-1.5 bg-white/5 px-4 py-2 text-sm font-medium">
              <ShieldCheck className="h-4 w-4 text-[var(--home-accent-gold,var(--action-warning))]" />
              Production Hardened
            </span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIT_METRICS.map((item, idx) => (
            <motion.div
              key={item.label}
              initial={reduced ? false : { opacity: 0, y: 10 }}
              whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={reduced ? undefined : { duration: 0.4, delay: idx * 0.05 }}
              className="surface-card bg-white/5 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-text-muted">
                  {item.label}
                </span>
                <CheckCircle2 className="h-4 w-4 text-action-success" />
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {item.status}
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
