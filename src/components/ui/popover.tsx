"use client";

/**
 * HeroUI v3 Popover — portal-rendered, auto viewport-collision flipping, tap/click
 * triggers on mobile. Replaces HoverPreview / analytics surface & filter dropdowns
 * with a reliably-openable popover.
 *   <Popover>
 *     <Popover.Trigger><Button>Filters</Button></Popover.Trigger>
 *     <Popover.Dialog><Popover.Content>…</Popover.Content></Popover.Dialog>
 *   </Popover>
 */
import * as React from "react";
import { Popover as HeroPopover } from "@heroui/react";

function PopoverBase({ ...props }: React.ComponentProps<typeof HeroPopover.Root>) {
  return <HeroPopover.Root {...props} />;
}
PopoverBase.displayName = "Popover";

export const Popover = Object.assign(PopoverBase, {
  Root: PopoverBase,
  Trigger: HeroPopover.Trigger,
  Dialog: HeroPopover.Dialog,
  Content: HeroPopover.Content,
  Heading: HeroPopover.Heading,
  Arrow: HeroPopover.Arrow,
});
export type PopoverProps = React.ComponentProps<typeof HeroPopover.Root>;
export default Popover;
