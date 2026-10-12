/**
 * Task Draft store — persists in-progress task state locally via zustand
 * persist AND mirrors to /api/campus-extra/task-drafts when authenticated.
 *
 * Local-first: writes are synchronous to localStorage; the server mirror is
 * fire-and-forget so a network failure never blocks the user.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type TaskDraftType =
  | "request_draft"
  | "event_registration"
  | "approval_queue"
  | "incident"
  | "draft_announcement"
  | "search_filters";

export interface TaskDraftEntry {
  taskType: TaskDraftType;
  payload: Record<string, unknown>;
  position: number;
  updatedAt: string;
}

interface TaskDraftState {
  drafts: TaskDraftEntry[];
}

interface TaskDraftActions {
  saveDraft: (entry: TaskDraftEntry) => void;
  removeDraft: (taskType: TaskDraftType, position: number) => void;
  getDraft: (taskType: TaskDraftType, position?: number) => TaskDraftEntry | undefined;
  clearAll: () => void;
}

/**
 * Mirror a local draft to the server (fire-and-forget).
 * Called after every local write when authenticated.
 */
async function mirrorToServer(action: "save" | "delete", entry: TaskDraftEntry) {
  try {
    const raw = sessionStorage.getItem("gate-monitor-auth") ?? localStorage.getItem("gate-monitor-auth");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const token = parsed?.state?.token;
    if (!token) return;

    if (action === "save") {
      await fetch("/api/campus-extra/task-drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          taskType: entry.taskType,
          payload: entry.payload,
          position: entry.position,
        }),
      }).catch(() => {});
    }
    // Delete is handled by the server-side GC; no explicit delete call needed
  } catch {
    // Silently ignore — local state is already persisted
  }
}

export const useTaskDraftStore = create<TaskDraftState & TaskDraftActions>()(
  persist(
    (set, get) => ({
      drafts: [],

      saveDraft: (entry) => {
        set((state) => {
          const others = state.drafts.filter(
            (d) => !(d.taskType === entry.taskType && d.position === entry.position)
          );
          return { drafts: [entry, ...others] };
        });
        mirrorToServer("save", entry);
      },

      removeDraft: (taskType, position) => {
        set((state) => ({
          drafts: state.drafts.filter(
            (d) => !(d.taskType === taskType && d.position === position)
          ),
        }));
      },

      getDraft: (taskType, position = 0) =>
        get().drafts.find((d) => d.taskType === taskType && d.position === position),

      clearAll: () => set({ drafts: [] }),
    }),
    {
      name: "gate-monitor-task-drafts",
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
 * Hydrate local drafts from the server (call on mount when authenticated).
 * Merges server-side drafts that don't exist locally.
 */
export async function hydrateTaskDraftsFromServer(): Promise<void> {
  try {
    const raw = sessionStorage.getItem("gate-monitor-auth") ?? localStorage.getItem("gate-monitor-auth");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const token = parsed?.state?.token;
    if (!token) return;

    const res = await fetch("/api/campus-extra/task-drafts", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return;

    const result = await res.json();
    const serverDrafts: TaskDraftEntry[] = (result?.data?.drafts ?? []).map(
      (d: any) => ({
        taskType: d.taskType as TaskDraftType,
        payload: d.payload,
        position: d.position,
        updatedAt: d.updatedAt,
      })
    );

    const localDrafts = useTaskDraftStore.getState().drafts;
    const localKeys = new Set(localDrafts.map((d) => `${d.taskType}:${d.position}`));

    // Merge: server entries not in local
    const newEntries = serverDrafts.filter(
      (d) => !localKeys.has(`${d.taskType}:${d.position}`)
    );

    if (newEntries.length > 0) {
      useTaskDraftStore.setState({
        drafts: [...newEntries, ...localDrafts],
      });
    }
  } catch {
    // Silently ignore
  }
}
