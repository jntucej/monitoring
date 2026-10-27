"use client";

export const dynamic = "force-dynamic";

import React, { useState, useCallback } from "react";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { useUIStore } from "@/stores/uiStore";
import { cn, formatDate } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import {
  Cpu,
  Fingerprint,
  ScanFace,
  ScanBarcode,
  QrCode,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Globe,
  ShieldCheck,
} from "lucide-react";

interface DeviceSetting {
  id?: string;
  device_type: "thumb" | "face" | "barcode" | "qr";
  enabled: boolean;
  scope: string;
  scope_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface DeviceConfig {
  type: "thumb" | "face" | "barcode" | "qr";
  name: string;
  icon: typeof Fingerprint;
  description: string;
  accentColor: string;
}

const DEVICE_CONFIGS: DeviceConfig[] = [
  {
    type: "thumb",
    name: "Thumbprint Biometrics",
    icon: Fingerprint,
    description: "Biometric fingerprint scanner at entry/exit turnstiles for student and staff identity validation.",
    accentColor: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/30",
  },
  {
    type: "face",
    name: "Facial Recognition Gate",
    icon: ScanFace,
    description: "AI optical facial scan camera for contactless gate passage and instant turnstile unlock.",
    accentColor: "from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/30",
  },
  {
    type: "barcode",
    name: "Barcode Scanner",
    icon: ScanBarcode,
    description: "Laser barcode reader for student physical ID card barcode verification and express pass checkout.",
    accentColor: "from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/30",
  },
  {
    type: "qr",
    name: "QR Code Scanner",
    icon: QrCode,
    description: "Dynamic high-density optical QR scanner for mobile digital passes and guest permits.",
    accentColor: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/30",
  },
];
export default function SysadminDevicesPage() {
const api = useApi();

  const { addToast } = useUIStore();
  const [settings, setSettings] = useState<Record<string, DeviceSetting>>({});
  const [loading, setLoading] = useState(true);
  const [updatingType, setUpdatingType] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/device-settings", {
        headers: api.getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load device settings");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const map: Record<string, DeviceSetting> = {};
        for (const item of json.data) {
          map[item.device_type] = item;
        }
        setSettings(map);
      }
    } catch {
      addToast({ variant: "error", message: "Failed to load device settings." });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useLiveRefresh(fetchSettings, { intervalMs: 30000 });

  const handleToggle = async (config: DeviceConfig) => {
    const current = settings[config.type] || {
      device_type: config.type,
      enabled: false,
      scope: "global",
    };
    const targetState = !current.enabled;
    const targetId = current.id || config.type;

    setUpdatingType(config.type);
    try {
      const res = await fetch(`/api/admin/device-settings/${targetId}`, {
        method: "PATCH",
        headers: api.getHeaders(),
        body: JSON.stringify({
          enabled: targetState,
          scope: current.scope || "global",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update device setting");
      }

      setSettings((prev) => ({
        ...prev,
        [config.type]: {
          ...current,
          ...json.data,
          enabled: targetState,
        },
      }));

      addToast({
        variant: "success",
        message: `${config.name} verification ${targetState ? "enabled" : "disabled"}.`,
      });
    } catch (err: unknown) {
      addToast({
        variant: "error",
        message: (err as Error).message || "Failed to toggle setting.",
      });
    } finally {
      setUpdatingType(null);
    }
  };

  return (
    <AuthGuard allowedRoles={["sysadmin", "admin"]}>
      <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Cpu className="w-6 h-6 text-indigo-400" />
              Device Verification Settings
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Configure automated gate turnstile and device scan verification methods across campus.
             </p>
           </div>
         </div>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-amber-400">Hardware Readiness Notice</h3>
            <p className="text-xs text-amber-300/80 mt-0.5 leading-relaxed">
              Enable only when corresponding hardware is installed and tested.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {DEVICE_CONFIGS.map((config) => {
            const Icon = config.icon;
            const current = settings[config.type] || {
              device_type: config.type,
              enabled: false,
              scope: "global",
            };
            const isEnabled = !!current.enabled;
            const isBusy = updatingType === config.type;

            return (
              <Card
                key={config.type}
                className={cn(
                  "relative transition-all duration-200 border bg-[var(--bg-surface)] hover:border-[var(--primary)]/40",
                  isEnabled
                    ? "border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.06)]"
                    : "border-[var(--border)]"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2.5 rounded-xl border bg-gradient-to-br", config.accentColor)}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-[var(--text-primary)] font-semibold">
                          {config.name}
                        </CardTitle>
                        <p className="text-xs text-[var(--text-muted)] font-mono mt-0.5">
                          type: {config.type}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={isEnabled ? "success" : "offline"}
                      className="px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase flex items-center gap-1.5"
                    >
                      {isEnabled ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ENABLED
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          DISABLED
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0">
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed min-h-[36px]">
                    {config.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border)]">
                        <Globe className="w-3 h-3" />
                        Scope: {current.scope || "Global"}
                      </span>
                      {current.updated_at && (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          Synced {formatDate(current.updated_at)}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      disabled={isBusy || loading}
                      onClick={() => handleToggle(config)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50",
                        isEnabled ? "bg-emerald-500" : "bg-[var(--bg-elevated)] border-[var(--border)]"
                      )}
                    >
                      <span className="sr-only">Toggle {config.name}</span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          isEnabled ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]/50 flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0" />
          <p className="text-xs text-[var(--text-muted)]">
            Device toggle mutations are protected with system administrator zero-trust RBAC and immutable telemetry audit logging.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}

