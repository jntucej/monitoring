"use client";

/**
 * HeroUI v3 ToggleButtonGroup + ToggleButton (segmented control replacement).
 * Replaces hand-rolled "24h | Today | 7d" pill switchers.
 *   <ToggleGroup value={v} onValueChange={setV}>
 *     <ToggleButton value="24h">24h</ToggleButton>
 *     <ToggleButton value="7d">7d</ToggleButton>
 *   </ToggleGroup>
 */
import * as React from "react";
import { ToggleButtonGroup as HeroGroup, ToggleButton as HeroToggle } from "@heroui/react";
import { cn } from "@/lib/utils";

function ToggleGroupBase({ className, ...props }: React.ComponentProps<typeof HeroGroup.Root>) {
  return <HeroGroup.Root className={cn("surface-card inline-flex gap-1 rounded-lg p-1", className)} {...props} />;
}
ToggleGroupBase.displayName = "ToggleGroup";

function ToggleButtonBase({ className, ...props }: React.ComponentProps<typeof HeroToggle.Root>) {
  return <HeroToggle.Root className={cn("text-xs font-medium", className)} {...props} />;
}
ToggleButtonBase.displayName = "ToggleButton";

export const ToggleGroup = Object.assign(ToggleGroupBase, { Root: ToggleGroupBase });
export const ToggleButton = Object.assign(ToggleButtonBase, { Root: ToggleButtonBase });

export type ToggleGroupProps = React.ComponentProps<typeof HeroGroup.Root>;
export type ToggleButtonProps = React.ComponentProps<typeof HeroToggle.Root>;
export default ToggleGroup;
