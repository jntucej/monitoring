"use client";

import { PermissionDetailPanel } from "@/components/approver/PermissionDetailPanel";
import type { PermissionItem } from "@/components/approver/PermissionRow";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Drawer as HeroDrawer } from "@/components/ui/HeroDrawerPrimitive";
import { cn } from "@/lib/utils";

export interface PermissionDetailSheetProps {
  item: PermissionItem | null;
  onClose: () => void;
  onActionComplete?: () => void;
}

export function PermissionDetailSheet({
  item,
  onClose,
  onActionComplete,
}: PermissionDetailSheetProps) {
  const isMobile = useBreakpoint({ mobile: "(max-width: 767px)" }).mobile;
  if (!item) return null;

  return (
    <HeroDrawer
      isOpen
      onClose={onClose}
      placement={isMobile ? "bottom" : "right"}
      className={cn(
        "bg-bg-surface",
        isMobile ? "max-h-[85dvh] p-4 space-y-3" : "w-full max-w-md h-full p-4"
      )}
    >
      <PermissionDetailPanel
        ticket={item.ticket_number}
        onClose={onClose}
        onActionComplete={onActionComplete}
        isStandalonePage
      />
    </HeroDrawer>
  );
}
