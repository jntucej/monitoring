"use client";

/**
 * HeroUI v3 Switch wrapper.
 * v3 compound: Switch.Root + Switch.Content (label + description).
 *   <Switch checked onChange={fn}>
 *     <Switch.Control /><Switch.Thumb />
 *     <Switch.Content><Switch.Title>Enable</Switch.Title><Switch.Description>…</Switch.Description></Switch.Content>
 *   </Switch>
 */
import * as React from "react";
import { Switch as HeroSwitch } from "@heroui/react";
import { cn } from "@/lib/utils";

const Switch = ({ className, ...props }: React.ComponentProps<typeof HeroSwitch.Root>) => (
  <HeroSwitch.Root className={cn("inline-flex items-center", className)} {...props} />
);
Switch.displayName = "Switch";

export const SwitchControl = HeroSwitch.Control;
export const SwitchThumb = HeroSwitch.Thumb;
export const SwitchContent = HeroSwitch.Content;
export const SwitchIcon = HeroSwitch.Icon;

export type SwitchProps = React.ComponentProps<typeof HeroSwitch.Root>;
export default Switch;
