"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

interface CollegeInfoData {
  name: string;
  shortName: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
  accreditation: string;
  website: string;
  principal: string;
}

const EMPTY: CollegeInfoData = {
  name: "",
  shortName: "",
  address: "",
  phone: "",
  email: "",
  logo: "",
  accreditation: "",
  website: "",
  principal: "",
};

export function CollegeInfoForm() {
  const [data, setData] = useState<CollegeInfoData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchCollegeInfo = async () => {
    try {
      const res = await fetch("/api/config/college-info", { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && json.data) {
        setData({ ...EMPTY, ...json.data });
      }
    } catch {
      // keep empty state on fetch error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCollegeInfo();
  }, []);

  const update = (field: keyof CollegeInfoData, value: string) =>
    setData((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/config/college-info", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "College info saved." });
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to save." });
      }
    } catch {
      setMessage({ type: "error", text: "An error occurred while saving." });
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]";

  if (loading) {
    return (
      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6">
        <h3 className="font-semibold flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-[var(--action-warning)]" />
          College Info
        </h3>
        <div className="flex justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border)] p-6 flex flex-col h-full"
    >
      <h3 className="font-semibold flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-[var(--action-warning)]" />
        College Info
      </h3>

      <div className="space-y-4 flex-1">
        <div>
          <label className="block text-sm mb-1 text-[var(--text-primary)]">Name</label>
          <input type="text" value={data.name} onChange={(e) => update("name", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm mb-1 text-[var(--text-primary)]" htmlFor="short-name">Short Name</label>
          <input id="short-name"
            type="text"
            value={data.shortName}
            onChange={(e) => update("shortName", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-[var(--text-primary)]" htmlFor="address">Address</label>
          <textarea id="address"
            value={data.address}
            onChange={(e) => update("address", e.target.value)}
            className={`${inputCls} min-h-[72px]`}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1 text-[var(--text-primary)]">Phone</label>
            <input type="tel" value={data.phone} onChange={(e) => update("phone", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm mb-1 text-[var(--text-primary)]" htmlFor="email">Email</label>
            <input id="email"
              type="email"
              value={data.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1 text-[var(--text-primary)]">Logo URL</label>
          <input type="url" value={data.logo} onChange={(e) => update("logo", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm mb-1 text-[var(--text-primary)]" htmlFor="accreditation">Accreditation</label>
          <input id="accreditation"
            type="text"
            value={data.accreditation}
            onChange={(e) => update("accreditation", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-[var(--text-primary)]">Website</label>
          <input type="url" value={data.website} onChange={(e) => update("website", e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm mb-1 text-[var(--text-primary)]" htmlFor="principal">Principal</label>
          <input id="principal"
            type="text"
            value={data.principal}
            onChange={(e) => update("principal", e.target.value)}
            className={inputCls}
          />
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 text-sm font-medium ${
              message.type === "success" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {message.text}
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
