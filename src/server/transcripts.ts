import type { Message } from "@ag-ui/client";

/**
 * Pure helpers for stored chat transcripts (no database, no runtime imports so
 * they unit-test in isolation).
 */

/** Rough ceiling for one stored transcript (Postgres jsonb is fine with this; the model context is not). */
export const TRANSCRIPT_MAX_BYTES = 1_500_000;
export const TRANSCRIPT_MAX_MESSAGES = 400;

export interface TranscriptMessage {
  id?: string;
  role?: string;
}

/**
 * Keeps the newest messages under the size cap, always cutting at a user turn so
 * an assistant tool call is never separated from its result.
 */
export function trimTranscript<T extends TranscriptMessage>(messages: T[]): T[] {
  let list = messages;
  const cutAtNextUserTurn = (from: number) => {
    const next = list.findIndex((m, i) => i > from && m.role === "user");
    return next === -1 ? list.length : next;
  };
  if (list.length > TRANSCRIPT_MAX_MESSAGES) list = list.slice(cutAtNextUserTurn(list.length - TRANSCRIPT_MAX_MESSAGES - 1));
  let guard = 0;
  while (list.length > 1 && JSON.stringify(list).length > TRANSCRIPT_MAX_BYTES && guard++ < 50) {
    list = list.slice(cutAtNextUserTurn(0));
  }
  return list;
}

interface ToolCallLike {
  id: string;
}

interface MessageLike {
  id?: string;
  role?: string;
  toolCalls?: ToolCallLike[];
  toolCallId?: string;
}

const REOPENED_NOTE = "The chat was reopened before the traveler responded; do not act on this.";

/** For a run whose history has a tool call that never got its result. */
export const INTERRUPTED_NOTE =
  "No result: the traveler moved on before this finished (a new message, another chat, or they left the page). Do not act on this call; answer the latest message.";

/**
 * A transcript can end with a human-in-the-loop tool call the traveler never
 * answered (a trip proposal, a "remember this?" card), or with a tool call whose
 * answer was cut off (the traveler opened another chat mid-answer). Reopening or
 * continuing it must not leave the model with a dangling tool call, so those get
 * a neutral result. Returns the same array when nothing was dangling.
 */
export function settlePendingToolCalls(messages: unknown[], note: string = REOPENED_NOTE): Message[] {
  const list = messages as MessageLike[];
  const answered = new Set(list.filter((m) => m.role === "tool" && m.toolCallId).map((m) => m.toolCallId as string));
  const out: MessageLike[] = [];
  let settled = false;
  for (const message of list) {
    out.push(message);
    if (message.role !== "assistant" || !message.toolCalls?.length) continue;
    for (const call of message.toolCalls) {
      if (answered.has(call.id)) continue;
      answered.add(call.id);
      settled = true;
      out.push({
        id: `settled-${call.id}`,
        role: "tool",
        toolCallId: call.id,
        content: JSON.stringify({ created: false, saved: false, note }),
      } as MessageLike);
    }
  }
  return (settled ? out : list) as Message[];
}

/**
 * The model call needs every tool call answered right after the message that made
 * it. A run's history can break that three ways: a call without a result (the
 * traveler opened another chat mid-answer, or wrote instead of answering a card), a
 * result that came later (a card answered after the traveler had written something
 * else), or a result without its call (a tool that finished after the traveler had
 * opened another chat). Each call gets its first result placed right after it, or a
 * neutral one; results without a call are dropped. Returns the same array when the
 * history is already in order.
 */
export function repairToolHistory(messages: unknown[], note: string = INTERRUPTED_NOTE): Message[] {
  const list = messages as MessageLike[];
  const calls = new Set<string>();
  for (const m of list) if (m.role === "assistant") for (const call of m.toolCalls ?? []) calls.add(call.id);
  const results = new Map<string, MessageLike>();
  for (const m of list) {
    if (m.role === "tool" && m.toolCallId && calls.has(m.toolCallId) && !results.has(m.toolCallId)) results.set(m.toolCallId, m);
  }
  const out: MessageLike[] = [];
  const placed = new Set<string>();
  for (const message of list) {
    if (message.role === "tool") continue;
    out.push(message);
    if (message.role !== "assistant" || !message.toolCalls?.length) continue;
    for (const call of message.toolCalls) {
      if (placed.has(call.id)) continue;
      placed.add(call.id);
      out.push(
        results.get(call.id) ??
          ({ id: `settled-${call.id}`, role: "tool", toolCallId: call.id, content: JSON.stringify({ created: false, saved: false, note }) } as MessageLike),
      );
    }
  }
  const unchanged = out.length === list.length && out.every((m, i) => m === list[i]);
  return (unchanged ? list : out) as Message[];
}
