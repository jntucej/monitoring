"use client";

import { useMemo } from "react";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { DevContactStrip } from "@/components/shared/DevContactStrip";
import { PageLoading } from "@/components/shared/LoadingStates";
import { useApiResource, clearCache } from "@/hooks/useApiResource";
import { usePolling } from "@/hooks/usePolling";
import {
  Cpu,
  DoorOpen,
  Radio,
  MapPin,
  Clock,
  Lock,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

/* ── response shape (mirrors /api/admin/gate-device-configuration) ────────── */

interface GateSchedule {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_active: boolean;
}

interface GateRow {
  id: string;
  gate_code: string;
  name: string;
  location: string;
  type: string;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  allowed_radius_meters: number | null;
  schedules: GateSchedule[];
}

interface DeviceVerification {
  device_type: string;
  enabled: boolean;
  scope: string;
  scope_id: string | null;
}

interface GateDeviceConfigData {
  gates: GateRow[];
  device_verification: DeviceVerification[];
  note?: string;
}

const DEVICE_LABELS: Record<string, string> = {
  thumb: "Thumbprint",
  face: "Face",
  barcode: "Barcode",
  qr: "QR Code",
};

const DAY_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function AdminGateDeviceConfigurationInner() {
  const res = useApiResource<GateDeviceConfigData>("/api/admin/gate-device-configuration", { ttlMs: 30_000 });

  usePolling(
    () => {
      clearCache("/api/admin/gate-device-configuration");
      return res.refresh();
    },
    { intervalMs: 60_000 }
  );

  const gates = res.data?.gates ?? [];
  const deviceVerification = res.data?.device_verification ?? [];
  const loading = res.loading && !res.data;

  const activeGates = useMemo(() => gates.filter((g) => g.is_active), [gates]);
  const totalScheduleEntries = useMemo(
    () => gates.reduce((sum, g) => sum + g.schedules.length, 0),
    [gates]
  );

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <WidgetBoundary title="Gate Roster">
          <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <DoorOpen className="w-3.5 h-3.5 text-emerald-400" /> Gate Roster
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading ? <span className="inline-block w-10 h-5 rounded bg-slate-800 animate-pulse" /> : activeGates.length}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">Active gates configured</p>
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Schedules">
          <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Clock className="w-3.5 h-3.5 text-blue-400" /> Schedule Entries
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading ? <span className="inline-block w-10 h-5 rounded bg-slate-800 animate-pulse" /> : totalScheduleEntries}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">Gate opening windows defined</p>
          </div>
        </WidgetBoundary>

        <WidgetBoundary title="Devices">
          <div className="rounded-xl border border-slate-800 bg-[#0d1220] p-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Cpu className="w-3.5 h-3.5 text-amber-400" /> Device Modes
            </div>
            <div className="mt-1.5 text-xl font-black text-white tabular-nums">
              {loading
                ? <span className="inline-block w-10 h-5 rounded bg-slate-800 animate-pulse" />
                : deviceVerification.filter((dv) => dv.enabled).length}
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">Verification modes enabled</p>
          </div>
        </WidgetBoundary>
      </div>

      {/* Gate configuration cards */}
      <WidgetBoundary title="Gate Configuration">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-800 bg-[#0d1220] p-4 space-y-2 animate-pulse">
                <div className="h-4 w-32 rounded bg-slate-800" />
                <div className="h-3 w-40 rounded bg-slate-800" />
                <div className="h-3 w-24 rounded bg-slate-800" />
              </div>
            ))
          ) : gates.length === 0 ? (
            <div className="col-span-full rounded-xl border border-slate-800 bg-[#0d1220] p-8 text-center">
              <DoorOpen className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No gates configured yet.</p>
              <Link
                href="/admin/gates"
                className="mt-3 inline-block text-xs font-semibold text-emerald-400 hover:text-emerald-300"
              >
                View gate telemetry →
              </Link>
            </div>
          ) : (
            gates.map((gate) => (
              <div
                key={gate.id}
                className={`rounded-xl border p-4 space-y-3 ${
                  gate.is_active
                    ? "bg-[#0d1220] border-slate-800"
                    : "bg-slate-900/40 border-slate-800/60 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{gate.name}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">{gate.gate_code} · {gate.location}</p>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase shrink-0 ${
                      gate.is_active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {gate.is_active ? "Active" : "Disabled"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-slate-900/60 p-2.5">
                    <p className="text-slate-500 mb-0.5">Geofence</p>
                    <p className="text-slate-200 tabular-nums">
                      {gate.latitude != null && gate.longitude != null
                        ? `${gate.latitude.toFixed(4)}, ${gate.longitude.toFixed(4)}`
                        : "Not set"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900/60 p-2.5">
                    <p className="text-slate-500 mb-0.5">Radius</p>
                    <p className="text-slate-200 tabular-nums">
                      {gate.allowed_radius_meters != null ? `${gate.allowed_radius_meters} m` : "Default"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Schedules
                  </p>
                  {gate.schedules.length === 0 ? (
                    <p className="text-xs text-slate-500">No schedule entries</p>
                  ) : (
                    <ul className="space-y-1">
                      {gate.schedules.slice(0, 4).map((s) => (
                        <li key={`${s.day_of_week}-${s.open_time}`} className="flex items-center gap-2 text-xs">
                          <span className="w-8 text-slate-500 font-medium">{DAY_LABELS[s.day_of_week] || `D${s.day_of_week}`}</span>
                          <span className="text-slate-300 tabular-nums">
                            {s.open_time?.slice(0, 5)} – {s.close_time?.slice(0, 5)}
                          </span>
                          {!s.is_active && (
                            <span className="text-[10px] text-slate-600 uppercase">off</span>
                          )}
                        </li>
                      ))}
                      {gate.schedules.length > 4 && (
                        <li className="text-[11px] text-slate-500">+{gate.schedules.length - 4} more</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </WidgetBoundary>

      {/* Device verification modes */}
      <WidgetBoundary title="Device Verification Modes">
        <div className="rounded-2xl border border-slate-800 bg-[#0d1220] overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-2">
              <div className="h-4 rounded bg-slate-800 animate-pulse" />
              <div className="h-4 rounded bg-slate-800 animate-pulse" />
            </div>
          ) : deviceVerification.length === 0 ? (
            <div className="p-8 text-center">
              <Radio className="w-6 h-6 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No device verification modes configured.</p>
              <p className="mt-1 text-xs text-slate-500">Modes are provisioned by the platform team.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/70">
              {deviceVerification.map((dv) => (
                <div key={dv.device_type} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {dv.enabled ? (
                      <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white">
                        {DEVICE_LABELS[dv.device_type] || dv.device_type}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Scope: {dv.scope === "global" ? "Campus-wide" : `${dv.scope}${dv.scope_id ? " (scoped)" : ""}`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase shrink-0 ${
                      dv.enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {dv.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </WidgetBoundary>

      {/* Read-only notice */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 flex items-start gap-3">
        <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300 flex items-center gap-1.5">
            Read-only view <AlertCircle className="w-3.5 h-3.5 opacity-70" />
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Gate geofences, schedules and device verification modes are locked for admins — editing
            requires sysadmin access. Live hardware telemetry and operator assignments stay under the{" "}
            <Link href="/admin/gates" className="text-emerald-400 hover:underline">Gates</Link> section.
          </p>
        </div>
      </div>

      <DevContactStrip />
    </div>
  );
}

export default function AdminGateDeviceConfigurationPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AdminGateDeviceConfigurationInner />
    </Suspense>
  );
}
