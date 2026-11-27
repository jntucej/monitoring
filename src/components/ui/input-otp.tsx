"use client";

/**
 * HeroUI v3 InputOTP wrapper — repo-styled compound component.
 * Replace hand-rolled per-digit OTP/PIN inputs with this.
 *
 * Usage:
 *   <InputOTP maxLength={6} value={value} onChange={setValue} onComplete={handleComplete}>
 *     <InputOTP.Group>
 *       <InputOTP.Slot index={0} />
 *       <InputOTP.Slot index={1} />
 *       ...
 *     </InputOTP.Group>
 *   </InputOTP>
 */
import * as React from "react";
import {
  InputOTP as HeroInputOTP,
  InputOTPRoot as HeroInputOTPRoot,
  InputOTPGroup as HeroInputOTPGroup,
  InputOTPSlot as HeroInputOTPSlot,
  InputOTPSeparator as HeroInputOTPSeparator,
} from "@heroui/react";
import { cn } from "@/lib/utils";

const InputOTPRootComponent = ({
  className,
  ...props
}: React.ComponentProps<typeof HeroInputOTPRoot>) => (
  <HeroInputOTPRoot className={cn("flex items-center gap-2", className)} {...props} />
);
InputOTPRootComponent.displayName = "InputOTP";

const InputOTPGroupComponent = ({
  className,
  ...props
}: React.ComponentProps<typeof HeroInputOTPGroup>) => (
  <HeroInputOTPGroup className={cn("flex items-center gap-1.5", className)} {...props} />
);
InputOTPGroupComponent.displayName = "InputOTP.Group";

const InputOTPSlotComponent = ({
  className,
  ...props
}: React.ComponentProps<typeof HeroInputOTPSlot>) => (
  <HeroInputOTPSlot className={cn("", className)} {...props} />
);
InputOTPSlotComponent.displayName = "InputOTP.Slot";

const InputOTPSeparatorComponent = ({
  className,
  ...props
}: React.ComponentProps<typeof HeroInputOTPSeparator>) => (
  <HeroInputOTPSeparator className={cn("text-text-muted px-1", className)} {...props} />
);
InputOTPSeparatorComponent.displayName = "InputOTP.Separator";

export const InputOTP = Object.assign(InputOTPRootComponent, {
  Root: InputOTPRootComponent,
  Group: InputOTPGroupComponent,
  Slot: InputOTPSlotComponent,
  Separator: InputOTPSeparatorComponent,
});

export type InputOTPProps = React.ComponentProps<typeof HeroInputOTP>;
export type InputOTPGroupProps = React.ComponentProps<typeof HeroInputOTPGroup>;
export type InputOTPSlotProps = React.ComponentProps<typeof HeroInputOTPSlot>;
export type InputOTPSeparatorProps = React.ComponentProps<typeof HeroInputOTPSeparator>;
export default InputOTP;
