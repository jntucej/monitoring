"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

export interface PassType {
  code: string;
  name: string;
  description: string;
  defaultDurationHours: number;
  requiresApproval: boolean;
  approvalFlow: string;
}

export function usePassTypes() {
  const [passTypes, setPassTypes] = useState<PassType[]>([]);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const fetchPassTypes = async () => {
      try {
        const res = await fetch('/api/config/pass-types', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setPassTypes(json.data);
          }
        }
      } catch (err) {
        console.error('Error fetching pass types:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPassTypes();
  }, [token]);

  return { passTypes, loading };
}