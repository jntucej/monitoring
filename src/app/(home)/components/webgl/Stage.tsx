"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { usePerformanceTier } from "../hooks/usePerformanceTier";

const StageCanvas = dynamic(() => import("./StageCanvas"), {
  ssr: false,
  loading: () => null,
});

export interface StageProps {
  children: ReactNode;
  fallback: ReactNode;
}

export function Stage({ children, fallback }: StageProps) {
  const tier = usePerformanceTier();

  if (tier === "static") return <>{fallback}</>;

  return <StageCanvas>{children}</StageCanvas>;
}
