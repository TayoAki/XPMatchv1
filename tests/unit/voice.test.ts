import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ queryAll: vi.fn<(sql: string, params?: unknown[]) => Promise<unknown[]>>(async () => []), queryOne: vi.fn(async () => null) }));
vi.mock("@/server/db", () => db);

const genai = vi.hoisted(() => ({
  options: [] as unknown[],
  create: vi.fn<(params: { config: Record<string, unknown> }) => Promise<{ name?: string }>>(async () => ({ name: "auth_tokens/test-token" })),
}));
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    authTokens = { create: genai.create };
    constructor(options: unknown) {
      genai.options.push(options);
    }
  },
  Modality: { AUDIO: "AUDIO" },
}));

import { mintVoiceSession, recordVoiceUsage, voiceConfigured } from "@/server/voice";
import { flushUsage } from "@/server/usage";

const ctx = { firstName: "Taco", homeCity: "Atlanta, GA, USA", personality: "casual" as const, placesBeen: ["Lisbon, Portugal"], placesWant: [], trip: "", answered: "" };

describe("voice sessions", () => {
  beforeEach(() => {
    genai.options.length = 0;
    genai.create.mockClear();
    db.queryAll.mockClear();
    process.env.GEMINI_API_KEY = "test-gemini-key";
    delete process.env.GEMINI_BASE_URL;
  });
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it("is off without a key", () => {
    delete process.env.GEMINI_API_KEY;
    expect(voiceConfigured()).toBe(false);
    process.env.GEMINI_API_KEY = "  ";
    expect(voiceConfigured()).toBe(false);
  });

  it("mints a single-use, short-lived token locked to the interview's model, voice, instructions and tools", async () => {
    const before = Date.now();
    const session = await mintVoiceSession(ctx, "Puck");
    expect(session).toEqual({ token: "auth_tokens/test-token", model: "gemini-3.8-live", baseUrl: undefined });
    expect(genai.options[0]).toMatchObject({ apiKey: "test-gemini-key", httpOptions: { apiVersion: "v1alpha" } });
    const config = genai.create.mock.calls[0][0].config as {
      uses: number;
      expireTime: string;
      newSessionExpireTime: string;
      liveConnectConstraints: { model: string; config: Record<string, unknown> };
    };
    expect(config.uses).toBe(1);
    // The session must start within two minutes and can run no longer than half an hour.
    expect(Date.parse(config.newSessionExpireTime) - before).toBeLessThanOrEqual(2 * 60_000 + 1000);
    expect(Date.parse(config.expireTime) - before).toBeLessThanOrEqual(30 * 60_000 + 1000);
    expect(config.liveConnectConstraints.model).toBe("gemini-3.8-live");
    expect(config.liveConnectConstraints.config).toMatchObject({
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    });
    expect(String(config.liveConnectConstraints.config.systemInstruction)).toContain("Taco");
    const tools = config.liveConnectConstraints.config.tools as { functionDeclarations: { name: string }[] }[];
    expect(tools[0].functionDeclarations.map((f) => f.name)).toEqual(["record_answers", "show_section", "finish_interview"]);
  });

  it("refuses without a key, and when Gemini returns no token", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(mintVoiceSession(ctx, "Puck")).rejects.toThrow("GEMINI_API_KEY");
    process.env.GEMINI_API_KEY = "test-gemini-key";
    genai.create.mockResolvedValueOnce({});
    await expect(mintVoiceSession(ctx, "Puck")).rejects.toThrow("did not return a session token");
  });

  it("counts the interview's audio minutes at the Live price", async () => {
    recordVoiceUsage(120, 60);
    await flushUsage();
    const call = db.queryAll.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO usage_daily"));
    const params = call?.[1] as unknown[];
    const gemini = [];
    for (let i = 0; i < params.length; i += 7) if (params[i + 1] === "gemini") gemini.push(params.slice(i, i + 7));
    expect(gemini).toHaveLength(1);
    const [, , sku, calls, unitsIn, unitsOut, cost] = gemini[0];
    expect([sku, calls, unitsIn, unitsOut]).toEqual(["gemini-3.8-live", 1, 120, 60]);
    // Two minutes heard at $0.005 and one minute spoken at $0.018.
    expect(cost).toBeCloseTo(0.028, 6);
  });
});
