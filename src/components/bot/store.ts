"use client";
import { create } from "zustand";
import type { BotLang } from "@/lib/rag/config";

export type BotRole = "user" | "assistant";

export interface Citation {
  n: number; id: string; documentId: string;
  title: string; source: string | null; score: number;
  /** The source paragraph the chunk was cut from — powers the citation
      popover so a tapped citation shows the actual passage, not just a
      title. Truncated to ~600 chars by buildPrompt. */
  excerpt?: string;
}

export interface BotMsg {
  id: string;
  dbId?: string;
  role: BotRole;
  content: string;
  citations?: Citation[];
  feedback?: -1 | 1;
  status?: "streaming" | "done" | "error";
  __retryOf?: string;
}

// localStorage keys for the small non-secret prefs the bot owns. They're
// per-browser (not per-user), which is the standard floating-assistant
// pattern: they make a hard refresh render the correct language/voice
// immediately instead of flashing English, and act as a sync-check cache
// for the server-persisted values. Never store messages or conversationId
// here — that leaks multi-user state to a shared browser.
const LS_KEY = "mycampus-bot";

function readPrefs(): { lang?: BotLang; voiceReplies?: boolean } {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    const out: { lang?: BotLang; voiceReplies?: boolean } = {};
    if (p.lang === "en" || p.lang === "te") out.lang = p.lang;
    if (typeof p.voiceReplies === "boolean") out.voiceReplies = p.voiceReplies;
    return out;
  } catch {
    return {};
  }
}

function writePrefs(lang: BotLang, voiceReplies: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ lang, voiceReplies }));
  } catch {
    /* storage may be unavailable (private mode) — degrade silently */
  }
}

/**
 * Clear the per-browser bot prefs (lang, voiceReplies) so a shared
 * workstation's next user doesn't inherit the previous user's language or
 * voice-reply choice. Called from authStore.logout() — the server-side
 * bot_lang / bot_voice_replies columns are per-user and untouched.
 */
export function clearBotPrefs() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LS_KEY);
  } catch {
    /* private mode — nothing to clear */
  }
}

const initialPrefs = typeof window !== "undefined" ? readPrefs() : {};

interface BotStore {
  open: boolean;
  lang: BotLang;
  voiceReplies: boolean;
  messages: BotMsg[];
  conversationId: string | null;
  streaming: boolean;
  error: string | null;
  voiceMode: boolean;
  // Set true the first time the user explicitly confirms voice mode
  // (or dismisses the warning). Subsequent long-presses skip the chip.
  voiceModeConfirmed: boolean;
  setVoiceModeConfirmed: (v: boolean) => void;
  // Transient: set when a long-press on an unconfirmed voice-mode asks
  // the panel to surface the one-time mic confirmation chip. Consumed
  // (and cleared) by the chip itself in BotPanel.
  voicePrompt: boolean;
  setVoicePrompt: (v: boolean) => void;
  clearVoicePrompt: () => void;
  // Set true after the profile fetch reports botLangPromptedAt === null
  // (a user who has never chosen a bot language). The panel then surfaces
  // a one-time 2-option language card. Consumed on the user's pick,
  // which calls setLang() and also flips the server column via the
  // existing profile PUT.
  langPromptPending: boolean;
  setLangPromptPending: (v: boolean) => void;
  requestVoiceMode: () => void;
  clearVoiceMode: () => void;

  setOpen: (v: boolean) => void;
  toggleOpen: () => void;
  setLang: (l: BotLang) => void;
  setVoiceReplies: (v: boolean) => void;
  setStreaming: (v: boolean) => void;
  setError: (e: string | null) => void;

  appendUser: (content: string) => string;
  appendDraft: () => string;
  upsertAssistantMessage: (id: string, content: string, citations: Citation[]) => void;
  setDraftContent: (id: string, content: string) => void;
  setDraftCitations: (id: string, c: Citation[]) => void;
  setDraftStatus: (id: string, status: BotMsg["status"]) => void;
  setFeedback: (id: string, f: -1 | 1) => void;
  setConversationId: (id: string | null) => void;
  setMessages: (msgs: BotMsg[]) => void;
  reset: () => void;
}

export const useBotStore = create<BotStore>((set) => ({
  open: false,
  lang: initialPrefs.lang ?? "en",
  voiceReplies: initialPrefs.voiceReplies ?? false,
  messages: [],
  conversationId: null,
  streaming: false,
  error: null,
  voiceMode: false,
  voiceModeConfirmed: false,
  setVoiceModeConfirmed: (v) => set({ voiceModeConfirmed: v }),
  voicePrompt: false,
  setVoicePrompt: (v) => set({ voicePrompt: v }),
  clearVoicePrompt: () => set({ voicePrompt: false }),
  langPromptPending: false,
  setLangPromptPending: (v) => set({ langPromptPending: v }),
  requestVoiceMode: () => set({ open: true, voiceMode: true, voiceReplies: true }),
  clearVoiceMode: () => set({ voiceMode: false }),

  setOpen: (v) => set({ open: v }),
  toggleOpen: () => set((s) => ({ open: !s.open })),
  setLang: (l) => {
    set({ lang: l });
    writePrefs(l, useBotStore.getState().voiceReplies);
  },
  setVoiceReplies: (v) => {
    set({ voiceReplies: v });
    writePrefs(useBotStore.getState().lang, v);
  },
  setStreaming: (v) => set({ streaming: v }),
  setError: (e) => set({ error: e }),

  appendUser: (content) => {
    const id = crypto.randomUUID();
    set((s) => ({
      messages: [...s.messages, { id, role: "user" as BotRole, content, status: "done" as const }].slice(-200),
    }));
    return id;
  },

  appendDraft: () => {
    const id = crypto.randomUUID();
    set((s) => ({
      messages: [...s.messages, { id, role: "assistant" as BotRole, content: "", status: "streaming" as const }].slice(-200),
    }));
    return id;
  },

  upsertAssistantMessage: (id, content, citations) => {
    // Insert or finalize an assistant message by id. Used by the cross-tab
    // sync path when a late-opening tab receives a "done" event for a
    // message it never saw streamed locally — we have to upsert rather
    // than assume the draft already exists in the local store.
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === id);
      if (idx === -1) {
        return {
          messages: [
            ...s.messages,
            { id, role: "assistant" as BotRole, content, citations, status: "done" as const },
          ].slice(-200),
        };
      }
      const next = s.messages.slice();
      next[idx] = { ...next[idx], content, citations, status: "done" };
      return { messages: next };
    });
  },

  setDraftContent: (id, content) => {
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === id);
      if (idx === -1) return s;
      const next = s.messages.slice();
      next[idx] = { ...next[idx], content };
      return { messages: next };
    });
  },

  setDraftCitations: (id, citations) => {
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === id);
      if (idx === -1) return s;
      const next = s.messages.slice();
      next[idx] = { ...next[idx], citations };
      return { messages: next };
    });
  },

  setDraftStatus: (id, status) => {
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === id);
      if (idx === -1) return s;
      const next = s.messages.slice();
      next[idx] = { ...next[idx], status };
      return { messages: next };
    });
  },

  setFeedback: (id, feedback) => {
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === id);
      if (idx === -1) return s;
      const next = s.messages.slice();
      next[idx] = { ...next[idx], feedback };
      return { messages: next };
    });
  },

  setConversationId: (id) => set({ conversationId: id }),
  setMessages: (msgs) => set({ messages: msgs }),
  reset: () => set({ messages: [], conversationId: null, error: null }),
}));
