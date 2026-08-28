"use client";

import React, { useState, useEffect } from "react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUIStore } from "@/stores/uiStore";
import { BookOpen, RefreshCw, Settings, Save } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

export function LMSIntegration() {
  const { addToast } = useUIStore();
  const [config, setConfig] = useState({
    platform: "moodle",
    api_url: "https://moodle.campus.edu/webservice/rest/server.php",
    sync_schedule: "daily_02:00",
    auto_push_attendance: true,
    status: "connected",
    last_synced_at: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/integrations/lms/status", { headers });
      const result = await res.json();
      if (result.success && result.data) {
        setConfig((prev) => ({ ...prev, ...result.data }));
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to fetch LMS status" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch("/api/integrations/lms/sync", { method: "POST", headers });
      const result = await res.json();
      if (result.success) {
        addToast({ variant: "success", title: "Sync Complete", message: result.message });
        fetchStatus();
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "LMS sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="p-4 text-xs text-[var(--text-secondary)]">Loading LMS Integration...</div>;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-blue-400" />
          <div>
            <CardTitle className="text-base">LMS Integration (Moodle / Canvas)</CardTitle>
            <p className="text-xs text-[var(--text-secondary)]">
              Automated roster synchronization & real-time gate scan attendance push.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={config.status === "connected" ? "success" : "error"} className="text-xs">
            {config.status.toUpperCase()}
          </Badge>
          <Button variant="secondary" size="sm" onClick={handleSyncNow} disabled={syncing} className="gap-1 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Roster Now"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-2.5 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border)]">
          <span className="text-[var(--text-secondary)]">Platform Target</span>
          <div className="font-bold text-sm uppercase">{config.platform}</div>
        </div>
        <div className="p-2.5 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border)]">
          <span className="text-[var(--text-secondary)]">Sync Schedule</span>
          <div className="font-bold text-sm">{config.sync_schedule}</div>
        </div>
        <div className="p-2.5 rounded bg-[var(--bg-surface-elevated)] border border-[var(--border)]">
          <span className="text-[var(--text-secondary)]">Last Synced</span>
          <div className="font-bold text-sm">{new Date(config.last_synced_at).toLocaleTimeString()}</div>
        </div>
      </div>
    </Card>
  );
}