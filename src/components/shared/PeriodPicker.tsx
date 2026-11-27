/**
 * PeriodPicker — segmented control + optional custom date-range input.
 * Controlled component; lift state to the parent via `usePeriod`.
 */
"use client";

import React, { useCallback, useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleButton } from "@/components/ui/toggle";
import { PERIOD_OPTIONS, getPeriod, type Period, type PeriodKey } from "@/lib/period";

export interface PeriodPickerProps {
  value: Period;
  onChange: (period: Period) => void;
  className?: string;
  /** Show custom date inputs when key === "custom". Default true. */
  allowCustom?: boolean;
}

export function PeriodPicker({ value, onChange, className, allowCustom = true }: PeriodPickerProps) {
  const [open, setOpen] = useState(false);

  const select = useCallback(
    (key: PeriodKey) => {
      if (key === "custom") {
        onChange({ key, from: value.from, to: value.to, label: "Custom" });
        setOpen(false);
        return;
      }
      onChange(getPeriod(key));
      setOpen(false);
    },
    [onChange, value]
  );

  const customFrom = value.key === "custom" ? value.from.slice(0, 10) : "";
  const customTo = value.key === "custom" ? value.to.slice(0, 10) : "";

  const handleCustomFrom = (v: string) => {
    if (!v) return;
    onChange({ key: "custom", from: new Date(v + "T00:00:00").toISOString(), to: value.to, label: "Custom" });
  };
  const handleCustomTo = (v: string) => {
    if (!v) return;
    onChange({ key: "custom", from: value.from, to: new Date(v + "T23:59:59.999Z").toISOString(), label: "Custom" });
  };

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {/* Segmented buttons for common periods */}
      <ToggleGroup
        value={value.key}
        onValueChange={(val) => {
          if (val) select(val as PeriodKey);
        }}
        className="p-0.5 gap-0.5"
      >
        {PERIOD_OPTIONS.map(({ key, label }) => (
          <ToggleButton
            key={key}
            value={key}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              value.key === key
                ? "bg-action-primary text-white"
                : "text-text-secondary hover:bg-bg-elevated"
            )}
          >
            {label}
          </ToggleButton>
        ))}
      </ToggleGroup>

      {/* Custom date inputs */}
      {allowCustom && value.key === "custom" && (
        <div className="inline-flex items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => handleCustomFrom(e.target.value)}
            className="surface-card rounded-md px-2 py-1 text-xs bg-bg-elevated w-[8.5rem]"
            aria-label="From date"
          />
          <span className="text-xs text-text-muted">–</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => handleCustomTo(e.target.value)}
            className="surface-card rounded-md px-2 py-1 text-xs bg-bg-elevated w-[8.5rem]"
            aria-label="To date"
          />
        </div>
      )}
    </div>
  );
}

export default PeriodPicker;
