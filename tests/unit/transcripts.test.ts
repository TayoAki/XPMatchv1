import { describe, expect, it } from "vitest";
import { INTERRUPTED_NOTE, repairToolHistory, settlePendingToolCalls, trimTranscript, TRANSCRIPT_MAX_MESSAGES } from "@/server/transcripts";

const user = (i: number) => ({ id: `u${i}`, role: "user", content: `message ${i}` });
const assistant = (i: number, toolCalls?: { id: string }[]) => ({ id: `a${i}`, role: "assistant", content: `answer ${i}`, toolCalls });
const tool = (callId: string) => ({ id: `t-${callId}`, role: "tool", toolCallId: callId, content: "{}" });

describe("trimTranscript", () => {
  it("keeps short transcripts untouched", () => {
    const list = [user(1), assistant(1)];
    expect(trimTranscript(list)).toBe(list);
  });

  it("cuts at a user turn when over the message cap", () => {
    const list: { id: string; role: string; content: string }[] = [];
    for (let i = 0; i < TRANSCRIPT_MAX_MESSAGES + 10; i++) list.push(i % 2 === 0 ? user(i) : assistant(i));
    const trimmed = trimTranscript(list);
    expect(trimmed.length).toBeLessThanOrEqual(TRANSCRIPT_MAX_MESSAGES);
    expect(trimmed[0].role).toBe("user");
    expect(trimmed[trimmed.length - 1]).toEqual(list[list.length - 1]);
  });

  it("drops whole turns when the byte cap is exceeded", () => {
    const big = "x".repeat(600_000);
    const list = [user(1), { ...assistant(1), content: big }, user(2), { ...assistant(2), content: big }, user(3), { ...assistant(3), content: big }];
    const trimmed = trimTranscript(list);
    expect(trimmed[0].role).toBe("user");
    expect(trimmed.length).toBeLessThan(list.length);
    expect(trimmed[trimmed.length - 1].id).toBe("a3");
  });
});

describe("settlePendingToolCalls", () => {
  it("adds a neutral result after an unanswered tool call", () => {
    const list = [user(1), assistant(1, [{ id: "call_1" }])];
    const settled = settlePendingToolCalls(list) as { role: string; toolCallId?: string; content?: string }[];
    expect(settled).toHaveLength(3);
    expect(settled[2].role).toBe("tool");
    expect(settled[2].toolCallId).toBe("call_1");
    expect(JSON.parse(settled[2].content ?? "{}")).toMatchObject({ created: false, saved: false });
  });

  it("leaves answered calls alone and keeps order", () => {
    const list = [user(1), assistant(1, [{ id: "call_1" }]), tool("call_1"), assistant(2)];
    expect(settlePendingToolCalls(list)).toEqual(list);
  });

  it("settles several calls on one assistant message", () => {
    const list = [user(1), assistant(1, [{ id: "a" }, { id: "b" }]), tool("b")];
    const settled = settlePendingToolCalls(list) as { role: string; toolCallId?: string }[];
    expect(settled.filter((m) => m.role === "tool").map((m) => m.toolCallId)).toEqual(["a", "b"]);
  });

  it("settles a call cut off mid-answer, right after it, with the note given, before the next message", () => {
    const list = [user(1), assistant(1, [{ id: "focus" }]), user(2)];
    const settled = settlePendingToolCalls(list, INTERRUPTED_NOTE) as { role: string; toolCallId?: string; content?: string }[];
    expect(settled.map((m) => m.role)).toEqual(["user", "assistant", "tool", "user"]);
    expect(settled[2].toolCallId).toBe("focus");
    expect(JSON.parse(settled[2].content ?? "{}").note).toBe(INTERRUPTED_NOTE);
  });

  it("returns the same array when nothing is pending", () => {
    const list = [user(1), assistant(1, [{ id: "call_1" }]), tool("call_1")];
    expect(settlePendingToolCalls(list)).toBe(list);
  });
});

describe("repairToolHistory", () => {
  const ids = (list: unknown[]) => (list as { id: string }[]).map((m) => m.id);

  it("answers a call cut off mid-answer right after it, before the next message", () => {
    const repaired = repairToolHistory([user(1), assistant(1, [{ id: "focus" }]), user(2)]) as { id: string; content?: string }[];
    expect(ids(repaired)).toEqual(["u1", "a1", "settled-focus", "u2"]);
    expect(JSON.parse(repaired[2].content ?? "{}").note).toBe(INTERRUPTED_NOTE);
  });

  it("moves a card answered after the traveler wrote something else back next to its call", () => {
    const list = [user(1), assistant(1, [{ id: "trip" }]), user(2), assistant(2), tool("trip")];
    expect(ids(repairToolHistory(list))).toEqual(["u1", "a1", "t-trip", "u2", "a2"]);
  });

  it("drops a result whose call is not in the history, and a second result for the same call", () => {
    const list = [user(1), tool("gone"), assistant(1, [{ id: "c" }]), tool("c"), tool("c")];
    expect(ids(repairToolHistory(list))).toEqual(["u1", "a1", "t-c"]);
  });

  it("returns the same array when the history is in order", () => {
    const list = [user(1), assistant(1, [{ id: "a" }, { id: "b" }]), tool("a"), tool("b"), assistant(2)];
    expect(repairToolHistory(list)).toBe(list);
  });
});
