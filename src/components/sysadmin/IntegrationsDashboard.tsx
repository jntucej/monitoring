"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, CheckCircle2, Zap, Server, Activity, Database, Mail } from "lucide-react";

export function IntegrationsDashboard() {
  const { user, token } = useAuthStore();
  const currentSessionToken = user?.currentSessionToken || token;
  const { addToast } = useUIStore();

  const [integrations, setIntegrations] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (currentSessionToken) headers["X-Session-Token"] = currentSessionToken;

      const [resConfig, resLogs] = await Promise.all([
        fetch("/api/integrations", { headers }),
        fetch("/api/integrations/logs", { headers }),
      ]);
      const dataConfig = await resConfig.json();
      const dataLogs = await resLogs.json();

      if (dataConfig.success) setIntegrations(dataConfig.data || []);
      if (dataLogs.success) setLogs(dataLogs.data || []);
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to load integrations" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchIntegrations(); }, []);

  const handleSyncNow = async (id: string) => {
    setSyncingId(id);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (currentSessionToken) headers["X-Session-Token"] = currentSessionToken;

      const res = await fetch(`/api/integrations/${id}/sync`, { method: "POST", headers });
      const result = await res.json();
      if (result.success) {
        addToast({ variant: "success", title: "Sync Completed", message: result.data.message });
        fetchIntegrations();
      }
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Integration Hub</h1>
          <p className="text-sm text-gray-500">Manage HR, SIS, Email/SMS, and Biometric connections.</p>
        </div>
        <Button onClick={fetchIntegrations} variant="secondary" size="sm" className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((item) => (
          <Card key={item.id} className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  {item.type === "hr_sync" ? <Database className="w-5 h-5 text-blue-500" /> : <Server className="w-5 h-5 text-purple-500" />}
                </div>
                <div>
                  <CardTitle className="text-base">{item.name}</CardTitle>
                  <CardDescription className="text-xs capitalize">{item.type.replace("_", " ")}</CardDescription>
                </div>
              </div>
              <Badge variant={item.enabled ? "success" : "offline"}>{item.enabled ? "Active" : "Disabled"}</Badge>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="text-xs text-gray-500 flex justify-between">
                <span>Status:</span>
                <span className="font-medium text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Connected</span>
              </div>
              <Button onClick={() => handleSyncNow(item.id)} disabled={syncingId === item.id || !item.enabled} size="sm" className="w-full gap-1 text-xs">
                <Zap className={`w-3.5 h-3.5 ${syncingId === item.id ? "animate-spin" : ""}`} /> Sync Now
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2"><Activity className="w-5 h-5 text-blue-500" /> Sync Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600">
                <tr><th className="p-3">Integration</th><th className="p-3">Status</th><th className="p-3">Records</th><th className="p-3">Timestamp</th></tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="p-3 font-medium capitalize">{log.type.replace("_", " ")}</td>
                    <td className="p-3"><Badge variant={log.status === "success" ? "success" : "error"}>{log.status}</Badge></td>
                    <td className="p-3 font-mono">{log.records_synced}</td>
                    <td className="p-3 text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
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

