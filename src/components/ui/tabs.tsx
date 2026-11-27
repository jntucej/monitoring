"use client";

/**
 * HeroUI v3 Tabs wrapper — repo-styled compound component.
 * Replace hand-rolled segmented controls / 24h|Today|7d switchers with this.
 *
 * Usage:
 *   <Tabs value={v} onValueChange={setV}>
 *     <Tabs.List>
 *       <Tabs.Tab value="24h">24h</Tabs.Tab>
 *       <Tabs.Tab value="today">Today</Tabs.Tab>
 *     </Tabs.List>
 *     <Tabs.Panel value="24h">…</Tabs.Panel>
 *   </Tabs>
 *
 * The root `<Tabs>` composes the HeroUI `TabsRoot` (a context provider that also
 * renders nothing visual). `.List` is the segmented track; `.Tab` are the
 * triggers; `.Panel` the conditional body (keep one per value).
 */
import * as React from "react";
import { Tabs as HeroTabs } from "@heroui/react";
import { cn } from "@/lib/utils";

const TabsRoot = ({ className, ...props }: React.ComponentProps<typeof HeroTabs>) => (
  <HeroTabs.Root className={className} {...props} />
);
TabsRoot.displayName = "Tabs";

const TabsList = ({ className, ...props }: React.ComponentProps<typeof HeroTabs.List>) => (
  <HeroTabs.List className={cn("surface-card flex gap-1 rounded-lg p-1", className)} {...props} />
);

const TabsTrigger = ({ className, ...props }: React.ComponentProps<typeof HeroTabs.Tab>) => (
  <HeroTabs.Tab className={cn("text-xs font-medium", className)} {...props} />
);

const TabsPanel = ({ className, ...props }: React.ComponentProps<typeof HeroTabs.Panel>) => (
  <HeroTabs.Panel className={className} {...props} />
);

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Tab: TabsTrigger,
  Panel: TabsPanel,
});

export type TabsProps = React.ComponentProps<typeof HeroTabs>;
export type TabsListProps = React.ComponentProps<typeof HeroTabs.List>;
export type TabsTriggerProps = React.ComponentProps<typeof HeroTabs.Tab>;
export type TabsPanelProps = React.ComponentProps<typeof HeroTabs.Panel>;
export default Tabs;
