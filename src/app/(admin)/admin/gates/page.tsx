"use client";

import React, { useEffect, useState } from "react";
import { GateDeviceTracker, GateDevice } from "@/components/admin/GateDeviceTracker";
import { ShieldCheck, RefreshCw, AlertCircle, Signal } from "lucide-react";
import { getAuthHeaders } from "@/lib/utils";

export default function AdminGatesPage() {
  const [devices, setDevices] = useState<GateDevice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/gate/devices", {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices || []);
      } else {
        const msg = typeof data.error === "string" ? data.error : data.error?.message || "Failed to fetch gate telemetry";
        setError(msg);
      }
    } catch (err: any) {
      console.error("Error fetching gates:", err);
      setError("Network or server error loading gate telemetry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 20000); // 20s auto-refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Signal className="w-6 h-6 text-emerald-400" />
            Gate & Hardware Management
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Monitor real-time gate terminal status, operator shifts, scan activity, and hardware health.
          </p>
        </div>
        <button
          onClick={fetchDevices}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--action-primary)] text-white font-medium text-sm hover:opacity-90 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      {loading && devices.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <GateDeviceTracker devices={devices} onRefresh={fetchDevices} />
      )}
    </div>
  );
}