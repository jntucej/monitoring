"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { ScheduleSuggestion } from "@/lib/scheduling-assistant";
import { Sparkles, Check, ArrowRight, Clock } from "lucide-react";

export function SmartSchedulingAssistant() {
  const { token } = useAuthStore();
  const { addToast } = useUIStore();
  const [suggestions, setSuggestions] = useState<ScheduleSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/scheduling/suggestions", { headers });
      const result = await res.json();
      if (result.success && result.data) {
        setSuggestions(result.data);
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to fetch smart suggestions" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleApply = async (id: string) => {
    setApplyingId(id);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/admin/scheduling/apply", {
        method: "POST",
        headers,
        body: JSON.stringify({ suggestionId: id }),
      });
      const result = await res.json();
      if (result.success) {
        addToast({ variant: "success", title: "Applied", message: result.message });
        setSuggestions((prev) => prev.filter((s) => s.id !== id));
      } else {
    addToast({ variant: "error", title: "Not applied", message: result.error || "Failed to apply recommendation" });
  }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to apply recommendation" });
    } finally {
      setApplyingId(null);
    }
  };

  if (loading) return <div className="p-4 text-xs text-[var(--text-secondary)]">Analyzing historical scan data for smart schedule optimizations...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-400" />
        <h2 className="text-base font-bold">AI Smart Scheduling Recommendations</h2>
      </div>

      <div className="space-y-3">
        {suggestions.length === 0 ? (
          <Card className="p-4 text-xs text-[var(--text-secondary)]">All smart schedule optimizations applied.</Card>
        ) : (
          suggestions.map((sug) => (
            <Card key={sug.id} className="p-4 space-y-3 border border-[var(--border)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="success" className="text-xs">
                      Impact Score: {sug.impact_score}/100
                    </Badge>
                    <h3 className="font-bold text-sm">{sug.title}</h3>
                  </div>
                  <p className="text-xs text-[var(--text-primary)]">{sug.recommendation}</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleApply(sug.id)}
                  disabled={applyingId === sug.id}
                  className="gap-1 text-xs whitespace-nowrap"
                >
                  <Check className="h-3.5 w-3.5" />
                  {applyingId === sug.id ? "Applying..." : "Apply Recommendation"}
                </Button>
              </div>

              <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface-elevated)] p-2.5 rounded">
                💡 <span className="font-semibold">Data Insight:</span> {sug.reasoning}
              </p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}