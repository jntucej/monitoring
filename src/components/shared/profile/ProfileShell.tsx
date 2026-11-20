/**
 * shared/profile/ProfileShell — persona-scoped profile layout.
 *
 * Left: tab rail (persona modules + shared sections).
 * Right: active section content.
 *
 * Replaces the single generic UserProfileTab for students: branches by
 * persona (Commute / Residence / Guardian / Outpass Defaults) plus shared
 * sections that every persona gets.
 */

"use client";

import { useState } from "react";
import { User, FileText, LogOut, Car, Building, Shield, Ticket, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersona } from "@/hooks/usePersona";
import { PersonaBadge } from "@/components/shared/PersonaBadge";
import type { Persona } from "@/lib/pass-types";

export type ProfileTabKey =
  | "overview"
  | "commute"
  | "residence"
  | "guardian"
  | "outpass"
  | "documents"
  | "privacy"
  | "security";

export interface ProfileShellProps {
  /** Which tabs to render. Persona modules are auto-filtered by the active persona. */
  tabs?: ProfileTabKey[];
  activeTab?: ProfileTabKey;
  onTabChange?: (tab: ProfileTabKey) => void;
  /** Render a tab's content. Receives the tab key. */
  renderTab: (tab: ProfileTabKey) => React.ReactNode;
  /** Custom header (defaults to persona badge + overview). */
  header?: React.ReactNode;
  className?: string;
}

const TAB_META: Record<ProfileTabKey, { label: string; icon: React.ElementType; personas?: Persona[] }> = {
  overview: { label: "Overview", icon: User },
  commute: { label: "Commute", icon: Car, personas: ["day_scholar"] },
  residence: { label: "Residence", icon: Building, personas: ["hosteller"] },
  guardian: { label: "Guardian", icon: Shield },
  outpass: { label: "Outpass Defaults", icon: Ticket, personas: ["hosteller"] },
  documents: { label: "Documents", icon: FileText },
  privacy: { label: "Privacy & Access", icon: Shield },
  security: { label: "Security", icon: Lock },
};

export function ProfileShell({
  tabs,
  activeTab,
  onTabChange,
  renderTab,
  header,
  className,
}: ProfileShellProps) {
  const persona = usePersona();
  const [internalTab, setInternalTab] = useState<ProfileTabKey>("overview");

  // Persona-filter the tabs: only show persona modules this persona owns.
  const visibleTabs: ProfileTabKey[] = (tabs ?? (Object.keys(TAB_META) as ProfileTabKey[]))
    .filter((t) => {
      const meta = TAB_META[t];
      if (!meta.personas) return true; // shared — everyone
      return meta.personas.includes(persona);
    });

  const active = activeTab ?? internalTab;
  const activeKey: ProfileTabKey = visibleTabs.includes(active) ? active : visibleTabs[0] ?? "overview";

  const handleTab = (t: ProfileTabKey) => {
    setInternalTab(t);
    onTabChange?.(t);
  };

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4", className)}>
      {/* Left rail */}
      <aside className="md:sticky md:top-24 self-start space-y-1">
        <nav className="space-y-0.5">
          {visibleTabs.map((t) => {
            const meta = TAB_META[t];
            const Icon = meta.icon;
            return (
              <button
                key={t}
                type="button"
                onClick={() => handleTab(t)}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition",
                  activeKey === t
                    ? "bg-action-primary/10 text-action-primary"
                    : "text-text-secondary hover:bg-bg-elevated"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {meta.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Right content */}
      <div className="space-y-4 min-w-0">
        {header ?? (
          <div className="flex items-center gap-3">
            <PersonaBadge persona={persona} />
            <div>
              <h2 className="text-base font-bold text-text-primary capitalize">{TAB_META[activeKey].label}</h2>
              <p className="text-xs text-text-muted">persona: {persona}</p>
            </div>
          </div>
        )}
        {renderTab(activeKey)}
      </div>
    </div>
  );
}

export default ProfileShell;
