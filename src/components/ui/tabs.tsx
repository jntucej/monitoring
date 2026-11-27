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

export interface TabsRootProps
  extends Omit<React.ComponentProps<typeof HeroTabs>, "selectedKey" | "onSelectionChange"> {
  value?: string;
  onValueChange?: (value: string) => void;
  selectedKey?: React.ComponentProps<typeof HeroTabs>["selectedKey"];
  onSelectionChange?: React.ComponentProps<typeof HeroTabs>["onSelectionChange"];
}

const TabsRoot = ({ className, value, onValueChange, selectedKey, onSelectionChange, ...props }: TabsRootProps) => (
  <HeroTabs.Root
    className={className}
    selectedKey={value ?? selectedKey}
    onSelectionChange={(key) => {
      onSelectionChange?.(key);
      if (onValueChange && typeof key === "string") onValueChange(key);
    }}
    {...props}
  />
);
TabsRoot.displayName = "Tabs";

const TabsList = ({ className, ...props }: React.ComponentProps<typeof HeroTabs.List>) => (
  <HeroTabs.List className={cn("surface-card flex gap-1 rounded-lg p-1", className)} {...props} />
);

interface TabsTriggerProps
  extends Omit<React.ComponentProps<typeof HeroTabs.Tab>, "id"> {
  value?: string;
  id?: string;
}

const TabsTrigger = ({ className, value, id, ...props }: TabsTriggerProps) => (
  <HeroTabs.Tab id={value ?? id ?? ""} className={cn("text-xs font-medium", className)} {...props} />
);

interface TabsPanelProps
  extends Omit<React.ComponentProps<typeof HeroTabs.Panel>, "id"> {
  value?: string;
  id?: string;
}

const TabsPanel = ({ className, value, id, ...props }: TabsPanelProps) => (
  <HeroTabs.Panel id={value ?? id ?? ""} className={className} {...props} />
);

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Tab: TabsTrigger,
  Panel: TabsPanel,
});

export type TabsProps = TabsRootProps;
export type TabsListProps = React.ComponentProps<typeof HeroTabs.List>;
export type { TabsTriggerProps, TabsPanelProps };
export default Tabs;
