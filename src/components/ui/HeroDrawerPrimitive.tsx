"use client";

import * as React from "react";
import { Drawer as HeroDrawer } from "@heroui/react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  placement?: "left" | "right" | "top" | "bottom";
  children: React.ReactNode;
  className?: string;
  showClose?: boolean;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  placement = "right",
  children,
  className,
  showClose = true,
}: DrawerProps) {
  return (
    <HeroDrawer
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <HeroDrawer.Backdrop
        isDismissable
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      >
        <HeroDrawer.Content
          placement={placement}
          className={cn(
            "z-50 bg-bg-surface border-border shadow-2xl",
            placement === "right" && "border-l w-full max-w-md",
            placement === "left" && "border-r w-full max-w-xs",
            placement === "bottom" && "border-t rounded-t-2xl max-h-[85dvh]",
            placement === "top" && "border-b rounded-b-2xl max-h-[85dvh]",
            className
          )}
        >
          <HeroDrawer.Dialog className="flex h-full flex-col outline-none">
            {(title || showClose) && (
              <HeroDrawer.Header className="flex items-center justify-between border-b border-border px-4 py-3">
                {title ? (
                  <HeroDrawer.Heading className="text-base font-semibold text-text-primary">
                    {title}
                  </HeroDrawer.Heading>
                ) : (
                  <span />
                )}
                {showClose && (
                  <HeroDrawer.CloseTrigger
                    aria-label="Close drawer"
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </HeroDrawer.CloseTrigger>
                )}
              </HeroDrawer.Header>
            )}
            <HeroDrawer.Body className="flex-1 overflow-y-auto p-4">
              {children}
            </HeroDrawer.Body>
          </HeroDrawer.Dialog>
        </HeroDrawer.Content>
      </HeroDrawer.Backdrop>
    </HeroDrawer>
  );
}
