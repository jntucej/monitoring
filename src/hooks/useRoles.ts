"use client";

import { useEffect, useState } from 'react';

export interface RoleConfig {
  code: string;
  display_name: string;
  description: string;
  icon_name: string;
  default_redirect: string;
}

let cachedRoles: RoleConfig[] | null = null;
let rolesPromise: Promise<RoleConfig[]> | null = null;

async function loadRoles(): Promise<RoleConfig[]> {
  if (cachedRoles) return cachedRoles;
  if (!rolesPromise) {
    rolesPromise = fetch('/api/config/roles')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) {
          cachedRoles = json.data;
          return json.data;
        }
        return [];
      })
      .catch(() => [])
      .finally(() => {
        rolesPromise = null;
      });
  }
  return rolesPromise;
}

export function useRoles() {
  const [roles, setRoles] = useState<RoleConfig[]>(cachedRoles || []);
  const [loading, setLoading] = useState(!cachedRoles);

  useEffect(() => {
    if (cachedRoles) {
      setRoles(cachedRoles);
      setLoading(false);
      return;
    }
    let cancelled = false;
    loadRoles().then((data) => {
      if (!cancelled) {
        setRoles(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { roles, loading };
}