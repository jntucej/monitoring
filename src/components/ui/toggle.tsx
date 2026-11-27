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

interface ToggleGroupPropsInternal
  extends Omit<React.ComponentProps<typeof HeroGroup.Root>, "selectedKeys" | "onSelectionChange"> {
  value?: string;
  onValueChange?: (value: string) => void;
  selectedKeys?: React.ComponentProps<typeof HeroGroup.Root>["selectedKeys"];
  onSelectionChange?: React.ComponentProps<typeof HeroGroup.Root>["onSelectionChange"];
}

function ToggleGroupBase({
  className,
  value,
  onValueChange,
  selectedKeys,
  onSelectionChange,
  selectionMode = "single",
  disallowEmptySelection = true,
  ...props
}: ToggleGroupPropsInternal) {
  const effectiveKeys = value !== undefined ? [value] : selectedKeys;
  return (
    <HeroGroup.Root
      className={cn("surface-card inline-flex gap-1 rounded-lg p-1", className)}
      selectionMode={selectionMode}
      disallowEmptySelection={disallowEmptySelection}
      selectedKeys={effectiveKeys}
      onSelectionChange={(keys) => {
        onSelectionChange?.(keys);
        if (onValueChange && typeof keys !== "string" && "forEach" in keys) {
          const first = Array.from(keys)[0];
          if (first !== undefined) onValueChange(String(first));
        }
      }}
      {...props}
    />
  );
}
ToggleGroupBase.displayName = "ToggleGroup";

interface ToggleButtonPropsInternal
  extends Omit<React.ComponentProps<typeof HeroToggle.Root>, "id"> {
  value?: string;
  id?: string;
}

function ToggleButtonBase({ className, value, id, ...props }: ToggleButtonPropsInternal) {
  return (
    <HeroToggle.Root
      id={value ?? id ?? ""}
      className={cn("text-xs font-medium", className)}
      {...props}
    />
  );
}
ToggleButtonBase.displayName = "ToggleButton";

export const ToggleGroup = Object.assign(ToggleGroupBase, { Root: ToggleGroupBase });
export const ToggleButton = Object.assign(ToggleButtonBase, { Root: ToggleButtonBase });

export type ToggleGroupProps = ToggleGroupPropsInternal;
export type ToggleButtonProps = ToggleButtonPropsInternal;
export default ToggleGroup;
