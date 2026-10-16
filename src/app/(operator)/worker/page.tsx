"use client";

/**
 * Worker console root page — board-only surface.
 *
 * The retention / engagement widgets (PersonalizedCampusHome, TaskContinuity,
 * ContributionPortfolio, DigitalHandover, CampusFeedbackDesk, CampusFeed,
 * AttentionQueue, ActivityTimeline, QuickActions, NotificationCenter) are
 * removed. The shell's default board fallback (digest from
 * /api/workers/my-work + MyWorkPanel + WorkerStatusBar + WorkerCommandBar)
 * handles the whole worker surface, so the root page returns null.
 */

export default function WorkerConsolePage() {
  return null;
}
