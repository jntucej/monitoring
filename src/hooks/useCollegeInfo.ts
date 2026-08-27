import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

export interface CollegeInfo {
  name: string;
  shortName: string;
  address: string;
  logo: string;
  accreditation: string;
  website: string;
  principal: string;
  updatedAt?: string;
}

export function useCollegeInfo() {
  const [college, setCollege] = useState<CollegeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  useEffect(() => {
    let mounted = true;
    const fetchCollegeInfo = async () => {
      try {
        const res = await fetch('/api/config/college-info', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (mounted && json.success) {
          setCollege(json.data);
        } else if (mounted) {
          console.error('Failed to fetch college info:', json.error);
        }
      } catch (err) {
        if (mounted) console.error('Error fetching college info:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchCollegeInfo();
    return () => { mounted = false; };
  }, [token]);

  return { college, loading };
}