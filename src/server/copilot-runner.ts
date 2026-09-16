import { AsyncLocalStorage } from "node:async_hooks";
import { InMemoryAgentRunner } from "@copilotkit/runtime/v2";
import type { AgentRunnerConnectRequest, AgentRunnerRunRequest } from "@copilotkit/runtime/v2";
import { EventType, type BaseEvent } from "@ag-ui/client";
import { Observable } from "rxjs";
import { loadTranscript, saveTranscript } from "./models";
import { settlePendingToolCalls } from "./transcripts";

/**
 * The signed-in user for the CopilotKit request being handled. The runtime's
 * handlers call the runner synchronously inside the request, so the runner can
 * read it without the runtime knowing anything about our sessions.
 */
const requestUser = new AsyncLocalStorage<{ userId: string }>();

export function withCopilotUser<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  return requestUser.run({ userId }, fn);
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
