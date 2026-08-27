"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Megaphone, X } from "lucide-react";

export function AnnouncementBanner() {
  const { user, token } = useAuthStore();
  const currentSessionToken = user?.currentSessionToken || token;

  const [activeAnnouncements, setActiveAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    const fetchActive = async () => {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (currentSessionToken) headers["X-Session-Token"] = currentSessionToken;

        const res = await fetch("/api/announcements/active", { headers });
        const result = await res.json();
        if (result.success) setActiveAnnouncements(result.data || []);
      } catch {}
    };
    fetchActive();
  }, [token, currentSessionToken]);

  const handleDismiss = async (id: string) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (currentSessionToken) headers["X-Session-Token"] = currentSessionToken;

      await fetch(`/api/announcements/${id}/dismiss`, { method: "POST", headers });
      setActiveAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch {
      setActiveAnnouncements((prev) => prev.filter((a) => a.id !== id));
    }
  };

  if (activeAnnouncements.length === 0) return null;

  const current = activeAnnouncements[0];

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-sm shadow-md transition">
      <div className="flex items-center gap-3">
        <Megaphone className="w-5 h-5 flex-shrink-0 animate-bounce" />
        <div>
          <span className="font-semibold mr-2">[{current.title}]:</span>
          <span>{current.message}</span>
        </div>
      </div>
      <button onClick={() => handleDismiss(current.id)} className="p-1 hover:bg-amber-600 rounded-full transition">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
