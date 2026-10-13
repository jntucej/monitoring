"use client";

import React, { useEffect, useState, useId } from "react";
import { cn } from "@/lib/utils";
import { useApi } from "@/hooks/useApi";
import type { WorkflowType } from "@/lib/types";

export interface ReasonSelectProps {
  workflowType: WorkflowType;
  value?: string; // reason code
  onChange: (code: string, label: string) => void;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

interface ReasonOption {
  code: string;
  label: string;
}

export function ReasonSelect({
  workflowType,
  value = "",
  onChange,
  className,
  disabled = false,
  required = false,
  placeholder = "Select a reason...",
}: ReasonSelectProps) {
  const api = useApi();
  const id = useId();
  const [standardReasons, setStandardReasons] = useState<ReasonOption[]>([]);
  const [customReasons, setCustomReasons] = useState<ReasonOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isCancelled = false;

    async function loadReasons() {
      setLoading(true);
      try {
        const headers = api.getHeaders();
        const [exitReasonsRes, customReasonsRes] = await Promise.all([
          fetch("/api/config/exit-reasons", { headers }).catch(() => null),
          fetch(`/api/config/custom-reasons?workflowType=${encodeURIComponent(workflowType)}`, {
            headers,
          }).catch(() => null),
        ]);

        if (isCancelled) return;

        let stdList: ReasonOption[] = [];
        if (exitReasonsRes && exitReasonsRes.ok) {
          const json = await exitReasonsRes.json();
          if (json.success && Array.isArray(json.data)) {
            stdList = json.data.map((r: { code: string; name?: string; label?: string }) => ({
              code: r.code,
              label: r.name || r.label || r.code,
            }));
          }
        }

        let customList: ReasonOption[] = [];
        if (customReasonsRes && customReasonsRes.ok) {
          const json = await customReasonsRes.json();
          if (json.success && Array.isArray(json.data)) {
            customList = json.data.map((r: { code: string; label?: string; name?: string }) => ({
              code: r.code,
              label: r.label || r.name || r.code,
            }));
          }
        }

        if (!isCancelled) {
          setStandardReasons(stdList);
          setCustomReasons(customList);
        }
      } catch (err) {
        console.error("[ReasonSelect] Error fetching reasons:", err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadReasons();

    return () => {
      isCancelled = true;
    };
  }, [workflowType]);

  const allReasons = [...standardReasons, ...customReasons];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCode = e.target.value;
    const found = allReasons.find((r) => r.code === selectedCode);
    const selectedLabel = found ? found.label : selectedCode;
    onChange(selectedCode, selectedLabel);
  };

  return (
    <div className="relative w-full">
      <select
        id={id}
        value={value}
        onChange={handleChange}
        disabled={disabled || loading}
        required={required}
        className={cn(
          "w-full h-11 px-3.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          className
        )}
      >
        <option value="" disabled>
          {loading ? "Loading reasons..." : placeholder}
        </option>

        {standardReasons.length > 0 && (
          <optgroup label="Standard" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold">
            {standardReasons.map((reason) => (
              <option key={`std_${reason.code}`} value={reason.code} className="font-normal text-[var(--text-primary)] py-1">
                {reason.label}
              </option>
            ))}
          </optgroup>
        )}

        {customReasons.length > 0 && (
          <optgroup label="Custom" className="bg-[var(--bg-surface)] text-[var(--text-primary)] font-semibold">
            {customReasons.map((reason) => (
              <option key={`cust_${reason.code}`} value={reason.code} className="font-normal text-[var(--text-primary)] py-1">
                {reason.label}
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </div>
  );
}

export default ReasonSelect;

