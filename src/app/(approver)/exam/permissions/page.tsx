"use client";

import React, { useState } from "react";
import { PermissionList } from "@/components/approver/PermissionList";
import { Tabs } from "@/components/ui/tabs";
import { ShieldCheck, UserCheck } from "lucide-react";

export default function ExamPermissionsPage() {
  const [activeTab, setActiveTab] = useState<string>("oie");

  const tabs = [
    {
      id: "oie",
      label: "OIE Queue",
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: "vice_principal",
      label: "VP Queue",
      icon: <UserCheck className="w-4 h-4" />,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Exam Branch Permissions</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Review examination clearance and approval queues
        </p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id)} />

      {activeTab === "oie" ? (
        <PermissionList
          key="oie-queue"
          workflowType="exam"
          stageFilter="oie"
          title="OIE Queue"
          subtitle="Officer in Examination approval queue"
        />
      ) : (
        <PermissionList
          key="vp-queue"
          workflowType="exam"
          stageFilter="vice_principal"
          title="Vice Principal Queue"
          subtitle="Vice Principal examination review queue"
        />
      )}
    </div>
  );
}
