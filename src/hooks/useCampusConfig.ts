"use client";

import { useState, useEffect } from "react";
import { ExitReasonConfig } from "@/lib/types";

export function useCampusConfig() {
  const [exitReasons, setExitReasons] = useState<ExitReasonConfig[]>([]);
  const [studentRules, setStudentRules] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConfig() {
      try {
        const [reasonsRes, rulesRes] = await Promise.all([
          fetch("/api/config/exit-reasons"),
          fetch("/api/config/student-rules")
        ]);

        if (reasonsRes.ok) {
          const reasonsJson = await reasonsRes.json();
          if (reasonsJson.success) setExitReasons(reasonsJson.data);
        }
        
        if (rulesRes.ok) {
          const rulesJson = await rulesRes.json();
          if (rulesJson.success) setStudentRules(rulesJson.data);
        }
      } catch (err) {
        console.error("Failed to load campus configs", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchConfig();
  }, []);

  return { exitReasons, studentRules, loading };
}
