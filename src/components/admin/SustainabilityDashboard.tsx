"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { SustainabilityMetrics } from "@/lib/sustainability";
import { Leaf, FileText, Zap, Trees, Download } from "lucide-react";

export function SustainabilityDashboard() {
  const { token } = useAuthStore();
  const { addToast } = useUIStore();
  const [metrics, setMetrics] = useState<SustainabilityMetrics | null>(null);
  const [history, setHistory] = useState<Array<{ month: string; paper_saved: number; carbon_saved: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const [resCurrent, resHistory] = await Promise.all([
          fetch("/api/admin/sustainability", { headers }),
          fetch("/api/admin/sustainability/history", { headers }),
        ]);

        const dataCurrent = await resCurrent.json();
        const dataHistory = await resHistory.json();

        if (dataCurrent.success) setMetrics(dataCurrent.data);
        if (dataHistory.success) setHistory(dataHistory.data || []);
      } catch {
        addToast({ variant: "error", title: "Error", message: "Failed to load sustainability metrics" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleExportCSV = () => {
    if (!metrics) return;
    const csvContent = "data:text/csv;charset=utf-8," +
      ["Metric,Value"]
        .concat([
          `Digital Passes Issued,${metrics.digital_passes_count}`,
          `Paper Sheets Saved,${metrics.paper_saved_sheets}`,
          `Carbon Footprint Saved (kg CO2),${metrics.carbon_saved_kg}`,
          `Estimated Gate Energy (kWh),${metrics.energy_kwh}`,
          `Trees Saved Equivalent,${metrics.trees_equivalent}`,
        ])
        .join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sustainability_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !metrics) return <div className="p-8 text-center text-xs text-[var(--text-secondary)]">Computing Green IT Sustainability Metrics...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Leaf className="h-6 w-6 text-emerald-400" />
            Sustainability & Green IT Dashboard
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Tracking paperless digital pass savings, carbon footprint reduction, and gate energy consumption.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExportCSV} className="gap-2 text-xs">
          <Download className="h-4 w-4" /> Export Report CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-400" />
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Digital Passes Issued</div>
            <div className="text-2xl font-bold">{metrics.digital_passes_count.toLocaleString()}</div>
            <div className="text-[10px] text-emerald-400 font-medium">100% Paperless</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <Leaf className="h-8 w-8 text-emerald-400" />
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Paper Saved (Sheets)</div>
            <div className="text-2xl font-bold">{metrics.paper_saved_sheets.toLocaleString()}</div>
            <div className="text-[10px] text-[var(--text-secondary)]">~2 sheets/pass</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <Trees className="h-8 w-8 text-amber-400" />
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Trees Equivalent Saved</div>
            <div className="text-2xl font-bold">{metrics.trees_equivalent} Trees</div>
            <div className="text-[10px] text-emerald-400">Carbon offset</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <Zap className="h-8 w-8 text-purple-400" />
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Carbon Offset (kg CO2)</div>
            <div className="text-2xl font-bold">{metrics.carbon_saved_kg} kg</div>
            <div className="text-[10px] text-[var(--text-secondary)]">Gate energy: {metrics.energy_kwh} kWh</div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cumulative Sustainability Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                  <th className="p-2">Month</th>
                  <th className="p-2">Paper Saved (Sheets)</th>
                  <th className="p-2">Carbon Offset (kg CO2)</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row, idx) => (
                  <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--bg-surface-elevated)]">
                    <td className="p-2 font-semibold">{row.month} 2026</td>
                    <td className="p-2 font-mono text-emerald-400">{row.paper_saved.toLocaleString()}</td>
                    <td className="p-2 font-mono text-purple-400">{row.carbon_saved} kg</td>
                    <td className="p-2">
                      <Badge variant="success" className="text-xs">Verified</Badge>
                    </td>
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