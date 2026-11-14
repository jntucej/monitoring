"use client";
import { cn } from "@/lib/utils";

export interface GlossyFloatingContainerProps {
  children: React.ReactNode;
  className?: string;
  floatDelay?: number;
  floatDistance?: number;
  enableFloat?: boolean;
}

export function GlossyFloatingContainer({ children, className }: GlossyFloatingContainerProps) {
  return <div className={cn("rounded-[var(--radius-card)]", className)}>{children}</div>;
}

export default GlossyFloatingContainer;
