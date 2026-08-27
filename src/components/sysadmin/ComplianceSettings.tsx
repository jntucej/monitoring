"use client";

import { useEffect, useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, ShieldCheck, Download, UserX, Play, Database } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { getAuthHeaders } from "@/lib/utils";

export function ComplianceSettings() {
  const { addToast } = useUIStore();

  const [policies, setPolicies] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [exportData, setExportData] = useState<string | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<any | null>(null);
  const [savingPolicy, setSavingPolicy] = useState(false);

  const getHeaders = () => ({
    ...getAuthHeaders(),
    "Content-Type": "application/json",
  });

  const handleUpdatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;
    setSavingPolicy(true);
    try {
      const res = await fetch("/api/admin/retention-policies", {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          id: editingPolicy.id,
          retention_days: Number(editingPolicy.retention_days),
          auto_delete: Boolean(editingPolicy.auto_delete),
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast({ variant: "success", title: "Policy Updated", message: "Retention lifecycle policy updated." });
        setEditingPolicy(null);
        fetchPolicies();
      } else {
        addToast({ variant: "error", title: "Error", message: data.error?.message || "Failed to update policy" });
      }
    } catch {
      addToast({ variant: "error", title: "Error", message: "Network request error" });
    } finally {
      setSavingPolicy(false);
    }
  };

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/admin/retention-policies", { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setPolicies(data.data || []);
    } catch {}
  };

  useEffect(() => { fetchPolicies(); }, []);

  const handleRunRetention = async () => {
    try {
      const res = await fetch("/api/admin/retention/run", { method: "POST", headers: getHeaders() });
      const result = await res.json();
      if (result.success) addToast({ variant: "success", title: "Retention Swept", message: result.data.message });
    } catch {}
  };

  const handleAnonymize = async () => {
    if (!targetUserId) return;
    try {
      const res = await fetch("/api/admin/compliance/anonymize", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ userId: targetUserId }),
      });
      const result = await res.json();
      if (result.success) addToast({ variant: "success", title: "Anonymized", message: `User ${targetUserId} PII anonymized.` });
    } catch {}
  };

  const handleExport = async () => {
    if (!targetUserId) return;
    try {
      const res = await fetch("/api/admin/compliance/export", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ userId: targetUserId }),
      });
      const result = await res.json();
      if (result.success) setExportData(result.data.json);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compliance & Data Retention</h1>
          <p className="text-sm text-gray-500">Automate GDPR right-to-be-forgotten and data lifecycle policies.</p>
        </div>
        <Button onClick={handleRunRetention} variant="secondary" className="gap-2">
          <Play className="w-4 h-4" /> Run Retention Sweep Now
        </Button>
      </div>

      <Card className="border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2"><Database className="w-5 h-5 text-blue-500" /> Table Retention Lifecycles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600">
                <tr><th className="p-3">Data Category</th><th className="p-3">Retention Window</th><th className="p-3">Auto Sweep</th><th className="p-3 text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y">
                {policies.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-medium capitalize">{p.data_category.replace("_", " ")}</td>
                    <td className="p-3 font-mono">{p.retention_days} days</td>
                    <td className="p-3"><Badge variant={p.auto_delete ? "success" : "offline"}>{p.auto_delete ? "Enabled" : "Disabled"}</Badge></td>
                    <td className="p-3 text-right">
                      <Button variant="secondary" size="sm" className="h-7 text-xs gap-1" onClick={() => setEditingPolicy({ ...p })}>
                        <Edit2 className="w-3 h-3" /> Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border p-4 space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-purple-500" /> GDPR User Data Tools</h3>
        <div className="flex gap-3">
          <input value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} placeholder="Enter User Unique ID / Roll No." className="flex-1 p-2 border rounded text-sm bg-white dark:bg-gray-900" />
          <Button onClick={handleExport} variant="secondary" size="sm" className="gap-1"><Download className="w-3.5 h-3.5" /> Export Data</Button>
          <Button onClick={handleAnonymize} variant="danger" size="sm" className="gap-1"><UserX className="w-3.5 h-3.5" /> Anonymize PII</Button>
        </div>

        {exportData && (
          <div className="mt-4">
            <div className="text-xs font-semibold mb-1">JSON Data Export:</div>
            <pre className="p-3 bg-gray-900 text-green-400 text-xs rounded max-h-48 overflow-y-auto font-mono">{exportData}</pre>
          </div>
        )}
      </Card>

      <Modal isOpen={!!editingPolicy} onClose={() => setEditingPolicy(null)} title="Edit Retention Policy">
        {editingPolicy && (
          <form onSubmit={handleUpdatePolicy} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase">Data Category</label>
              <div className="p-2.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-sm font-semibold capitalize">
                {editingPolicy.data_category.replace("_", " ")}
              </div>
            </div>
            <Input
              label="Retention Window (Days)"
              type="number"
              value={editingPolicy.retention_days}
              onChange={(e) => setEditingPolicy({ ...editingPolicy, retention_days: e.target.value })}
              required
            />
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="auto_delete"
                checked={editingPolicy.auto_delete}
                onChange={(e) => setEditingPolicy({ ...editingPolicy, auto_delete: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="auto_delete" className="text-sm font-medium text-[var(--text-primary)] cursor-pointer">
                Enable Auto Sweep (Purge records older than retention limit)
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
              <Button type="button" variant="secondary" onClick={() => setEditingPolicy(null)}>Cancel</Button>
              <Button type="submit" variant="primary" loading={savingPolicy}>Save Policy</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

