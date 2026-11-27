"use client";

import * as React from "react";
import { Skeleton as HeroSkeleton } from "@heroui/react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <HeroSkeleton
      className={cn("bg-border/60 rounded-md", className)}
      {...(props as Record<string, unknown>)}
    />
  );
}
Skeleton.displayName = "Skeleton";
