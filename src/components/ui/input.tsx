"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, helper, error, icon, type, id, ...props }, ref) => {
    // WCAG 3.3.1: associate the error/helper text with the input via
    // aria-describedby so screen readers announce it when the field has focus.
    const uid = React.useId();
    const resolvedId = id ?? uid;
    const errorId = error ? `${uid}-error` : undefined;
    const helperId = helper && !error ? `${uid}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={resolvedId}
            className="block text-xs font-medium text-[var(--text-muted)] mb-1 uppercase"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {icon}
            </div>
          )}
          <input
            id={resolvedId}
            type={type}
            ref={ref}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={describedBy}
            className={cn(
              "w-full h-11 px-4 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:border-transparent",
              icon && "pl-10",
              error && "border-[var(--action-danger)] focus:ring-[var(--action-danger)]",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-1 text-sm text-[var(--action-danger)] flex items-center gap-1"
          >
            ⚠️{" "}
            {typeof error === "string"
              ? error
              : (error as unknown as { message?: string }).message || String(error)}
          </p>
        )}
        {helper && !error && (
          <p id={helperId} className="mt-1 text-xs text-[var(--text-muted)]">
            {helper}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
