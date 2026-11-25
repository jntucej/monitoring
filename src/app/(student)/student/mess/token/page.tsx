"use client";

import { useApiResource } from "@/hooks/useApiResource";
import { WidgetBoundary } from "@/components/shared/WidgetBoundary";
import { PageLoading } from "@/components/shared/LoadingStates";
import { ContextSituationBar } from "@/components/shared/ContextSituationBar";
import { UtensilsCrossed, Info } from "lucide-react";

interface Token {
  token_code?: string | null;
  meal_date: string;
  meal_type: string;
  primary_item: string;
  sub_item_labels: string[];
  expires_at: string;
  kind: string;
}
interface MyTokenResp {
  data: {
    mealTokens: Token[];
    eventTokens: Token[];
    tokens: Token[];
    eligibility: { reason: string; explanation: string | null } | null;
  };
}

const REASON_LABEL: Record<string, string> = {
  HOSTELLER_ON_LEAVE: "On approved leave",
  HOSTELLER_OPTED_OUT: "You opted out of this meal",
  DAY_SCHOLAR: "Day scholars do not receive mess tokens",
  NO_PREFERENCE: "No preference recorded for this meal",
  SUSPENDED: "Account is not active",
  GRADUATED: "No longer a student",
};

function StudentMessTokenInner() {
  const { data, error, loading, refresh } = useApiResource<MyTokenResp>("/api/mess/my-token", {
    ttlMs: 300_000,
  });
  const mealTokens = data?.data?.mealTokens ?? [];
  const eligibility = data?.data?.eligibility;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <WidgetBoundary name="StudentMessToken" title="Mess Meal Token" capability="mess.view">
          <PageLoading />
        </WidgetBoundary>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="size-5 text-action-primary" />
        <h1 className="text-lg font-semibold">Mess Meal Token</h1>
      </div>

      <ContextSituationBar
        roleLabel="Student"
        purpose="Present daily QR meal token and redemption code at dining hall counters"
        contextLabel="Daily Dining Token"
        severity={mealTokens.length > 0 ? "ok" : "info"}
        statusPill={mealTokens.length > 0 ? `${mealTokens.length} active token${mealTokens.length === 1 ? "" : "s"}` : "No active token"}
        statusSummary={
          mealTokens.length > 0
            ? `Your active meal token is ready. Present the numeric code or QR at the dining service line.`
            : "No active meal token issued for today. Review eligibility status or opt-outs."
        }
        why="Tokens verify your meal plan allocation for each dining window. Present the token at the scanner counter before meal cutoff times."
        primaryAction={{ label: "Rate Meals", href: "/student/mess/reviews" }}
        secondaryAction={{ label: "Mess Bill", href: "/student/mess-bill" }}
      />

      <WidgetBoundary name="StudentMessToken" title="Mess Meal Token" capability="mess.view">
        {error ? (
          <div className="surface-card bg-bg-surface p-4 text-sm text-text-muted">
            Token unavailable{error ? `: ${String(error)}` : ""}.
            <button type="button" onClick={() => refresh?.()} className="ml-2 text-action-primary underline">retry</button>
          </div>
        ) : mealTokens.length === 0 ? (
          <div className="surface-card bg-bg-surface p-4 space-y-2">
            {eligibility ? (
              <>
                <div className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
                  <Info className="h-4 w-4 text-action-primary" />
                  {REASON_LABEL[eligibility.reason] ?? "No token for this meal"}
                </div>
                <p className="text-xs text-text-muted">{eligibility.explanation}</p>
              </>
            ) : (
              <p className="text-sm text-text-muted">
                No mess token issued for you today. If you expected one, check your meal
                selection or contact the mess in-charge.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {mealTokens.map((t, i) => (
              <div key={t.token_code ?? i} className="surface-card bg-bg-surface p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">
                    {t.meal_type} · {new Date(t.meal_date).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
                  <span className="text-xs text-text-muted">{t.primary_item}</span>
                </div>
                {t.token_code ? (
                  <div className="font-mono text-lg tracking-widest text-action-primary">{t.token_code}</div>
                ) : (
                  <div className="text-xs text-text-muted">No code issued yet.</div>
                )}
                {t.sub_item_labels && t.sub_item_labels.length > 0 && (
                  <div className="text-xs text-text-muted">{t.sub_item_labels.join(" · ")}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </WidgetBoundary>
    </div>
  );
}

export default function StudentMessTokenPage() {
  return <StudentMessTokenInner />;
}
