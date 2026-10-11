"use client";
// SCAFFOLD:ANALYTICS — Green Metrics dashboard.
// Regenerate with: node scripts/scaffold-analytics.mjs new sustainability --force

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { ChartRenderer, type ChartType, type SeriesDef } from "@/components/shared/ChartRenderer";
import { ChartTypeSwitcher } from "@/components/shared/ChartTypeSwitcher";
import {
  Brain, AlertTriangle, RefreshCw, Activity, TrendingUp, CheckCircle,
  Target, Clock, Download, Sparkles, Zap,
} from "lucide-react";
import {
  sampleSustainabilityDataset,
  buildForecastSeries,
  SUSTAINABILITY_CHARTS,
  type SustainabilityDataset,
  type SustainabilityPrediction,
  type SustainabilityAnomaly,
} from "@/lib/sustainability-analytics";

/* ─── Severity colours ───────────────────────────────────────────────────── */
const SEVERITY_COLORS: Record<string, string> = {
  low: "#38bdf8",
  medium: "#fbbf24",
  high: "#f97316",
  critical: "#ef4444",
};

/* ─── KPI card ───────────────────────────────────────────────────────────── */
function KpiCard({
  label, value, icon: Icon, tint, sub,
}: {
  label: string; value: string; icon: React.ElementType;
  tint: string; sub?: string;
}) {
  return (
    <div className="glass-card rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--text-primary)]">{value}</p>
          {sub && <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{sub}</p>}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg"
             style={{ background: `${tint}22`, color: tint }}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </div>
  );
}

/* ─── Chart card with its own switcher ───────────────────────────────────── */
function ChartCard({
  title, description, chartType, onChartTypeChange,
  series, data, xKey, height = 280, right, stacked,
}: {
  title: string;
  description?: string;
  chartType: ChartType;
  onChartTypeChange: (t: ChartType) => void;
  series: SeriesDef[];
  data: any[];
  xKey: string;
  height?: number;
  right?: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {description && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {right}
          <ChartTypeSwitcher value={chartType} onChange={onChartTypeChange} compact />
        </div>
      </CardHeader>
      <CardContent>
        <WidgetBoundary>
          <ChartRenderer type={chartType} data={data} series={series}
                         xKey={xKey} height={height} stacked={stacked} />
        </WidgetBoundary>
      </CardContent>
    </Card>
  );
}

/* ─── Main ──────────────────────────────────────────────────────────────── */
export function SustainabilityAnalytics() {
  const token = useAuthStore((s) => s.token);
  const addToast = useUIStore((s) => s.addToast);

  const [dataset, setDataset] = useState<SustainabilityDataset>(() => sampleSustainabilityDataset());
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);

  // Hero chart type + per-card types keyed by spec id
  const [heroType, setHeroType] = useState<ChartType>("composed");
  const [cardTypes, setCardTypes] = useState<Record<string, ChartType>>(() => {
    const seed: Record<string, ChartType> = {};
    SUSTAINABILITY_CHARTS.forEach((c) => { seed[c.id] = c.defaultType; });
    return seed;
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/analytics/sustainability", { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const payload = json.data ?? json;
      setDataset({
        predictions: payload.predictions ?? [],
        anomalies: payload.anomalies ?? [],
      });
    } catch (err) {
      addToast({
        variant: "error",
        title: "Failed to load green metrics",
        message: err instanceof Error ? err.message : "Network error",
      });
      // keep the seed fallback dataset — page stays usable
    } finally {
      setLoading(false);
    }
  }, [token, addToast]);

  const handleRetrain = async () => {
    try {
      setRetraining(true);
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/analytics/sustainability/retrain", { method: "POST", headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      addToast({ variant: "success", title: "Model retrained", message: "Predictions refreshed." });
      await fetchData();
    } catch (err) {
      addToast({
        variant: "error",
        title: "Retain failed",
        message: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setRetraining(false);
    }
  };

  /* ── Derived ── */
  const forecast = useMemo(() => buildForecastSeries(dataset.predictions), [dataset.predictions]);

  const criticalCount = dataset.anomalies.filter((a) => a.severity === "critical").length;

  const avgConfidence = useMemo(() => {
    if (!dataset.predictions.length) return 94;
    const sum = dataset.predictions.reduce((s, p) => {
      const width = p.confidence_interval_high - p.confidence_interval_low;
      return s + (1 - width / Math.max(p.predicted_value, 1)) * 100;
    }, 0);
    return Math.max(0, Math.min(100, Math.round(sum / dataset.predictions.length)));
  }, [dataset.predictions]);

  const nextWindow = useMemo(() => {
    if (!dataset.predictions.length) return "—";
    const future = dataset.predictions
      .map((p) => new Date(p.timestamp).getTime())
      .filter((t) => t > Date.now())
      .sort((a, b) => a - b)[0];
    if (!future) return "No forecast scheduled";
    const diff = Math.round((future - Date.now()) / 60000);
    return diff < 60 ? `in ${diff}m` : `in ${Math.round(diff / 60)}h`;
  }, [dataset.predictions]);

  const exportCsv = () => {
    const rows = [
      ["timestamp", "type", "target", "predicted", "low", "high", "model"],
      ...dataset.predictions.map((p) => [
        p.timestamp, p.type, p.target,
        String(p.predicted_value), String(p.confidence_interval_low),
        String(p.confidence_interval_high), p.model_version,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sustainability-predictions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Show N secondary charts (ctx.charts limits it)
  const visibleCharts = SUSTAINABILITY_CHARTS.slice(0, 4);

  /* ── Render ── */
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <Brain className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Green Metrics</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Forecasts, confidence intervals, anomaly detection &amp; model metrics
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="offline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {dataset.predictions[0]?.model_version ?? "v1.0-arima"}
          </Badge>
          <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!dataset.predictions.length}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export
          </Button>
          <Button variant="secondary" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={handleRetrain} disabled={retraining || loading}
                  className="bg-emerald-600 hover:bg-emerald-500">
            <Zap className={`mr-1.5 h-3.5 w-3.5 ${retraining ? "animate-pulse" : ""}`} />
            {retraining ? "Retraining…" : "Retrain Model"}
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Active Forecasts" value={String(dataset.predictions.length)}
                 sub={`Next: ${nextWindow}`} icon={Activity} tint="#10b981" />
        <KpiCard label="Model Confidence" value={`${avgConfidence}%`}
                 sub="Weighted avg interval" icon={Target} tint="#3b82f6" />
        <KpiCard label="Anomalies Detected" value={String(dataset.anomalies.length)}
                 sub={`${criticalCount} critical`} icon={AlertTriangle} tint="#f59e0b" />
        <KpiCard label="Data Points" value={String(forecast.length)}
                 sub="Last 14 days" icon={Clock} tint="#8b5cf6" />
      </div>

      {/* Hero chart */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Demand Forecast — Actual vs Predicted
            </CardTitle>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Switch between 8 chart types. Confidence band shows lower/upper bounds.
            </p>
          </div>
          <ChartTypeSwitcher value={heroType} onChange={setHeroType} />
        </CardHeader>
        <CardContent>
          <WidgetBoundary>
            <ChartRenderer
              type={heroType}
              data={forecast}
              xKey="date"
              height={340}
              series={[
                { key: "predicted", label: "Predicted", color: "#10b981", type: "area" },
                { key: "actual",    label: "Actual",    color: "#3b82f6", type: "line" },
                { key: "high",      label: "Upper CI",  color: "#f59e0b", type: "line" },
                { key: "low",       label: "Lower CI",  color: "#ef4444", type: "line" },
              ]}
            />
          </WidgetBoundary>
        </CardContent>
      </Card>

      {/* Secondary charts grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {visibleCharts.map((spec) => (
          <ChartCard
            key={spec.id}
            title={spec.title}
            description={spec.description}
            chartType={cardTypes[spec.id] ?? spec.defaultType}
            onChartTypeChange={(t) => setCardTypes((prev) => ({ ...prev, [spec.id]: t }))}
            data={spec.build(dataset)}
            xKey={spec.xKey}
            series={spec.series}
            height={spec.height ?? 280}
            stacked={spec.stacked}
          />
        ))}
      </div>

      {/* Anomaly table */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Detected Anomalies
            <Badge variant="offline" className="ml-2">{dataset.anomalies.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dataset.anomalies.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-[var(--border)] p-6 text-sm text-[var(--text-muted)]">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
              No anomalies detected. All metrics are within expected bounds.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    <th className="px-3 py-2">Metric</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2 text-right">Actual</th>
                    <th className="px-3 py-2 text-right">Expected</th>
                    <th className="px-3 py-2 text-right">Z-Score</th>
                    <th className="px-3 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {dataset.anomalies.slice(0, 12).map((a) => (
                    <tr key={a.id} className="border-b border-[var(--border)]/50 transition-colors hover:bg-[var(--bg-elevated)]">
                      <td className="px-3 py-2.5 font-medium text-[var(--text-primary)]">{a.metric}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                              style={{ background: `${SEVERITY_COLORS[a.severity]}22`, color: SEVERITY_COLORS[a.severity] }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEVERITY_COLORS[a.severity] }} />
                          {a.severity}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-primary)]">{a.actual_value.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--text-muted)]">{a.expected_value.toFixed(1)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <span className={a.z_score >= 3 ? "font-semibold text-rose-500" : "text-[var(--text-primary)]"}>
                          {a.z_score.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-[var(--text-muted)]">
                        {new Date(a.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SustainabilityAnalytics;
