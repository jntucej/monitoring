"use client";

import * as React from "react";
import { Button as HeroButton } from "@heroui/react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useIsSakuga } from "@/components/student/useIsSakuga";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ringfocus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-action-primary text-white shadow-sm hover:brightness-110",
        secondary: "bg-bg-surface text-text-primary border border-border hover:bg-bg-elevated",
        danger: "bg-action-danger text-white shadow-sm hover:brightness-110",
        ghost: "hover:bg-bg-surface text-text-secondary",
        icon: "size-6 p-0 text-text-secondary hover:bg-bg-surface",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-11 px-4",
        lg: "h-16 px-6 text-lg",
        xl: "h-16 px-8 text-lg rounded-lg",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  isPending?: boolean;
  isDisabled?: boolean;
  onPress?: () => void;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      isPending,
      isDisabled,
      children,
      disabled,
      onClick,
      onPress,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isSakuga = useIsSakuga();
    const pending = Boolean(loading || isPending);
    const finalDisabled = Boolean(disabled || isDisabled || pending);

    if (isSakuga && variant !== "icon" && variant !== "ghost") {
      return (
        <sakuga-button
          variant={variant === "secondary" ? "secondary" : "primary"}
          disabled={finalDisabled}
          onClick={onClick}
          type={type}
          className={className}
        >
          {children}
        </sakuga-button>
      );
    }

    const heroVariant =
      variant === "danger"
        ? "danger"
        : variant === "secondary"
        ? "secondary"
        : variant === "ghost" || variant === "icon"
        ? "ghost"
        : "primary";

    return (
      <HeroButton
        ref={ref}
        type={type}
        variant={heroVariant}
        isDisabled={finalDisabled}
        isPending={pending}
        isIconOnly={variant === "icon"}
        onPress={(e) => {
          onPress?.();
          onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
        }}
        className={cn(buttonVariants({ variant, size, className }))}
        {...(props as Record<string, unknown>)}
      >
        {pending && (
          <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </HeroButton>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
