"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";

export function GateSchedule() {
  const { user, token } = useAuthStore();
  const currentSessionToken = user?.currentSessionToken || token;
  const { addToast } = useUIStore();

  const [rules, setRules] = useState<any[]>([]);
  const [currentStatus, setCurrentStatus] = useState<any>(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("22:00");

  const getHeaders = () => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    if (currentSessionToken) h["X-Session-Token"] = currentSessionToken;
    return h;
  };

  const fetchData = async () => {
    try {
      const [resS, resC] = await Promise.all([
        fetch("/api/gates/schedule", { headers: getHeaders() }),
        fetch("/api/gates/schedule/current"),
      ]);
      const dataS = await resS.json();
      const dataC = await resC.json();

      if (dataS.success) setRules(dataS.data.rules || []);
      if (dataC.success) setCurrentStatus(dataC.data);
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName) return;

    try {
      const res = await fetch("/api/gates/schedule", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ rule_name: ruleName, start_time: startTime, end_time: endTime, action: "allow", priority: 2 }),
      });
      const result = await res.json();
      if (result.success) {
        addToast({ variant: "success", title: "Created", message: `Rule created.` });
        setRuleName(""); setShowAddRule(false); fetchData();
      }
    } catch {}
  };

  const handleDeleteRule = async (id: string) => {
    await fetch(`/api/gates/schedule/${id}`, { method: "DELETE", headers: getHeaders() });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gate Access Scheduling</h1>
          <p className="text-sm text-gray-500">Configure time-of-day access rules.</p>
        </div>
        <Button onClick={() => setShowAddRule(!showAddRule)} className="gap-2">
          <Plus className="w-4 h-4" /> {showAddRule ? "Cancel" : "Add Access Rule"}
        </Button>
      </div>

      {currentStatus && (
        <Card className={`border p-4 flex items-center gap-3 ${currentStatus.isRestricted ? "bg-amber-50 dark:bg-amber-950/20 border-amber-300" : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300"}`}>
          {currentStatus.isRestricted ? <ShieldAlert className="w-6 h-6 text-amber-600" /> : <ShieldCheck className="w-6 h-6 text-emerald-600" />}
          <div>
            <div className="font-semibold text-sm">Status: {currentStatus.isRestricted ? "Restricted" : "Open"}</div>
            <div className="text-xs text-gray-600">{currentStatus.reason}</div>
          </div>
        </Card>
      )}

      {showAddRule && (
        <Card className="border p-4 bg-gray-50 dark:bg-gray-800/40">
          <form onSubmit={handleCreateRule} className="space-y-4">
            <h3 className="font-semibold text-lg">New Access Rule</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input value={ruleName} onChange={(e) => setRuleName(e.target.value)} required placeholder="Rule Name" className="p-2 border rounded text-sm" />
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="p-2 border rounded text-sm" />
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="p-2 border rounded text-sm" />
            </div>
            <Button type="submit" size="sm">Save Rule</Button>
          </form>
        </Card>
      )}

      <Card className="border">
        <CardHeader><CardTitle className="text-lg font-semibold">Active Rules</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600">
                <tr><th className="p-3">Rule</th><th className="p-3">Time Window</th><th className="p-3">Action</th><th className="p-3 text-right">Delete</th></tr>
              </thead>
              <tbody className="divide-y">
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td className="p-3 font-medium">{r.rule_name}</td>
                    <td className="p-3 font-mono text-xs">{r.start_time} - {r.end_time}</td>
                    <td className="p-3"><Badge variant={r.action === "allow" ? "success" : "error"}>{r.action}</Badge></td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(r.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
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

