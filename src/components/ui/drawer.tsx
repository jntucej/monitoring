"use client";

import * as React from "react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { Drawer as HeroDrawer } from "./HeroDrawerPrimitive";

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
  showClose,
}: DrawerProps) {
  const isMobile = useBreakpoint({ mobile: "(max-width: 767px)" }).mobile;
  // Mobile: right-placement drawers become bottom sheets.
  const heroPlacement = isMobile && placement === "right" ? "bottom" : placement;

  return (
    <HeroDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      placement={heroPlacement}
      className={className}
      showClose={showClose}
    >
      {children}
    </HeroDrawer>
  );
}

export default Drawer;
