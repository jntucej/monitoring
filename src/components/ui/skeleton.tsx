"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("bg-[var(--border)] animate-pulse rounded-md", className)} {...props} />;
}
Skeleton.displayName = "Skeleton";
