"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Bell, Plus, RefreshCw, History, AlertTriangle, ShieldAlert } from "lucide-react";

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  durationMinutes: number;
  severity: "critical" | "warning" | "info";
  channel: "opsgenie" | "pagerduty" | "webhook" | "email";
  enabled: boolean;
}

interface AlertHistoryItem {
  id: string;
  ruleName: string;
  metric: string;
  severity: string;
  message: string;
  triggeredAt: string;
}

export default function AlertRulesPage() {
  const { user, token } = useAuthStore();
  const sessionToken = user?.currentSessionToken || token;
  const { addToast } = useUIStore();

  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"rules" | "history">("rules");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    metric: "unauthorized_entry_burst",
    threshold: "5",
    durationMinutes: "5",
    severity: "warning",
    channel: "opsgenie",
  });

  const getHeaders = () => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    if (sessionToken) h["X-Session-Token"] = sessionToken;
    return h;
  };

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/alerts/rules", { headers: getHeaders() });
      const json = await res.json();
      if (res.ok && json.success) {
        setRules(json.data.rules || []);
        setHistory(json.data.history || []);
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Failed to load rules" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch("/api/admin/alerts/rules", { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ id, enabled: !enabled }) });
      const json = await res.json();
      if (json.success) {
        addToast({ variant: "success", title: "Rule Updated", message: `Rule ${!enabled ? "enabled" : "disabled"}.` });
        setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !enabled } : r)));
      }
    } catch {}
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/alerts/rules", { method: "POST", headers: getHeaders(), body: JSON.stringify(formData) });
      const json = await res.json();
      if (json.success) {
        addToast({ variant: "success", title: "Rule Created", message: `Created '${formData.name}'.` });
        setIsModalOpen(false);
        fetchAlerts();
      } else { addToast({ variant: "error", title: "Error", message: json.error?.message || "Failed to create" }); }
    } catch {} finally { setSaving(false); }
  };

  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-amber-500" /> Alert Rules Management
            </h1>
            <p className="text-sm text-gray-500">Configure real-time monitoring and threshold alerts.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchAlerts} variant="secondary" size="sm" className="gap-2"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
            <Button onClick={() => setIsModalOpen(true)} variant="primary" size="sm" className="gap-2"><Plus className="w-4 h-4" /> Create Rule</Button>
          </div>
        </div>
        <Card className="border">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-blue-500" /> Active Alert Rules</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="py-6 text-center text-xs">Loading rules...</div> : rules.length === 0 ? <div className="py-6 text-center text-xs">No alert rules created yet.</div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[650px]">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600">
                    <tr>
                      <th className="p-3">Name</th>
                      <th className="p-3">Metric</th>
                      <th className="p-3">Threshold</th>
                      <th className="p-3">Severity</th>
                      <th className="p-3">Channel</th>
                      <th className="p-3">Enabled</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rules.map((rule) => (
                      <tr key={rule.id}>
                        <td className="p-3 font-semibold">{rule.name}</td>
                        <td className="p-3 font-mono text-xs text-gray-500">{rule.metric}</td>
                        <td className="p-3 font-mono text-xs">
                          &gt; {rule.threshold} / {rule.durationMinutes}m
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              rule.severity === "critical"
                                ? "error"
                                : rule.severity === "warning"
                                ? "dayout"
                                : "leave"
                            }
                          >
                            {rule.severity.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-xs capitalize text-sky-400">{rule.channel}</td>
                        <td className="p-3">
                          <Badge variant={rule.enabled ? "success" : "offline"}>
                            {rule.enabled ? "ACTIVE" : "DISABLED"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant={rule.enabled ? "secondary" : "primary"}
                            size="sm"
                            className="text-xs py-1 h-7"
                            onClick={() => handleToggle(rule.id, rule.enabled)}
                          >
                            {rule.enabled ? "Disable" : "Enable"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Operational Alert Event History
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchAlerts} className="gap-1 text-xs">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Log
            </Button>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500">No alert trigger events logged in this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600">
                    <tr>
                      <th className="p-3">Rule Name</th>
                      <th className="p-3">Metric</th>
                      <th className="p-3">Severity</th>
                      <th className="p-3">Trigger Message</th>
                      <th className="p-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td className="p-3 font-semibold">{h.ruleName}</td>
                        <td className="p-3 font-mono text-xs text-gray-500">{h.metric}</td>
                        <td className="p-3">
                          <Badge variant={h.severity === "critical" ? "error" : "dayout"}>{h.severity.toUpperCase()}</Badge>
                        </td>
                        <td className="p-3 text-xs text-[var(--text-primary)]">{h.message}</td>
                        <td className="p-3 text-xs font-mono text-gray-500">
                          {new Date(h.triggeredAt).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Alert Rule">
          <form onSubmit={handleCreate} className="space-y-4">
            <Input label="Rule Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <Input label="Metric Token" value={formData.metric} onChange={(e) => setFormData({ ...formData, metric: e.target.value })} required />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1 uppercase text-gray-500">Severity</label>
                <Select
                  options={[
                    { value: "critical", label: "Critical" },
                    { value: "warning", label: "Warning" },
                    { value: "info", label: "Info" },
                  ]}
                  value={formData.severity}
                  onChange={(val) => setFormData({ ...formData, severity: val as any })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1 uppercase text-gray-500">Channel</label>
                <Select
                  options={[
                    { value: "opsgenie", label: "OpsGenie" },
                    { value: "pagerduty", label: "PagerDuty" },
                    { value: "webhook", label: "Webhook" },
                    { value: "email", label: "Email" },
                  ]}
                  value={formData.channel}
                  onChange={(val) => setFormData({ ...formData, channel: val as any })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Threshold" type="number" value={formData.threshold} onChange={(e) => setFormData({ ...formData, threshold: e.target.value })} required />
              <Input label="Window (Mins)" type="number" value={formData.durationMinutes} onChange={(e) => setFormData({ ...formData, durationMinutes: e.target.value })} required />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={saving}>Save Rule</Button>
            </div>
          </form>
        </Modal>
      </div>
    </AuthGuard>
  );
}
