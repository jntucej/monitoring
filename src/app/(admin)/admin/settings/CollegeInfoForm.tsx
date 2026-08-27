"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Loader2 } from "lucide-react";

export function CollegeInfoForm() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/config/college-info")
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/config/college-info", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        setMessage("Saved successfully.");
      } else {
        setMessage(json.error?.message || "Failed to save.");
      }
    } catch {
      setMessage("An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-[var(--action-warning)]" />
          General Settings
        </h3>
        <div className="flex justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 flex flex-col h-full">
      <h3 className="font-semibold flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-[var(--action-warning)]" />
        General Settings
      </h3>
      <div className="space-y-4 flex-1">
        <div>
          <label className="block text-sm mb-1">College Name</label>
          <input
            type="text"
            value={data?.name || ""}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Short Name</label>
          <input
            type="text"
            value={data?.shortName || ""}
            onChange={(e) => setData({ ...data, shortName: e.target.value })}
            className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Address</label>
          <textarea
            value={data?.address || ""}
            onChange={(e) => setData({ ...data, address: e.target.value })}
            className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm min-h-[80px]"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Principal</label>
          <input
            type="text"
            value={data?.principal || ""}
            onChange={(e) => setData({ ...data, principal: e.target.value })}
            className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm"
          />
        </div>

        {message && (
          <div className="text-sm mt-2 font-medium text-[var(--action-primary)]">
            {message}
          </div>
        )}
      </div>

      <div className="flex justify-end mt-6 pt-4 border-t border-[var(--border)]">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--action-primary)] text-white font-medium hover:brightness-110 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </form>
  );
}