/**
 * student/ProfilePageV2 — persona-scoped profile using ProfileShell.
 *
 * Replaces the single generic UserProfileTab. Branches by persona:
 *   day_scholar → Commute + Guardian + shared
 *   hosteller → Residence + Outpass Defaults + Guardian + shared
 */

"use client";

import { useState } from "react";
import {
  User, FileText, Shield, Car, Building, Ticket, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePersona } from "@/hooks/usePersona";
import { useAuthStore } from "@/stores/authStore";
import { PersonaBadge } from "@/components/shared/PersonaBadge";
import type { Persona } from "@/lib/pass-types";
import type { ProfileTabKey } from "@/components/shared/profile/ProfileShell";
import {
  IdentitySection,
  DocumentsSection,
  PrivacySection,
  SecuritySection,
  CommuteSection,
  ResidenceSection,
  GuardianSection,
  OutpassDefaultsSection,
} from "@/components/shared/profile/sections";
import { RecordsSection } from "@/components/shared/profile/RecordsSection";

const TAB_META: Record<ProfileTabKey, { label: string; icon: React.ElementType; personas?: Persona[] }> = {
  overview:    { label: "Overview",  icon: User },
  commute:     { label: "Commute",   icon: Car, personas: ["day_scholar"] },
  residence:   { label: "Residence", icon: Building, personas: ["hosteller"] },
  guardian:    { label: "Guardian",  icon: Shield },
  outpass:     { label: "Outpass Defaults", icon: Ticket, personas: ["hosteller"] },
  documents:   { label: "Documents", icon: FileText },
  records:     { label: "My Records", icon: FileText },
  privacy:     { label: "Privacy",   icon: Shield },
  security:    { label: "Security",  icon: Lock },
};

export function ProfilePageV2() {
  const persona = usePersona();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<ProfileTabKey>("overview");

  // Persona-filtered tabs
  const tabs: ProfileTabKey[] = (Object.keys(TAB_META) as ProfileTabKey[])
    .filter((t) => {
      const meta = TAB_META[t];
      if (!meta.personas) return true;
      return meta.personas.includes(persona);
    });

  const activeTab: ProfileTabKey = tabs.includes(tab) ? tab : tabs[0] ?? "overview";

  const renderSection = (key: ProfileTabKey) => {
    switch (key) {
      case "overview":   return <IdentitySection />;
      case "commute":    return <CommuteSection />;
      case "residence":  return <ResidenceSection />;
      case "guardian":   return <GuardianSection />;
      case "outpass":    return <OutpassDefaultsSection />;
      case "documents":  return <DocumentsSection />;
      case "records":    return <RecordsSection />;
      case "privacy":    return <PrivacySection />;
      case "security":   return <SecuritySection />;
      default:           return null;
    }
  };

  return (
    <div className="space-y-4 px-4 py-6 md:px-6 min-w-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-action-primary/10 text-action-primary">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-text-primary">Your Profile</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <PersonaBadge persona={persona} />
            <span className="text-xs text-text-muted">
              {user?.name ?? "Student"}
            </span>
          </div>
        </div>
      </div>

      {/* Tab rail */}
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((t) => {
          const meta = TAB_META[t];
          const Icon = meta.icon;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                activeTab === t
                  ? "bg-action-primary/10 text-action-primary"
                  : "text-text-secondary hover:bg-bg-elevated"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* Active section */}
      {renderSection(activeTab)}
    </div>
  );
}

export default ProfilePageV2;
