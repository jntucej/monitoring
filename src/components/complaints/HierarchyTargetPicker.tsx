"use client";

import React from "react";

export type PresenceMark = "present" | "not_present" | "unknown";

export interface HierarchyRoleOption {
  roleCode: string;
  label: string;
}

export interface RoleCandidatePerson {
  id: string;
  name: string;
  designation?: string | null;
  departmentOrScope?: string | null;
  isOnCampus?: boolean | null;
}

export interface HierarchyTargetSelection {
  targetRole: string;
  targetUserId: string | null; // null = any available person in targetRole
  presenceMark: PresenceMark;
  presenceNote: string;
}

export const HIERARCHY_ROLE_OPTIONS: HierarchyRoleOption[] = [
  { roleCode: "caretaker", label: "Caretaker" },
  { roleCode: "hostel_manager", label: "Hostel Manager" },
  { roleCode: "deputy_warden", label: "Deputy Warden" },
  { roleCode: "hod", label: "Head of Department (HOD)" },
  { roleCode: "faculty", label: "Faculty" },
  { roleCode: "emo", label: "Estate / Maintenance (EMO)" },
  { roleCode: "exam_branch", label: "Exam Branch" },
  { roleCode: "principal", label: "Principal (Warden)" },
  { roleCode: "admin", label: "Admin" },
];

export function HierarchyTargetPicker({
  roles = HIERARCHY_ROLE_OPTIONS,
  peopleInRole,
  loadingPeople = false,
  value,
  onChange,
}: {
  roles?: HierarchyRoleOption[];
  peopleInRole: RoleCandidatePerson[];
  loadingPeople?: boolean;
  value: HierarchyTargetSelection;
  onChange: (next: HierarchyTargetSelection) => void;
}) {
  return (
    <div
      data-testid="hierarchy-target-picker"
      className="surface-card bg-bg-surface p-3.5 space-y-3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. Target role in hierarchy */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-text-muted">
            Direct To Hierarchy Role
          </label>
          <select
            value={value.targetRole}
            onChange={(e) =>
              onChange({
                ...value,
                targetRole: e.target.value,
                targetUserId: null,
              })
            }
            className="w-full rounded-lg border border-border bg-bg-base px-2.5 py-2 text-xs font-medium text-text-primary"
          >
            {roles.map((r) => (
              <option key={r.roleCode} value={r.roleCode}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Optional specific person from that role */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-text-muted">
            Specific Person (Optional)
          </label>
          <select
            disabled={loadingPeople}
            value={value.targetUserId ?? ""}
            onChange={(e) =>
              onChange({
                ...value,
                targetUserId: e.target.value ? e.target.value : null,
              })
            }
            className="w-full rounded-lg border border-border bg-bg-base px-2.5 py-2 text-xs font-medium text-text-primary disabled:opacity-60"
          >
            <option value="">
              {loadingPeople ? "Loading people..." : "Any available person in this role"}
            </option>
            {peopleInRole.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.designation ? ` — ${p.designation}` : ""}
                {p.isOnCampus === true
                  ? " (On Campus)"
                  : p.isOnCampus === false
                  ? " (Off Campus)"
                  : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Presence / availability mark */}
      <div className="space-y-1.5 pt-2 border-t border-border">
        <span className="text-xs font-semibold text-text-muted">
          Presence / Availability Mark
        </span>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "present", label: "Marked Present" },
              { id: "not_present", label: "Not Present / Absent" },
              { id: "unknown", label: "Not Checked" },
            ] as const
          ).map((opt) => {
            const active = value.presenceMark === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ ...value, presenceMark: opt.id })}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-action-primary bg-action-primary text-white"
                    : "border-border bg-bg-base text-text-primary hover:bg-bg-elevated"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <input
          type="text"
          value={value.presenceNote}
          onChange={(e) => onChange({ ...value, presenceNote: e.target.value })}
          placeholder="Optional presence/location context (e.g., not in office at 11:00 AM, block B)..."
          className="mt-1.5 w-full rounded-lg border border-border bg-bg-base px-2.5 py-1.5 text-xs text-text-primary"
        />
      </div>
    </div>
  );
}
