"use client";
import { create } from "zustand";
import type { BotLang } from "@/lib/rag/config";

export type BotRole = "user" | "assistant";

export interface Citation {
  n: number; id: string; documentId: string;
  title: string; source: string | null; score: number;
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
