"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, ArrowUpRight, Clock } from "lucide-react";
import {
  getOccasionalProfileSettings,
  type OccasionalSettingItem,
} from "@/lib/role-profile-settings";
import { useIsSakuga } from "@/components/student/useIsSakuga";
import { useUIStore } from "@/stores/uiStore";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { UnsavedChangesBar } from "@/components/shared/UnsavedChangesBar";

export function RoleProfileSettingsPanel({
  role,
  storagePrefix = "role_profile_pref",
}: {
  role: string | undefined;
  storagePrefix?: string;
}) {
  const isSakuga = useIsSakuga();
  const addToast = useUIStore((s) => s.addToast);
  const items = getOccasionalProfileSettings(role);
  const loadSaved = () => {
    const initial: Record<string, string | boolean> = {};
    for (const item of items) {
      if (item.defaultValue !== undefined) {
        initial[item.id] = item.defaultValue;
      }
      if (typeof window !== "undefined") {
        const saved = window.localStorage.getItem(
          `${storagePrefix}:${role ?? "default"}:${item.id}`,
        );
        if (saved !== null) {
          initial[item.id] =
            saved === "true" ? true : saved === "false" ? false : saved;
        }
      }
    }
    return initial;
  };
  const [values, setValues] = useState<Record<string, string | boolean>>(loadSaved);
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesGuard(dirty);

  const updateValue = (id: string, next: string | boolean) => {
    setValues((prev) => ({ ...prev, [id]: next }));
    setDirty(true);
  };

  const handleSave = () => {
    if (typeof window !== "undefined") {
      for (const [id, val] of Object.entries(values)) {
        window.localStorage.setItem(
          `${storagePrefix}:${role ?? "default"}:${id}`,
          String(val),
        );
      }
    }
    setDirty(false);
    addToast({
      variant: "success",
      title: "Settings Saved",
      message: "Role preferences updated.",
    });
  };

  const handleDiscard = () => {
    setValues(loadSaved());
    setDirty(false);
  };

  return (
    <section
      data-testid="role-occasional-settings"
      className="surface-card p-4 space-y-4"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3 w-3 text-action-primary" />
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Occasional Role Settings
            </h3>
            <p className="text-xs text-text-muted">
              Tailored preferences for{" "}
              <span className="font-mono font-medium">{role ?? "user"}</span>
              —set when workflows, shifts, or semesters change.
            </p>
          </div>
        </div>
      </div>

      <UnsavedChangesBar
        hasUnsavedChanges={dirty}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      <div className="divide-y divide-border">
        {items.map((item: OccasionalSettingItem) => {
          const val = values[item.id];
          return (
            <div
              key={item.id}
              className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1 max-w-xl">
                <p className="text-sm font-medium text-text-primary">
                  {item.title}
                </p>
                <p className="text-xs text-text-muted">{item.description}</p>
                <p className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>{item.whenToSet}</span>
                </p>
              </div>

              <div className="shrink-0">
                {item.controlType === "toggle" &&
                  (isSakuga ? (
                    <sakuga-toggle
                      checked={Boolean(val)}
                      label={item.title}
                      onChange={() => updateValue(item.id, !Boolean(val))}
                    />
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(val)}
                      onClick={() => updateValue(item.id, !Boolean(val))}
                      className={`inline-flex h-6 w-11 items-center rounded-full transition-colors p-0.5 ${
                        Boolean(val) ? "bg-action-primary" : "bg-bg-elevated"
                      }`}
                    >
                      <span
                        className={`h-5 w-5 rounded-full bg-bg-surface transition-transform ${
                          Boolean(val) ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  ))}

                {item.controlType === "select" && item.options && (
                  <select
                    value={String(val ?? item.defaultValue ?? "")}
                    onChange={(e) => updateValue(item.id, e.target.value)}
                    className="rounded-lg border border-border bg-bg-base px-2.5 py-1.5 text-xs font-medium text-text-primary"
                  >
                    {item.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {item.controlType === "link" && item.href && (
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-base px-2.5 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-elevated transition-colors"
                  >
                    <span>Configure</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
