// src/lib/analytics-flags.ts
// Gating flag for synthetic mock analytics data.
// In production, mock data is strictly disabled unless explicitly enabled via environment flag.

export const MOCK_ANALYTICS: boolean =
  process.env.ENABLE_MOCK_ANALYTICS === "true" ||
  process.env.NEXT_PUBLIC_MOCK_ANALYTICS === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.ENABLE_MOCK_ANALYTICS !== "false");
