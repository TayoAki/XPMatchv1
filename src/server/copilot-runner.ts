import { AsyncLocalStorage } from "node:async_hooks";
import { InMemoryAgentRunner } from "@copilotkit/runtime/v2";
import type { AgentRunnerConnectRequest, AgentRunnerRunRequest } from "@copilotkit/runtime/v2";
import { EventType, type BaseEvent, type Message } from "@ag-ui/client";
import { Observable } from "rxjs";
import { loadTranscript, saveTranscript } from "./models";

/**
 * The signed-in user for the CopilotKit request being handled. The runtime's
 * handlers call the runner synchronously inside the request, so the runner can
 * read it without the runtime knowing anything about our sessions.
 */
const requestUser = new AsyncLocalStorage<{ userId: string }>();

export function withCopilotUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  return requestUser.run({ userId }, fn);
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

/**
 * In-memory runner (fast, streams live runs) that also keeps every thread's
 * transcript in Postgres: written when a run finalizes, read back when a chat is
 * reopened after a deploy, restart or eviction.
 */
export class PersistentAgentRunner extends InMemoryAgentRunner {
  run(request: AgentRunnerRunRequest): Observable<BaseEvent> {
    const userId = requestUser.getStore()?.userId;
    const events = super.run(request);
    if (userId) {
      // Side subscription: the run finalizes (and snapshots its messages) before the stream completes,
      // whether or not the browser is still listening.
      const persist = () => {
        const messages = this.getThreadMessages(request.threadId);
        if (messages.length === 0) return;
        saveTranscript(userId, request.threadId, messages).catch((err) => console.error("XPMatch: saving the transcript failed", err));
      };
      events.subscribe({ complete: persist, error: persist });
    }
    return events;
  }

  connect(request: AgentRunnerConnectRequest): Observable<BaseEvent> {
    const userId = requestUser.getStore()?.userId;
    const inMemory = this.getThreadMessages(request.threadId);
    if (inMemory.length > 0) {
      // The live path (replays this process's events, attaches to a run in flight).
      return super.connect(request);
    }
    return new Observable<BaseEvent>((subscriber) => {
      let cancelled = false;
      const restore = async () => {
        const stored = userId ? await loadTranscript(userId, request.threadId) : [];
        if (cancelled) return;
        if (stored.length > 0) {
          subscriber.next({ type: EventType.MESSAGES_SNAPSHOT, messages: settlePendingToolCalls(stored) } as BaseEvent);
        }
        subscriber.complete();
      };
      restore().catch((err) => {
        console.error("XPMatch: restoring the transcript failed", err);
        if (!cancelled) subscriber.complete();
      });
      return () => {
        cancelled = true;
      };
    });
  }
}
