"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Download, UserX, Play, Database } from "lucide-react";

export function ComplianceSettings() {
  const { user, token } = useAuthStore();
  const currentSessionToken = user?.currentSessionToken || token;
  const { addToast } = useUIStore();

  const [policies, setPolicies] = useState<any[]>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [exportData, setExportData] = useState<string | null>(null);

  const getHeaders = () => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    if (currentSessionToken) h["X-Session-Token"] = currentSessionToken;
    return h;
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
                <tr><th className="p-3">Data Category</th><th className="p-3">Retention Window</th><th className="p-3">Auto Sweep</th></tr>
              </thead>
              <tbody className="divide-y">
                {policies.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3 font-medium capitalize">{p.data_category.replace("_", " ")}</td>
                    <td className="p-3 font-mono">{p.retention_days} days</td>
                    <td className="p-3"><Badge variant="success">Enabled</Badge></td>
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
    </div>
  );
}

