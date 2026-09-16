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

/**
 * A transcript can end with a human-in-the-loop tool call the traveler never
 * answered (a trip proposal, a "remember this?" card). Reopening it must not
 * leave the model with a dangling tool call, so those get a neutral result.
 */
export function settlePendingToolCalls(messages: unknown[]): Message[] {
  const list = messages as MessageLike[];
  const answered = new Set(list.filter((m) => m.role === "tool" && m.toolCallId).map((m) => m.toolCallId as string));
  const out: MessageLike[] = [];
  for (const message of list) {
    out.push(message);
    if (message.role !== "assistant" || !message.toolCalls?.length) continue;
    for (const call of message.toolCalls) {
      if (answered.has(call.id)) continue;
      answered.add(call.id);
      out.push({
        id: `settled-${call.id}`,
        role: "tool",
        toolCallId: call.id,
        content: JSON.stringify({ created: false, saved: false, note: "The chat was reopened before the traveler responded; do not act on this." }),
      } as MessageLike);
    }
  }
  return out as Message[];
}
