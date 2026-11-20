/**
 * useReviews — client-side review state manager.
 * No server fetch; wire `onSave` to your API. Keeps reviews local + audit trail.
 */
"use client";

import { useCallback, useState } from "react";
import type { ReviewData } from "@/components/shared/ReviewCard";

export interface UseReviewsOptions {
  /** Initial review list (from server or local state). */
  initial?: ReviewData[];
  /** Persist a new or updated review. Called on save. */
  onSave: (review: ReviewData & { reason?: string }) => Promise<void> | void;
}

export interface UseReviewsResult {
  reviews: ReviewData[];
  addReview: (r: ReviewData & { reason?: string }) => Promise<void>;
  updateReview: (id: string, r: ReviewData & { reason?: string }) => Promise<void>;
  isBusy: boolean;
  avgRating: number | null;
}

export function useReviews({ initial, onSave }: UseReviewsOptions): UseReviewsResult {
  const [reviews, setReviews] = useState<ReviewData[]>(initial ?? []);
  const [isBusy, setIsBusy] = useState(false);

  const addReview = useCallback(
    async (r: ReviewData & { reason?: string }) => {
      setIsBusy(true);
      try {
        await onSave(r);
        setReviews((prev) => [{ ...r, createdAt: new Date().toISOString() }, ...prev]);
      } finally {
        setIsBusy(false);
      }
    },
    [onSave]
  );

  const updateReview = useCallback(
    async (id: string, r: ReviewData & { reason?: string }) => {
      setIsBusy(true);
      try {
        await onSave(r);
        setReviews((prev) =>
          prev.map((x) =>
            x.createdAt === id
              ? { ...x, ...r, editedAt: new Date().toISOString() }
              : x
          )
        );
      } finally {
        setIsBusy(false);
      }
    },
    [onSave]
  );

  const avgRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : null;

  return { reviews, addReview, updateReview, isBusy, avgRating };
}

export default useReviews;
