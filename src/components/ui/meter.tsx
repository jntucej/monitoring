"use client";

/**
 * HeroUI v3 progress + meter wrappers (replace custom SVG gauges / GlassMeter / RadialMeter).
 *   <ProgressBar value={60} /><ProgressBar.Track /><ProgressBar.Fill />
 *   <ProgressCircle value={0.4} label="40%" /><ProgressCircle.Track />
 *   <Meter value={0.8} /><Meter.Track /><Meter.Fill />
 */
import * as React from "react";
import {
  ProgressBar as HeroProgressBar,
  ProgressCircle as HeroProgressCircle,
  Meter as HeroMeter,
} from "@heroui/react";
import { cn } from "@/lib/utils";

export const ProgressBar = ({ className, ...props }: React.ComponentProps<typeof HeroProgressBar.Root>) => (
  <HeroProgressBar.Root className={className} {...props} />
);
export const ProgressBarTrack = HeroProgressBar.Track;
export const ProgressBarFill = HeroProgressBar.Fill;
export const ProgressBarOutput = HeroProgressBar.Output;

export const ProgressCircle = ({ className, ...props }: React.ComponentProps<typeof HeroProgressCircle.Root>) => (
  <HeroProgressCircle.Root className={className} {...props} />
);
export const ProgressCircleTrack = HeroProgressCircle.Track;
export const ProgressCircleFill = HeroProgressCircle.FillCircle;

export const Meter = ({ className, ...props }: React.ComponentProps<typeof HeroMeter.Root>) => (
  <HeroMeter.Root className={className} {...props} />
);
export const MeterTrack = HeroMeter.Track;
export const MeterFill = HeroMeter.Fill;
export const MeterOutput = HeroMeter.Output;

export type ProgressBarProps = React.ComponentProps<typeof HeroProgressBar.Root>;
export type ProgressCircleProps = React.ComponentProps<typeof HeroProgressCircle.Root>;
export type MeterProps = React.ComponentProps<typeof HeroMeter.Root>;
