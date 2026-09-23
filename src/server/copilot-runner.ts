import { AsyncLocalStorage } from "node:async_hooks";
import { InMemoryAgentRunner } from "@copilotkit/runtime/v2";
import type { AgentRunnerConnectRequest, AgentRunnerRunRequest, AgentRunnerStopRequest } from "@copilotkit/runtime/v2";
import { EventType, type BaseEvent } from "@ag-ui/client";
import { Observable, throwError } from "rxjs";
import { loadTranscript, saveTranscript } from "./models";
import { repairToolHistory, settlePendingToolCalls } from "./transcripts";

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
 *
 * Every thread this process holds belongs to the traveler who started it (or
 * restored it): nobody else can run on it, replay it or stop it.
 */
export class PersistentAgentRunner extends InMemoryAgentRunner {
  private readonly owners = new Map<string, string>();

  constructor() {
    super();
    // The in-memory runner opts into CopilotKit's local-development thread endpoints (list every
    // thread in memory, read any thread's messages, clear them all), which know nothing about users:
    // on a shared server one traveler could read another's chats. The app never calls them.
    (this as unknown as { ɵsupportsLocalThreadEndpoints: boolean }).ɵsupportsLocalThreadEndpoints = false;
  }

  /** Whether this process holds the thread for a different traveler. */
  private ownedByOther(threadId: string, userId: string | undefined): boolean {
    const owner = this.owners.get(threadId);
    return owner !== undefined && owner !== userId;
  }

  private claim(threadId: string, userId: string | undefined) {
    if (userId && !this.owners.has(threadId)) this.owners.set(threadId, userId);
  }

  run(request: AgentRunnerRunRequest): Observable<BaseEvent> {
    const userId = requestUser.getStore()?.userId;
    if (this.ownedByOther(request.threadId, userId)) {
      return throwError(() => new Error("This conversation belongs to another traveler."));
    }
    this.claim(request.threadId, userId);
    // A tool call without its result right after it (the traveler opened another chat mid-answer, or
    // wrote before answering a card) would make the model call fail, so the history is repaired first
    // (see repairToolHistory): on the agent, whose messages the model call is built from, and in the
    // input this run records, so a reconnect replays the repaired history too.
    const messages = request.input.messages;
    if (Array.isArray(messages)) {
      const settled = repairToolHistory(messages);
      if (settled !== messages) {
        request.agent.setMessages(settled);
        request = { ...request, input: { ...request.input, messages: settled } };
      }
    }
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
    // Another traveler's live thread is never replayed: this traveler gets their own stored copy, if any.
    const inMemory = this.ownedByOther(request.threadId, userId) ? [] : this.getThreadMessages(request.threadId);
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
          // A stored transcript is this traveler's own: the thread is theirs in this process too.
          this.claim(request.threadId, userId);
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

  stop(request: AgentRunnerStopRequest): Promise<boolean | undefined> {
    const userId = requestUser.getStore()?.userId;
    if (this.ownedByOther(request.threadId, userId)) return Promise.resolve(false);
    return super.stop(request);
  }
}
