"use client";

import { useEffect, useState } from 'react';
import { getAuthHeaders } from '@/lib/utils';
import {
  PASS_TYPE_SEED,
  passTypesForPersona,
  type PassTypeConfig,
  type Persona,
} from '@/lib/pass-types';
import { usePersona } from '@/hooks/usePersona';

// ── Legacy PassType (kept for backward compat — existing callers still use
//    `usePassTypes().passTypes` which returns the legacy shape). The new
//    config-driven API below is the preferred path for all new code. ─────

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
    approvalFlow: "principal"
  },
  {
    code: "home_out",
    name: "Home Out",
    description: "Weekend or overnight home leave",
    defaultDurationHours: 48,
    requiresApproval: true,
    approvalFlow: "principal"
  }
];

export function getPassTypeName(codeOrReason?: string): string {
  if (!codeOrReason) return "Gate Pass";
  // Check legacy defaults first
  const legacy = DEFAULT_PASS_TYPES.find(
    (t) => t.code.toLowerCase() === codeOrReason.toLowerCase()
  );
  if (legacy) return legacy.name;
  // Then check config seed
  const config = PASS_TYPE_SEED.find(
    (t) => t.code.toLowerCase() === codeOrReason.toLowerCase()
  );
  if (config) return config.label;
  return codeOrReason;
}

// ── Legacy hook (unchanged behaviour) ─────────────────────────────────────

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

// ── New config-driven hook (persona-scoped, reads PassTypeConfig) ─────────

export interface UsePassTypesConfig {
  /** Restrict to a specific persona. Defaults to the current user's persona. */
  persona?: Persona;
  /** Only active types. Default true. */
  onlyActive?: boolean;
  /**
   * When true, filters out types that require parent consent
   * (used by the direct-generate / staff-on-behalf flow).
   */
  staffOnBehalf?: boolean;
}

/**
 * usePassTypesV2 — persona-scoped PassTypeConfig list.
 *
 * Reads from the in-memory seed by default. When `/api/pass-types`
 * becomes available (Phase 2) the seed is replaced by a live fetch.
 *
 * @example
 * const { configs, loading } = usePassTypesV2();
 * // or staff-on-behalf (no parent-consent types):
 * const { configs } = usePassTypesV2({ staffOnBehalf: true });
 */
export function usePassTypesV2(opts: UsePassTypesConfig = {}) {
  const persona = opts.persona ?? usePersona();
  const [configs, setConfigs] = useState<PassTypeConfig[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    let list = passTypesForPersona(persona, opts.onlyActive ?? true);
    if (opts.staffOnBehalf) {
      list = list.filter((c) => !c.requiresParentConsent);
    }
    setConfigs(list);
    setLoading(false);
  }, [persona, opts.onlyActive, opts.staffOnBehalf]);

  return { configs, loading };
}
