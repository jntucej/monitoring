"use client";

import { Bell } from "lucide-react";
import { NotificationBell } from "@/components/shared/NotificationBell";
import { cn } from "@/lib/utils";

export function PrincipalNotificationBell({ className }: { className?: string }) {
  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <NotificationBell />
    </div>
  );
}
