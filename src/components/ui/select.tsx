"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

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
}

const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ options, value, onChange, placeholder = "Select...", error, className, disabled }, ref) => {
    const [open, setOpen] = React.useState(false);
    const selectedLabel = options.find((o) => o.value === value)?.label || placeholder;

    return (
      <div className="relative w-full">
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(!open)}
          className={cn(
            "w-full h-11 px-4 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] flex items-center justify-between transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]",
            error && "border-[var(--action-danger)] focus:ring-[var(--action-danger)]",
            disabled && "opacity-40 cursor-not-allowed",
            className
          )}
        >
          <span className={value ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}>
            {selectedLabel}
          </span>
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        </button>
        {open && (
          <div className="absolute top-12 z-20 w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md shadow-lg max-h-60 overflow-y-auto">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm hover:bg-[var(--bg-elevated)] transition-colors",
                  value === opt.value && "bg-[var(--action-primary)]/10 text-[var(--action-primary)]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        {error && <p className="mt-1 text-sm text-[var(--action-danger)]">⚠️ {error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };