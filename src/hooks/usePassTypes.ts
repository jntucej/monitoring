"use client";

import { useEffect, useState } from 'react';
import { getAuthHeaders } from '@/lib/utils';

export interface PassType {
  code: string;
  name: string;
  description: string;
  defaultDurationHours: number;
  requiresApproval: boolean;
  approvalFlow: string;
}

export const DEFAULT_PASS_TYPES: PassType[] = [
  {
    code: "day_pass",
    name: "Day Pass",
    description: "Full day out (returns by evening curfew)",
    defaultDurationHours: 12,
    requiresApproval: true,
    approvalFlow: "warden"
  },
  {
    code: "home_out",
    name: "Home Out",
    description: "Weekend or overnight home leave",
    defaultDurationHours: 48,
    requiresApproval: true,
    approvalFlow: "warden"
  }
];

export function getPassTypeName(codeOrReason?: string): string {
  if (!codeOrReason) return "Gate Pass";
  const found = DEFAULT_PASS_TYPES.find(
    (t) => t.code.toLowerCase() === codeOrReason.toLowerCase()
  );
  if (found) return found.name;
  return codeOrReason;
}

export function usePassTypes() {
  const [passTypes, setPassTypes] = useState<PassType[]>(DEFAULT_PASS_TYPES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchPassTypes = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await fetch('/api/config/pass-types', { headers, cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (active && json.success && Array.isArray(json.data) && json.data.length > 0) {
            const filtered = json.data.filter((pt: PassType) => pt.code !== 'daily_outing');
            setPassTypes(filtered.length > 0 ? filtered : DEFAULT_PASS_TYPES);
          }
        }
      } catch (err) {
        console.error('Error fetching pass types:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchPassTypes();
    return () => { active = false; };
  }, []);

  return { passTypes, loading };
}
