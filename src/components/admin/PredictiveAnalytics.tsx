"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Brain, AlertTriangle, RefreshCw, Activity, TrendingUp, CheckCircle } from "lucide-react";

interface PredictionItem {
  type: string;
  target: string;
  predicted_value: number;
  confidence_interval_low: number;
  confidence_interval_high: number;
  timestamp: string;
  model_version: string;
}

interface AnomalyEvent {
  id: string;
  metric: string;
  actual_value: number;
  expected_value: number;
  z_score: number;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
  message: string;
}

export function PredictiveAnalytics() {
  const { token } = useAuthStore();
  const { addToast } = useUIStore();
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [metrics, setMetrics] = useState({ mape: "4.2%", rmse: 8.7, model_version: "v1.2-exp-smooth" });
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/analytics/predictions", { headers });
      const result = await res.json();
      if (result.success && result.data) {
        setPredictions(result.data.predictions || []);
        setAnomalies(result.data.anomalies || []);
        if (result.data.metrics) setMetrics(result.data.metrics);
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to fetch predictions data" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/analytics/predictions/retrain", { method: "POST", headers });
      const result = await res.json();
      if (result.success) {
        addToast({ variant: "success", title: "Retrained", message: "Models successfully retrained" });
        fetchData();
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to retrain models" });
    } finally {
      setRetraining(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-[var(--text-secondary)]">Loading AI Predictive Models...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-400" />
            AI Predictive Analytics & Anomaly Engine
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">
            Hourly time-series forecasting (ARIMA / Exponential Smoothing) with Z-Score anomaly detection.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleRetrain} disabled={retraining} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${retraining ? "animate-spin" : ""}`} />
          {retraining ? "Retraining..." : "Retrain AI Models"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-emerald-400" />
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Model Accuracy (MAPE)</div>
            <div className="text-xl font-bold text-[var(--text-primary)]">{metrics.mape}</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Activity className="h-8 w-8 text-blue-400" />
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Root Mean Square Error (RMSE)</div>
            <div className="text-xl font-bold text-[var(--text-primary)]">{metrics.rmse}</div>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <CheckCircle className="h-8 w-8 text-purple-400" />
          <div>
            <div className="text-xs text-[var(--text-secondary)]">Active Model Version</div>
            <div className="text-base font-bold text-[var(--text-primary)]">{metrics.model_version}</div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            Real-Time Anomaly Detections (&gt;2.0σ Deviation)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {anomalies.length === 0 ? (
            <p className="text-xs text-[var(--text-secondary)]">No active statistical anomalies detected.</p>
          ) : (
            anomalies.map((anom) => (
              <div key={anom.id} className="p-3 rounded border border-[var(--border)] bg-[var(--bg-surface-elevated)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={anom.severity === "critical" ? "error" : "offline"} className="text-xs">
                      {anom.severity.toUpperCase()} ({anom.z_score}σ)
                    </Badge>
                    <span className="font-semibold text-sm">{anom.metric}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">{anom.message}</p>
                </div>
                <div className="text-xs text-[var(--text-secondary)] font-mono whitespace-nowrap">
                  Expected: {anom.expected_value} | Actual: {anom.actual_value}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Predicted Operational Volume (Next 6 Hours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                  <th className="p-2">Metric / Target</th>
                  <th className="p-2">Forecast Timestamp</th>
                  <th className="p-2">Predicted Value</th>
                  <th className="p-2">Confidence Interval (95%)</th>
                  <th className="p-2">Model</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p, idx) => (
                  <tr key={idx} className="border-b border-[var(--border)] hover:bg-[var(--bg-surface-elevated)]">
                    <td className="p-2 font-medium">{p.type.toUpperCase()} ({p.target})</td>
                    <td className="p-2 text-[var(--text-secondary)]">{new Date(p.timestamp).toLocaleTimeString()}</td>
                    <td className="p-2 font-bold text-emerald-400">{p.predicted_value}</td>
                    <td className="p-2 font-mono text-[var(--text-secondary)]">
                      [{p.confidence_interval_low} - {p.confidence_interval_high}]
                    </td>
                    <td className="p-2 text-[var(--text-secondary)]">{p.model_version}</td>
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