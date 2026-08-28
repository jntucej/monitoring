import { useEffect, useState } from 'react';

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

let cachedCollege: CollegeInfo | null = null;
let collegePromise: Promise<CollegeInfo | null> | null = null;

async function loadCollegeInfo(token?: string | null): Promise<CollegeInfo | null> {
  if (cachedCollege) return cachedCollege;
  if (!collegePromise) {
    collegePromise = fetch('/api/config/college-info', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && json.data) {
          cachedCollege = json.data;
          return json.data;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        collegePromise = null;
      });
  }
  return collegePromise;
}

export function useCollegeInfo() {
  const [college, setCollege] = useState<CollegeInfo | null>(cachedCollege);
  const [loading, setLoading] = useState(!cachedCollege);

  useEffect(() => {
    if (cachedCollege) {
      setCollege(cachedCollege);
      setLoading(false);
      return;
    }
    let mounted = true;
    loadCollegeInfo().then((data) => {
      if (mounted) {
        if (data) setCollege(data);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { college, loading };
}