"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { RefreshCw, Save } from "lucide-react";

export function AdvancedAnalytics() {
  const { user, token } = useAuthStore();
  const currentSessionToken = user?.currentSessionToken || token;
  const { addToast } = useUIStore();

  const [groupBy, setGroupBy] = useState("hourly");
  const [personType, setPersonType] = useState("all");
  const [data, setData] = useState<any>(null);
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [reportName, setReportName] = useState("");
  const [showSave, setShowSave] = useState(false);

  const getHeaders = () => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    if (currentSessionToken) h["X-Session-Token"] = currentSessionToken;
    return h;
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`/api/analytics/advanced?groupBy=${groupBy}&personType=${personType}`, { headers: getHeaders() });
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch {}
  };

  const fetchSavedReports = async () => {
    try {
      const res = await fetch("/api/analytics/reports", { headers: getHeaders() });
      const result = await res.json();
      if (result.success) setSavedReports(result.data || []);
    } catch {}
  };

  useEffect(() => { fetchAnalytics(); fetchSavedReports(); }, [groupBy, personType]);

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportName) return;
    try {
      const res = await fetch("/api/analytics/reports", { method: "POST", headers: getHeaders(), body: JSON.stringify({ name: reportName, queryJson: { groupBy, personType } }) });
      const result = await res.json();
      if (result.success) { addToast({ variant: "success", title: "Saved", message: `Report saved.` }); setReportName(""); setShowSave(false); fetchSavedReports(); }
    } catch {}
  };

  const handleRunReport = async (id: string) => {
    try {
      const res = await fetch(`/api/analytics/reports/${id}/run`, { method: "POST", headers: getHeaders() });
      const result = await res.json();
      if (result.success) addToast({ variant: "success", title: "Executed", message: result.data.message });
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-sm text-gray-500">Build queries and custom reports.</p>
        </div>
        <Button onClick={() => setShowSave(!showSave)} variant="secondary" size="sm" className="gap-2">
          <Save className="w-4 h-4" /> {showSave ? "Cancel" : "Save Definition"}
        </Button>
      </div>

      {showSave && (
        <Card className="border p-4">
          <form onSubmit={handleSaveReport} className="flex gap-3">
            <input value={reportName} onChange={(e) => setReportName(e.target.value)} required placeholder="Report Name" className="flex-1 p-2 border rounded text-sm" />
            <Button type="submit" size="sm">Save</Button>
          </form>
        </Card>
      )}

      <Card className="border p-4 flex gap-4 items-center">
        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="p-2 border rounded text-sm">
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
        </select>
        <select value={personType} onChange={(e) => setPersonType(e.target.value)} className="p-2 border rounded text-sm">
          <option value="all">All Types</option>
          <option value="student">Students</option>
          <option value="faculty">Faculty</option>
        </select>
        <Button onClick={fetchAnalytics} size="sm" className="gap-1"><RefreshCw className="w-3.5 h-3.5" /> Run</Button>
      </Card>

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border p-4">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="border p-4 space-y-3">
            {data.breakdown?.map((b: any) => (
              <div key={b.category} className="flex justify-between text-sm border-b pb-2">
                <span>{b.category}</span>
                <Badge variant="entry">{b.count}</Badge>
              </div>
            ))}
          </Card>
        </div>
      )}

      <Card className="border p-4">
        <h3 className="font-semibold text-base mb-2">Saved Reports</h3>
        {savedReports.map((r) => (
          <div key={r.id} className="flex justify-between items-center py-2 border-b text-sm">
            <span>{r.name}</span>
            <Button onClick={() => handleRunReport(r.id)} size="sm" variant="secondary" className="text-xs">Run Report</Button>
          </div>
        ))}
      </Card>
    </div>
  );
}

