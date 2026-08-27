"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Lock, Globe, KeyRound } from "lucide-react";

interface SecurityStats {
  failedLogins24h: number;
  activeSessions: number;
  forced2FA: boolean;
  ipAllowlistEnabled: boolean;
  allowedIps: string[];
}

export function SecurityManagement() {
  const { token } = useAuthStore();
  const { addToast } = useUIStore();
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [ipInput, setIpInput] = useState("");
  const [force2FA, setForce2FA] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/security/stats", { headers });
      const result = await res.json();
      if (result.success) {
        setStats(result.data);
        setIpInput(result.data.allowedIps.join(", "));
        setForce2FA(result.data.forced2FA);
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to load stats" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const handleSave = async () => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const ips = ipInput.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch("/api/admin/security/ip-allowlist", {
        method: "POST",
        headers,
        body: JSON.stringify({ allowedIps: ips, forced2FA: force2FA }),
      });
      const result = await res.json();
      if (result.success) {
        setStats(result.data);
        addToast({ variant: "success", title: "Saved", message: "Security settings updated" });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to update security settings" });
    }
  };

  if (loading) return <div className="p-6 text-sm text-[var(--text-secondary)]">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Failed Logins (24h)</CardTitle>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stats?.failedLogins24h || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Active Sessions</CardTitle>
            <Lock className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stats?.activeSessions || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-[var(--text-secondary)] uppercase">2FA Policy</CardTitle>
            <KeyRound className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-[var(--text-primary)]">{stats?.forced2FA ? "Enforced" : "Optional"}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zero-Trust IP Allowlist & Security Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Allowed Subnets / IPs</label>
            <input
              type="text"
              value={ipInput}
              onChange={(e) => setIpInput(e.target.value)}
              className="w-full rounded-md bg-[var(--bg-surface)] border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-primary)]"
            />
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="force2fa" checked={force2FA} onChange={(e) => setForce2FA(e.target.checked)} />
            <label htmlFor="force2fa" className="text-xs text-[var(--text-primary)]">Enforce Mandatory 2FA</label>
          </div>

          <Button variant="primary" size="sm" onClick={handleSave}>Save Security Policies</Button>
        </CardContent>
      </Card>
    </div>
  );
}
