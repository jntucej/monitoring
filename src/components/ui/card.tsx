"use client";

import * as React from "react";
import { Card as HeroCard } from "@heroui/react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <HeroCard
    ref={ref}
    className={cn(
      "rounded-[var(--radius-lg)] bg-bg-surface border border-border p-6 shadow-sm",
      className
    )}
    {...(props as Record<string, unknown>)}
  >
    {children}
  </HeroCard>
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <HeroCard.Header
    ref={ref}
    className={cn("flex flex-col space-y-2 mb-4 p-0", className)}
    {...(props as Record<string, unknown>)}
  />
));
CardHeader.displayName = "CardHeader";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <HeroCard.Content
    ref={ref}
    className={cn("space-y-3 p-0", className)}
    {...(props as Record<string, unknown>)}
  />
));
CardContent.displayName = "CardContent";

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <HeroCard.Title
    ref={ref}
    className={cn("text-lg font-semibold text-text-primary tracking-tight", className)}
    {...(props as Record<string, unknown>)}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <HeroCard.Description
    ref={ref}
    className={cn("text-xs text-text-secondary", className)}
    {...(props as Record<string, unknown>)}
  />
));
CardDescription.displayName = "CardDescription";

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
