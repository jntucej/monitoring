// src/app/(admin)/admin/anti-ragging-config/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/utils";
import { SectionCard } from "@/components/admin/shared/SectionCard";

export default function AntiRaggingConfigPage() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/admin/anti-ragging-alert-config", { headers: getAuthHeaders() });
      const j = await r.json();
      setConfig(j.data?.config ?? { enabled: true, email_roles: ["principal", "supervisor", "admin"], extra_emails: [], sms_roles: ["principal"] });
      setLoading(false);
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/admin/anti-ragging-alert-config", {
      method: "PATCH",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const j = await r.json();
    if (j.success) alert("Saved successfully");
    else alert(j.error?.message ?? "Failed");
  };

  if (loading) return <p className="p-6 text-slate-500">Loading…</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Anti-Ragging Alert Configuration</h1>
      <form onSubmit={save} className="space-y-4 bg-white p-6 border rounded shadow-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
          />
          <span className="font-medium text-sm">Enable anti-ragging email alerts</span>
        </label>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="extra-email-addresses-comma-separated">Extra Email Addresses (comma separated)</label>
          <input id="extra-email-addresses-comma-separated"
            type="text"
            value={(config.extra_emails ?? []).join(", ")}
            onChange={(e) => setConfig({ ...config, extra_emails: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            className="w-full border rounded p-2 text-sm"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-slate-900 text-white rounded text-sm font-medium">
          Save Configuration
        </button>
      </form>
    </div>
  );
}
