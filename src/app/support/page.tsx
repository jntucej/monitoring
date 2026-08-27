"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, Plus, Clock } from "lucide-react";

export default function UserSupportPage() {
  const { user, token } = useAuthStore();
  const currentSessionToken = user?.currentSessionToken || token;
  const { addToast } = useUIStore();

  const [tickets, setTickets] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState("system_issue");
  const [priority, setPriority] = useState("medium");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  const getHeaders = () => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    if (currentSessionToken) h["X-Session-Token"] = currentSessionToken;
    return h;
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/support/tickets", { headers: getHeaders() });
      const data = await res.json();
      if (data.success) setTickets(data.data || []);
    } catch {}
  };

  useEffect(() => { fetchTickets(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ category, priority, subject, description }),
      });
      const result = await res.json();
      if (result.success) {
        addToast({ variant: "success", title: "Submitted", message: `Ticket #${result.data.ticket_number} created.` });
        setSubject(""); setDescription(""); setShowModal(false); fetchTickets();
      }
    } catch {}
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-sm text-gray-500">Report gate issues or request support.</p>
        </div>
        <Button onClick={() => setShowModal(!showModal)} className="gap-2">
          <Plus className="w-4 h-4" /> {showModal ? "Cancel" : "Raise Ticket"}
        </Button>
      </div>

      {showModal && (
        <Card className="border p-4 bg-gray-50 dark:bg-gray-800/40">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><LifeBuoy className="w-5 h-5 text-blue-500" /> New Support Request</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="p-2 border rounded text-sm bg-white dark:bg-gray-900">
                <option value="gate_access">Gate Access Issue</option>
                <option value="id_card">ID Card / Scanner</option>
                <option value="pass_request">Pass Query</option>
                <option value="system_issue">System Bug</option>
              </select>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="p-2 border rounded text-sm bg-white dark:bg-gray-900">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-900" placeholder="Subject" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} className="w-full p-2 border rounded text-sm bg-white dark:bg-gray-900" placeholder="Explain issue..." />
            <Button type="submit" size="sm">Submit Ticket</Button>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {tickets.map((t) => (
          <Card key={t.id} className="border p-4">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{t.ticket_number}</span>
                  <h3 className="font-semibold text-base">{t.subject}</h3>
                  <Badge variant={t.status === "open" ? "entry" : "success"} className="capitalize">{t.status}</Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{t.description}</p>
                <div className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> {new Date(t.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

