"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy } from "lucide-react";

export function SupportDashboard() {
  const { user, token } = useAuthStore();
  const currentSessionToken = user?.currentSessionToken || token;
  const { addToast } = useUIStore();

  const [tickets, setTickets] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  const getHeaders = () => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    if (currentSessionToken) h["X-Session-Token"] = currentSessionToken;
    return h;
  };

  const fetchData = async () => {
    try {
      const [resT, resM] = await Promise.all([
        fetch("/api/admin/support/tickets", { headers: getHeaders() }),
        fetch("/api/admin/support/metrics", { headers: getHeaders() }),
      ]);
      const dataT = await resT.json();
      const dataM = await resM.json();

      if (dataT.success) setTickets(dataT.data || []);
      if (dataM.success) setMetrics(dataM.data);
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/support/tickets/${id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      const result = await res.json();
      if (result.success) {
        addToast({ variant: "success", title: "Updated", message: `Ticket status set to ${newStatus}` });
        fetchData();
      }
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support Ticket Management</h1>
        <p className="text-sm text-gray-500">Triage, assign, and resolve user feedback and gate issues.</p>
      </div>

      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 border text-center">
            <div className="text-xs text-gray-500">Total Tickets</div>
            <div className="text-2xl font-bold">{metrics.totalTickets}</div>
          </Card>
          <Card className="p-4 border text-center">
            <div className="text-xs text-amber-500 font-medium">Open</div>
            <div className="text-2xl font-bold text-amber-600">{metrics.openTickets}</div>
          </Card>
          <Card className="p-4 border text-center">
            <div className="text-xs text-emerald-500 font-medium">Resolved</div>
            <div className="text-2xl font-bold text-emerald-600">{metrics.resolvedTickets}</div>
          </Card>
          <Card className="p-4 border text-center">
            <div className="text-xs text-blue-500 font-medium">Avg Resolution Time</div>
            <div className="text-2xl font-bold text-blue-600">{metrics.avgResolutionHours} hrs</div>
          </Card>
        </div>
      )}

      <Card className="border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2"><LifeBuoy className="w-5 h-5 text-blue-500" /> Active Tickets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-600">
                <tr>
                  <th className="p-3">Ticket #</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="p-3 font-mono font-medium">{t.ticket_number}</td>
                    <td className="p-3">
                      <div>{t.user_name}</div>
                      <div className="text-xs text-gray-400 capitalize">{t.user_role}</div>
                    </td>
                    <td className="p-3 font-medium">{t.subject}</td>
                    <td className="p-3 text-xs capitalize">{t.category.replace("_", " ")}</td>
                    <td className="p-3">
                      <Badge variant={t.status === "open" ? "entry" : t.status === "resolved" ? "success" : "offline"}>{t.status}</Badge>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      {t.status !== "resolved" && (
                        <Button size="sm" variant="secondary" className="text-xs" onClick={() => updateStatus(t.id, "resolved")}>Resolve</Button>
                      )}
                      {t.status === "open" && (
                        <Button size="sm" className="text-xs" onClick={() => updateStatus(t.id, "in_progress")}>In Progress</Button>
                      )}
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

