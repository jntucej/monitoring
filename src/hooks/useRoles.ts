"use client";

import { useEffect, useState } from 'react';

export interface RoleConfig {
  code: string;
  display_name: string;
  description: string;
  icon_name: string;
  default_redirect: string;
}

export function useRoles() {
  const [roles, setRoles] = useState<RoleConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch('/api/config/roles');
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setRoles(json.data);
          }
        }
      } catch (err) {
        console.error('Error fetching roles:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  return { roles, loading };
}