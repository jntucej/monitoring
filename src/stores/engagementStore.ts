/**
 * Engagement store — persists per-user dashboard customization for the
 * Campus Engagement module: widget ordering, pinned widgets, and
 * notification preferences (quiet hours + daily summary).
 *
 * This store is purely presentational: it reorders/pins which engagement
 * widgets the user sees. It never grants or removes access — every widget
 * it references still calls the same permission-checked API routes, and
 * notification toggles only prefer locally how digests are surfaced.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const ENGAGEMENT_WIDGET_IDS = [
  "profile",
  "feed",
  "events",
  "achievements",
  "goals",
  "assistant",
  "recap",
  "notifications",
] as const;

export type EngagementWidgetId = (typeof ENGAGEMENT_WIDGET_IDS)[number];

export interface EngagementNotificationPrefs {
  quietHours: boolean;
  quietHoursFrom: string; // "22:00"
  quietHoursTo: string; // "07:00"
  dailySummary: boolean;
  dailySummaryTime: string; // "08:00"
  eventReminders: boolean;
  announcementAlerts: boolean;
}

interface EngagementState {
  /** Widget order — the user's current dashboard arrangement. */
  widgetOrder: EngagementWidgetId[];
  /** Widgets the user has pinned to the top of the dashboard. */
  pinnedWidgets: EngagementWidgetId[];
  /** Notification preferences (local surfacing only — never a grant). */
  notificationPrefs: EngagementNotificationPrefs;
}

interface EngagementActions {
  setWidgetOrder: (order: EngagementWidgetId[]) => void;
  moveWidget: (widget: EngagementWidgetId, toIndex: number) => void;
  togglePin: (widget: EngagementWidgetId) => void;
  setNotificationPrefs: (prefs: Partial<EngagementNotificationPrefs>) => void;
  resetLayout: () => void;
}

export const DEFAULT_NOTIFICATION_PREFS: EngagementNotificationPrefs = {
  quietHours: false,
  quietHoursFrom: "22:00",
  quietHoursTo: "07:00",
  dailySummary: false,
  dailySummaryTime: "08:00",
  eventReminders: true,
  announcementAlerts: true,
};

const defaultWidgetOrder = (): EngagementWidgetId[] => [...ENGAGEMENT_WIDGET_IDS];

export const useEngagementStore = create<EngagementState & EngagementActions>()(
  persist(
    (set) => ({
      widgetOrder: defaultWidgetOrder(),
      pinnedWidgets: [],
      notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },

      setWidgetOrder: (order) => set({ widgetOrder: order }),

      moveWidget: (widget, toIndex) =>
        set((state) => {
          const order = [...state.widgetOrder];
          const fromIndex = order.indexOf(widget);
          if (fromIndex === -1) return state;
          order.splice(fromIndex, 1);
          order.splice(Math.max(0, Math.min(toIndex, order.length)), 0, widget);
          return { widgetOrder: order };
        }),

      togglePin: (widget) =>
        set((state) => ({
          pinnedWidgets: state.pinnedWidgets.includes(widget)
            ? state.pinnedWidgets.filter((w) => w !== widget)
            : [...state.pinnedWidgets, widget],
        })),

      setNotificationPrefs: (prefs) =>
        set((state) => ({ notificationPrefs: { ...state.notificationPrefs, ...prefs } })),

      resetLayout: () =>
        set({
          widgetOrder: defaultWidgetOrder(),
          pinnedWidgets: [],
          notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
        }),
    }),
    {
      name: "gate-monitor-engagement",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            }
      ),
    }
  )
);

/**
 * Resolve the user's effective widget order: pinned widgets first (in their
 * pinned sequence), then the remaining widgets in `widgetOrder`. Unknown ids
 * from persisted state are dropped; missing ids are appended in default
 * order so a freshly-added widget always shows up.
 *
 * Accepts just `widgetOrder` + `pinnedWidgets` (the display state) —
 * notification prefs never affect layout.
 */
export function resolveWidgetOrder(state: Pick<EngagementState, "widgetOrder" | "pinnedWidgets">): EngagementWidgetId[] {
  const known = new Set<string>(ENGAGEMENT_WIDGET_IDS);
  const order = state.widgetOrder.filter((w) => known.has(w));
  const missing = ENGAGEMENT_WIDGET_IDS.filter((w) => !order.includes(w));
  const ordered = [...order, ...missing];
  const pinned = state.pinnedWidgets.filter((w) => known.has(w) && ordered.includes(w));
  return [...pinned, ...ordered.filter((w) => !pinned.includes(w))];
}
