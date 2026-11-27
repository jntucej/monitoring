"use client";

import * as React from "react";
import { Select as HeroSelect, ListBox, ListBoxItem } from "@heroui/react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = "Select...",
      error,
      className,
      disabled,
      "aria-label": ariaLabel,
    },
    ref
  ) => {
    return (
      <div className="w-full">
        <HeroSelect
          aria-label={ariaLabel ?? placeholder}
          placeholder={placeholder}
          isDisabled={disabled}
          fullWidth
          value={value ?? null}
          onChange={(key) => {
            if (key !== null && key !== undefined) {
              onChange?.(String(key));
            }
          }}
        >
          <HeroSelect.Trigger
            ref={ref}
            className={cn(
              "w-full h-11 px-4 rounded-md bg-bg-surface border border-border text-text-primary flex items-center justify-between transition-colors focus:outline-none focus:ring-2 focus:ringfocus-ring",
              error && "border-action-danger focus:ring-action-danger",
              disabled && "opacity-40 cursor-not-allowed",
              className
            )}
          >
            <HeroSelect.Value />
            <HeroSelect.Indicator />
          </HeroSelect.Trigger>
          <HeroSelect.Popover className="z-50 bg-bg-surface border border-border rounded-md shadow-lg">
            <ListBox>
              {options.map((opt) => (
                <ListBoxItem key={opt.value} id={opt.value} textValue={opt.label}>
                  {opt.label}
                </ListBoxItem>
              ))}
            </ListBox>
          </HeroSelect.Popover>
        </HeroSelect>
        {error && (
          <p role="alert" className="mt-1 text-sm text-action-danger">
            {typeof error === "string" ? error : (error as { message?: string })?.message || String(error)}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
