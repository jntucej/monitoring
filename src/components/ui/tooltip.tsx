"use client";

/**
 * HeroUI v3 Tooltip — React-Aria backed, works on hover AND focus (accessible),
 * no ghost-tap issues. Replaces help-tip.tsx hover-only behavior on coarse pointers.
 *   <Tooltip><Tooltip.Trigger>…</Tooltip.Trigger><Tooltip.Content>…</Tooltip.Content></Tooltip>
 */
import * as React from "react";
import { Tooltip as HeroTooltip } from "@heroui/react";

function TooltipBase(props: React.ComponentProps<typeof HeroTooltip.Root>) {
  return <HeroTooltip.Root {...props} />;
}
TooltipBase.displayName = "Tooltip";

export const Tooltip = Object.assign(TooltipBase, {
  Root: TooltipBase,
  Trigger: HeroTooltip.Trigger,
  Content: HeroTooltip.Content,
  Arrow: HeroTooltip.Arrow,
});
export type TooltipProps = React.ComponentProps<typeof HeroTooltip.Root>;
export default Tooltip;
