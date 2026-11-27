"use client";

import * as React from "react";
import { Modal as HeroModal } from "@heroui/react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "fullscreen";
  showClose?: boolean;
}

const sizeClasses: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
  "3xl": "max-w-7xl",
  "4xl": "max-w-[85vw]",
  "5xl": "max-w-[92vw]",
  fullscreen: "w-full h-full max-w-none m-0 rounded-none",
};

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showClose = true,
}: ModalProps) => {
  return (
    <HeroModal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <HeroModal.Backdrop
        isDismissable
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      >
        <HeroModal.Container
          placement="center"
          scroll="inside"
          className="z-50 flex items-center justify-center p-4"
        >
          <HeroModal.Dialog
            className={cn(
              "relative w-full rounded-[var(--radius-lg)] bg-bg-surface border border-border shadow-2xl overflow-hidden",
              sizeClasses[size]
            )}
          >
            {showClose && (
              <HeroModal.CloseTrigger
                aria-label="Close modal"
                className="absolute top-4 right-4 z-10 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
              >
                <X className="w-5 h-5" />
              </HeroModal.CloseTrigger>
            )}
            {title && (
              <HeroModal.Header className="border-b border-border px-6 py-4">
                <HeroModal.Heading className="text-xl font-semibold text-text-primary">
                  {title}
                </HeroModal.Heading>
              </HeroModal.Header>
            )}
            <HeroModal.Body className="p-6">{children}</HeroModal.Body>
          </HeroModal.Dialog>
        </HeroModal.Container>
      </HeroModal.Backdrop>
    </HeroModal>
  );
};

export { Modal };
