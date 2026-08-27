"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { UserEngagementMetric } from "@/lib/user-analytics";
import { Users, TrendingUp, UserX, Download } from "lucide-react";

export function UserAnalytics() {
  const { token } = useAuthStore();
  const { addToast } = useUIStore();
  const [metrics, setMetrics] = useState<UserEngagementMetric[]>([]);
  const [trends, setTrends] = useState<{ dau: number; mau: number; adoptionByRole: Record<string, number> }>({ dau: 0, mau: 0, adoptionByRole: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const [resMetrics, resTrends] = await Promise.all([
          fetch("/api/admin/analytics/users/engagement", { headers }),
          fetch("/api/admin/analytics/users/trends", { headers }),
        ]);

        const dataMetrics = await resMetrics.json();
        const dataTrends = await resTrends.json();

        if (dataMetrics.success) setMetrics(dataMetrics.data || []);
        if (dataTrends.success) setTrends(dataTrends.data || { dau: 0, mau: 0, adoptionByRole: {} });
      } catch {
        addToast({ variant: "error", title: "Error", message: "Failed to load user analytics" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      ["Name,Email,Role,Engagement Score,Logins/Wk,Scans/Wk,Last Active"]
        .concat(metrics.map(m => `"${m.name}","${m.email}","${m.role}",${m.engagement_score},${m.login_frequency},${m.scan_frequency},"${m.last_active_at}"`))
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `user_analytics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="p-8 text-center text-xs text-[var(--text-secondary)]">Computing Behavioral Engagement Metrics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-400" />
            User & Role Behavioral Analytics
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Engagement scoring (0-100), adoption trends by role, and active user analytics.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExportCSV} className="gap-2 text-xs">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-emerald-400" />
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Daily Active Users (DAU)</div>
            <div className="text-2xl font-bold">{trends.dau}</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-blue-400" />
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Monthly Active Users (MAU)</div>
            <div className="text-2xl font-bold">{trends.mau}</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <UserX className="h-8 w-8 text-purple-400" />
          <div>
            <div className="text-xs text-[var(--text-secondary)]">DAU / MAU Ratio</div>
            <div className="text-2xl font-bold">
              {trends.mau > 0 ? Math.round((trends.dau / trends.mau) * 100) : 0}%
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Engagement Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                  <th className="p-2">User / Email</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">Engagement Score</th>
                  <th className="p-2">Weekly Activity</th>
                  <th className="p-2">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((u) => (
                  <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-surface-elevated)]">
                    <td className="p-2">
                      <div className="font-semibold">{u.name}</div>
                      <div className="text-[var(--text-secondary)] text-[10px]">{u.email}</div>
                    </td>
                    <td className="p-2 font-mono text-[var(--text-secondary)]">{u.role}</td>
                    <td className="p-2">
                      <Badge variant={u.engagement_score >= 70 ? "success" : u.engagement_score >= 40 ? "leave" : "error"} className="text-xs">
                        {u.engagement_score} / 100
                      </Badge>
                    </td>
                    <td className="p-2 text-[var(--text-secondary)]">
                      {u.login_frequency} logins • {u.scan_frequency} scans
                    </td>
                    <td className="p-2 text-[var(--text-secondary)]">{new Date(u.last_active_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}