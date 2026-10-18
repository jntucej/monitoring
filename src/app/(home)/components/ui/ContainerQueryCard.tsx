"use client";

import { GlassPanel, type GlassPanelProps } from "./GlassPanel";

/**
 * Thin alias around GlassPanel. Kept for readability at call sites where
 * the intent is "this surface scales its blur by its own width."
 */
export function ContainerQueryCard(props: GlassPanelProps) {
  return <GlassPanel {...props} />;
}
