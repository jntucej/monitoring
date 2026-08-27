"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus, Trash2, Eye, EyeOff, Send } from "lucide-react";

export function AnnouncementsManager() {
  const { user, token } = useAuthStore();
  const currentSessionToken = user?.currentSessionToken || token;
  const { addToast } = useUIStore();

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");

  const getHeaders = () => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (token) h["Authorization"] = `Bearer ${token}`;
    if (currentSessionToken) h["X-Session-Token"] = currentSessionToken;
    return h;
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/admin/announcements", { headers: getHeaders() });
      const result = await res.json();
      if (result.success) setAnnouncements(result.data || []);
    } catch {}
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    try {
      const res = await fetch("/api/admin/announcements", { method: "POST", headers: getHeaders(), body: JSON.stringify({ title, message, priority: "medium", audience }) });
      const result = await res.json();
      if (result.success) { addToast({ variant: "success", title: "Saved", message: `Broadcast published.` }); setTitle(""); setMessage(""); setShowCreate(false); fetchAnnouncements(); }
    } catch {}
  };

  const togglePublish = async (id: string, current: boolean) => {
    await fetch(`/api/admin/announcements/${id}`, { method: "PATCH", headers: getHeaders(), body: JSON.stringify({ is_published: !current }) });
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/announcements/${id}`, { method: "DELETE", headers: getHeaders() });
    fetchAnnouncements();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
          <p className="text-sm text-gray-500">Publish broadcast notifications.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
          <Plus className="w-4 h-4" /> {showCreate ? "Cancel" : "New Broadcast"}
        </Button>
      </div>

      {showCreate && (
        <Card className="border p-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2"><Megaphone className="w-5 h-5 text-amber-500" /> Create Broadcast</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Title" className="p-2 border rounded text-sm" />
              <select value={audience} onChange={(e) => setAudience(e.target.value)} className="p-2 border rounded text-sm">
                <option value="all">All Users</option>
                <option value="operator">Operators</option>
                <option value="faculty">Faculty</option>
                <option value="student">Students</option>
              </select>
            </div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} required rows={3} className="w-full p-2 border rounded text-sm" placeholder="Details..." />
            <div className="flex justify-end gap-2">
              <Button type="submit" size="sm" className="gap-1"><Send className="w-3.5 h-3.5" /> Publish</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {announcements.map((item) => (
          <Card key={item.id} className="border p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-base">{item.title}</h3>
                  <Badge variant={item.is_published ? "success" : "offline"}>{item.is_published ? "Published" : "Draft"}</Badge>
                  <Badge variant="entry" className="capitalize text-xs">{item.audience}</Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{item.message}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => togglePublish(item.id, item.is_published)}>
                  {item.is_published ? <EyeOff className="w-4 h-4 text-gray-500" /> : <Eye className="w-4 h-4 text-emerald-500" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

