/**
 * Campus Retention module — shared API client helpers.
 *
 * All helpers return typed payload shapes that mirror the /api/campus-extra/*
 * routes. They are intentionally thin: components only import these, never
 * raw fetch responses, so the contract stays stable.
 */

import { getAuthHeaders } from "@/lib/utils";

async function campusExtraFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const result = await res.json().catch(() => null);
  if (!res.ok || !result?.success) {
    const message =
      (result?.error as { message?: string } | undefined)?.message ??
      `Request failed (${res.status})`;
    throw new Error(message);
  }
  return result as T;
}

/* ------------------------------------------------------------------ */
/* /api/campus-extra/calendar                                        */
/* ------------------------------------------------------------------ */

export interface CalendarEvent {
  id: string;
  category: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  owner?: string;
  followable: boolean;
  reminderOptin?: boolean;
}

export interface CalendarCategories {
  id: string;
  code: string;
  label: string;
  color: string;
  icon: string | null;
}

export interface CalendarResponse {
  events: CalendarEvent[];
  categories: CalendarCategories[];
  followedCategories: string[];
}

export function getUnifiedCalendar(
  month?: string,
  followedCategories?: string[]
): Promise<{ success: boolean; data: CalendarResponse }> {
  const params = new URLSearchParams();
  if (month) params.set("month", month);
  if (followedCategories?.length) params.set("categories", followedCategories.join(","));
  const qs = params.toString() ? `?${params}` : "";
  return campusExtraFetch(`/api/campus-extra/calendar${qs}`);
}

export interface FollowCategoryResponse {
  success: boolean;
  data: { category: string; followed: boolean };
}

export function toggleCalendarFollow(
  category: string,
  reminderOptin: boolean = false
): Promise<{ success: boolean; data: FollowCategoryResponse }> {
  return campusExtraFetch(`/api/campus-extra/calendar?follow=${encodeURIComponent(category)}&reminder=${reminderOptin}`, {
    method: "POST",
  });
}

/* ------------------------------------------------------------------ */
/* /api/campus-extra/knowledge                                         */
/* ------------------------------------------------------------------ */

export interface KnowledgeDoc {
  id: string;
  category: string;
  title: string;
  body: string;
  ownerRole: string;
  updatedAt: string;
  version: number;
}

export interface KnowledgeResponse {
  docs: KnowledgeDoc[];
  categories: string[];
}

export function getKnowledgeCentre(
  category?: string,
  search?: string
): Promise<{ success: boolean; data: KnowledgeResponse }> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (search) params.set("search", search);
  const qs = params.toString() ? `?${params}` : "";
  return campusExtraFetch(`/api/campus-extra/knowledge${qs}`);
}

export function reportOutdatedDoc(docId: string, reason: string): Promise<{ success: boolean }> {
  return campusExtraFetch(`/api/campus-extra/knowledge?doc_id=${encodeURIComponent(docId)}&reason=${encodeURIComponent(reason)}`, {
    method: "POST",
  });
}

/* ------------------------------------------------------------------ */
/* /api/campus-extra/feedback                                          */
/* ------------------------------------------------------------------ */

export interface FeedbackReport {
  id: string;
  status: "submitted" | "acknowledged" | "assigned" | "in_progress" | "resolved" | "feedback";
  category: string;
  subject: string;
  description: string;
  assignedTo: string | null;
  notes: string | null;
  reviewerNote: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface FeedbackResponse {
  reports: FeedbackReport[];
}

export function getFeedbackReports(status?: string): Promise<{ success: boolean; data: FeedbackResponse }> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return campusExtraFetch(`/api/campus-extra/feedback${qs}`);
}

export function submitFeedbackReport(
  body: {
    category: string;
    subject: string;
    description: string;
  }
): Promise<{ success: boolean; data: FeedbackReport }> {
  return campusExtraFetch(`/api/campus-extra/feedback`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* ------------------------------------------------------------------ */
/* /api/campus-extra/task-drafts                                       */
/* ------------------------------------------------------------------ */

export interface TaskDraft {
  id: string;
  taskType: string;
  payload: Record<string, unknown>;
  position: number;
  updatedAt: string;
}

export interface TaskDraftsResponse {
  drafts: TaskDraft[];
}

export function getTaskDrafts(): Promise<{ success: boolean; data: TaskDraftsResponse }> {
  return campusExtraFetch(`/api/campus-extra/task-drafts`);
}

export function saveTaskDraft(
  taskType: string,
  payload: Record<string, unknown>,
  position: number = 0
): Promise<{ success: boolean; data: TaskDraft }> {
  return campusExtraFetch(`/api/campus-extra/task-drafts`, {
    method: "POST",
    body: JSON.stringify({ taskType, payload, position }),
  });
}

export function deleteTaskDraft(draftId: string): Promise<{ success: boolean }> {
  return campusExtraFetch(`/api/campus-extra/task-drafts?draft_id=${encodeURIComponent(draftId)}`, {
    method: "DELETE",
  });
}

/* ------------------------------------------------------------------ */
/* /api/campus-extra/analytics                                         */
/* ------------------------------------------------------------------ */

export interface AnalyticsMetric {
  key: string;
  label: string;
  value: number;
  unit?: string;
}

export interface AnalyticsResponse {
  metrics: AnalyticsMetric[];
  seriesData: { date: string; [key: string]: string | number }[];
  role: string;
}

export function getRoleAnalytics(
  dateRange?: string,
  department?: string,
  hostel?: string,
  gate?: string
): Promise<{ success: boolean; data: AnalyticsResponse }> {
  const params = new URLSearchParams();
  if (dateRange) params.set("date_range", dateRange);
  if (department) params.set("department", department);
  if (hostel) params.set("hostel", hostel);
  if (gate) params.set("gate", gate);
  const qs = params.toString() ? `?${params}` : "";
  return campusExtraFetch(`/api/campus-extra/analytics${qs}`);
}

/* ------------------------------------------------------------------ */
/* /api/campus-extra/handover                                          */
/* ------------------------------------------------------------------ */

export interface HandoverItem {
  type: string;
  title: string;
  details?: string;
  severity?: "low" | "medium" | "high";
}

export interface HandoverRecord {
  id: string;
  byUserName: string;
  byUserRole: string;
  toRole: string;
  items: HandoverItem[];
  notes: string | null;
  createdAt: string;
}

export interface HandoverResponse {
  handovers: HandoverRecord[];
}

export function getShiftHandovers(toRole?: string): Promise<{ success: boolean; data: HandoverResponse }> {
  const qs = toRole ? `?to_role=${encodeURIComponent(toRole)}` : "";
  return campusExtraFetch(`/api/campus-extra/handover${qs}`);
}

export function createShiftHandover(
  body: { toRole: string; items: HandoverItem[]; notes?: string }
): Promise<{ success: boolean; data: HandoverRecord }> {
  return campusExtraFetch(`/api/campus-extra/handover`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/* ------------------------------------------------------------------ */
/* /api/campus-extra/portfolio                                         */
/* ------------------------------------------------------------------ */

export interface PortfolioItem {
  id: string;
  title: string;
  type: string;
  date: string;
  details?: string;
  verified: boolean;
}

export interface PortfolioResponse {
  items: PortfolioItem[];
}

export function getContributionPortfolio(): Promise<{ success: boolean; data: PortfolioResponse }> {
  return campusExtraFetch(`/api/campus-extra/portfolio`);
}
