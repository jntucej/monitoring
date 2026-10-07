"use client";

import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Compass, CheckCircle, X } from "lucide-react";

interface Step {
  id: string;
  title: string;
  description: string;
  targetPath: string;
}

export function OnboardingTour() {
  const { token } = useAuthStore();
  const [nextStep, setNextStep] = useState<Step | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchNext = async () => {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch("/api/onboarding/next", { headers });
        const result = await res.json();
        if (result.success && result.data) {
          setNextStep(result.data);
        }
      } catch {}
    };

    fetchNext();
  }, [token]);

  const handleComplete = async () => {
    if (!nextStep) return;
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers,
        body: JSON.stringify({ step: nextStep.id }),
      });
      setNextStep(null);
    } catch {}
  };

  if (!nextStep || dismissed) return null;

  return (
    <Card className="border-cyan-500/30 bg-cyan-950/20 mb-6 relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2 text-cyan-400">
          <Compass className="h-5 w-5 animate-pulse" />
          <CardTitle className="text-sm font-semibold text-cyan-300">
            Interactive Onboarding: {nextStep.title}
          </CardTitle>
        </div>
        <button onClick={() => setDismissed(true)} className="text-[var(--text-secondary)] hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-[var(--text-secondary)]">{nextStep.description}</p>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handleComplete} className="gap-1 text-xs">
            <CheckCircle className="h-3.5 w-3.5" />
            Mark Step Completed
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)} className="text-xs">
            Skip Tour
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
