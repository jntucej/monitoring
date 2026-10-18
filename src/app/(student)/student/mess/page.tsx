"use client";

import { useState } from "react";
import { UtensilsCrossed, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { MealReviewPanel } from "@/components/mess/MealReviewPanel";
import { SpecialItemSelector } from "@/components/mess/SpecialItemSelector";
import { cn } from "@/lib/utils";

type Tab = "reviews" | "special";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "reviews", label: "Meal Reviews", icon: UtensilsCrossed },
  { id: "special", label: "Special Items", icon: Sparkles },
];

export default function StudentMessPage() {
  const [tab, setTab] = useState<Tab>("reviews");
  return (
    <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
      <PageHeader
        title="Mess"
        subtitle="Rate your meals and pick the special items you want."
      />
      <div className="mb-4 flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
              tab === id
                ? "bg-[var(--action-primary)] text-white"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>
      <WidgetBoundary title={tab === "reviews" ? "Meal Reviews" : "Special Items"}>
        {tab === "reviews" ? <MealReviewPanel /> : <SpecialItemSelector />}
      </WidgetBoundary>
    </div>
  );
}
