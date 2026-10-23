/**
 * Cross-tab sync for the bot via BroadcastChannel.
 *
 * Two tabs open on the same origin share a zustand store, but each tab has
 * its own in-memory copy. Without sync, a "New chat" in tab A leaves tab B
 * with a stale conversationId, and a message sent in B won't appear in A.
 *
 * Events are fire-and-forget; a tab that just opened and hasn't loaded
 * history yet will receive the "done" event for a message it never saw
 * sent — that's harmless (setDraftStatus on an unknown id is a no-op in
 * the store).
 */

export type BotEvent =
  | { type: "reset" }
  | { type: "send"; content: string }
  | { type: "done"; messageId: string }
  | { type: "feedback"; messageId: string; v: 1 | -1 };

const CHANNEL_NAME = "mycampus-bot-sync";

function makeChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  return new BroadcastChannel(CHANNEL_NAME);
}

let channel: BroadcastChannel | null = null;
try {
  channel = makeChannel();
} catch {
  channel = null;
}

export function broadcastBot(evt: BotEvent): void {
  channel?.postMessage({ ...evt, at: Date.now() });
}

export function subscribeBot(handler: (evt: BotEvent) => void): () => void {
  if (!channel) return () => {};
  const onMsg = (e: MessageEvent) => handler(e.data as BotEvent);
  channel.addEventListener("message", onMsg);
  return () => channel.removeEventListener("message", onMsg);
}
