"use client";

import React from "react";
import { useSearchParams } from "next/navigation";
import { PersonIdCard } from "@/components/person/PersonIdCard";
import { ActivePasses } from "@/components/student/ActivePasses";
import { RecentActivity } from "@/components/student/RecentActivity";
import { UserProfileTab } from "@/components/shared/UserProfileTab";
import { QrCode, FileCheck, Clock, User } from "lucide-react";

export default function PersonDashboardPage() {
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get("tab") || "idcard";

  const renderActiveView = () => {
    switch (currentTab) {
      case "passes":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="w-5 h-5 text-[var(--action-primary)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Gate Pass Requests</h2>
            </div>
            <ActivePasses />
          </div>
        );
      case "history":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-[var(--action-primary)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Personal Entrance History</h2>
            </div>
            <RecentActivity />
          </div>
        );
      case "profile":
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-2 justify-center">
              <User className="w-5 h-5 text-[var(--action-primary)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Account Profile</h2>
            </div>
            <UserProfileTab />
          </div>
        );
      case "idcard":
      default:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start">
              <QrCode className="w-5 h-5 text-[var(--action-primary)]" />
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Digital Campus ID Card</h2>
            </div>
            <div className="max-w-md mx-auto sm:max-w-none">
              <PersonIdCard />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Dynamic Tab Heading */}
      <div className="text-center sm:text-left border-b border-[var(--border)] pb-4 space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
          {currentTab === "idcard" && "Campus Pass Hub"}
          {currentTab === "passes" && "Gate Passes Desk"}
          {currentTab === "history" && "Activity History"}
          {currentTab === "profile" && "Account Center"}
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          {currentTab === "idcard" && "Your permanent digital identity card & boarding passes"}
          {currentTab === "passes" && "Track permissions, request leaves, and review warden status"}
          {currentTab === "history" && "Complete audit trail of your campus entries and exits"}
          {currentTab === "profile" && "Manage theme settings, local details, and credentials"}
        </p>
      </div>

      <main className="min-h-[50vh] flex flex-col justify-start">
        {renderActiveView()}
      </main>
    </div>
  );
}
