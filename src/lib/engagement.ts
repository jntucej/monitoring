/**
 * Campus Engagement module — shared API client helpers.
 *
 * All helpers return typed payload shapes that mirror the /api/campus/*
 * routes. They are intentionally thin: components only import these, never
 * raw fetch responses, so the contract stays stable.
 */

import { getAuthHeaders } from "@/lib/utils";

async function campusFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const result = await res.json().catch(() => null);
  if (!res.ok || !result?.success) {
    const message = (result?.error as { message?: string } | undefined)?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return result as T;
}

/* ------------------------------------------------------------------ */
/* /api/campus/me                                                     */
/* ------------------------------------------------------------------ */

export interface MyCampusProfile {
  user: {
    id: string;
    name: string;
    role: string;
    uniqueId: string | null;
    email: string;
  };
  pendingRequests: number;
  upcomingEvents: number;
  tasksCompletedThisMonth: number;
  latestAnnouncement: {
    id: string;
    title: string;
    message: string;
    priority: string;
    updatedAt: string | null;
  } | null;
  latestAchievement: {
    code: string;
    title: string;
    icon: string | null;
    tier: string;
    earnedAt: string;
  } | null;
}

export function getMyCampusProfile(): Promise<{ success: boolean; data: MyCampusProfile }> {
  return campusFetch("/api/campus/me");
}

/* ------------------------------------------------------------------ */
/* /api/campus/feed                                                   */
/* ------------------------------------------------------------------ */

export type FeedFilter = "all" | "announcements" | "events" | "followed";

export interface FeedItem {
  kind: "announcement" | "event";
  id: string;
  title: string;
  body: string;
  priority?: string;
  category?: string;
  location?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  publisher: string;
  publisherRole?: string;
  lastUpdated: string | null;
  isOfficial: boolean;
  followed: boolean;
}

export interface FeedResponse {
  items: FeedItem[];
  followedCount: number;
}

export function getCampusFeed(filter: FeedFilter = "all"): Promise<{ success: boolean; data: FeedResponse }> {
  return campusFetch(`/api/campus/feed?filter=${encodeURIComponent(filter)}`);
}

/* ------------------------------------------------------------------ */
/* /api/campus/events                                                 */
/* ------------------------------------------------------------------ */

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  registrations: number;
  isRegistered: boolean;
  registrationStatus: "registered" | "attended" | "cancelled" | null;
}

export interface EventsResponse {
  events: CampusEvent[];
}

export function getCampusEvents(): Promise<{ success: boolean; data: EventsResponse }> {
  return campusFetch("/api/campus/events");
}

export function registerForEvent(eventId: string): Promise<{
  success: boolean;
  data: { eventId: string; status: "registered" | "already_registered"; registrations: number };
}> {
  return campusFetch(`/api/campus/events/${encodeURIComponent(eventId)}/register`, { method: "POST" });
}

/* ------------------------------------------------------------------ */
/* /api/campus/achievements                                           */
/* ------------------------------------------------------------------ */

export interface EarnedAchievement {
  code: string;
  title: string;
  description: string;
  icon: string | null;
  tier: string;
  earnedAt: string;
}

export interface AvailableAchievement {
  code: string;
  title: string;
  description: string;
  icon: string | null;
  tier: string;
  earned: boolean;
}

export interface AchievementsResponse {
  earned: EarnedAchievement[];
  available: AvailableAchievement[];
}

export function getAchievements(): Promise<{ success: boolean; data: AchievementsResponse }> {
  return campusFetch("/api/campus/achievements");
}

/* ------------------------------------------------------------------ */
/* /api/campus/goals                                                  */
/* ------------------------------------------------------------------ */

export interface PersonalGoal {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  isCompleted: boolean;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface GoalsResponse {
  goals: PersonalGoal[];
  total: number;
  completed: number;
}

export function getPersonalGoals(): Promise<{ success: boolean; data: GoalsResponse }> {
  return campusFetch("/api/campus/goals");
}

export function createPersonalGoal(body: {
  title: string;
  targetValue?: number;
  notes?: string;
}): Promise<{ success: boolean; data: { goal: PersonalGoal } }> {
  return campusFetch("/api/campus/goals", { method: "POST", body: JSON.stringify(body) });
}

export function completeGoal(goalId: string): Promise<{ success: boolean; data: { goal: PersonalGoal; progress: { total: number; completed: number } } }> {
  return campusFetch(`/api/campus/goals/${encodeURIComponent(goalId)}/complete`, { method: "POST" });
}

/* ------------------------------------------------------------------ */
/* /api/campus/recap                                                  */
/* ------------------------------------------------------------------ */

export interface SemesterRecap {
  userName: string;
  role: string;
  periodLabel: string;
  completedEvents: string[];
  earnedAchievements: { code: string; title: string; icon: string | null }[];
  completedGoals: number;
  totalGoals: number;
  eventsRegistered: number;
}

export function getSemesterRecap(): Promise<{ success: boolean; data: SemesterRecap }> {
  return campusFetch("/api/campus/recap");
}

/* ------------------------------------------------------------------ */
/* /api/campus/assistant                                              */
/* ------------------------------------------------------------------ */

export type AssistantIntent = "pending_requests" | "upcoming_events" | "announcements" | "my_goals" | "unknown";

export interface AssistantMessage {
  intent: AssistantIntent;
  text: string;
  result: Record<string, unknown> | null;
  page?: string;
}

export function askCampusAssistant(question: string): Promise<{ success: boolean; data: AssistantMessage }> {
  return campusFetch("/api/campus/assistant", { method: "POST", body: JSON.stringify({ question }) });
}
