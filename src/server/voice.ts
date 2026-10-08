import { GoogleGenAI, Modality } from "@google/genai";
import { INTERVIEW_MODEL, interviewInstruction, interviewTools, type InterviewContext } from "@/lib/onboarding/interview";
import { LIVE_AUDIO_PRICES } from "./pricing";
import { recordUsage } from "./usage";

/**
 * Gemini Live for the onboarding interview. The browser talks to Gemini directly with a token
 * minted here: single use, short-lived, and locked to our model, voice, instructions and tools,
 * so the API key never leaves the server and the token cannot be used for anything else.
 * `GEMINI_BASE_URL` points at a stand-in server in tests only; it must never be set in production.
 */

export function voiceConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY?.trim();
}

const baseUrl = () => process.env.GEMINI_BASE_URL?.trim() || undefined;

export interface VoiceSession {
  token: string;
  model: string;
  /** Only in tests: where the stand-in Live server listens. */
  baseUrl?: string;
}

export async function mintVoiceSession(ctx: InterviewContext, voice: string): Promise<VoiceSession> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: "v1alpha", baseUrl: baseUrl() } });
  const now = Date.now();
  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime: new Date(now + 30 * 60_000).toISOString(),
      newSessionExpireTime: new Date(now + 2 * 60_000).toISOString(),
      liveConnectConstraints: {
        model: INTERVIEW_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
          systemInstruction: interviewInstruction(ctx),
          // The declarations use the API's schema type names; the SDK passes them through.
          tools: interviewTools() as never,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      },
      httpOptions: { apiVersion: "v1alpha", baseUrl: baseUrl() },
    },
  });
  if (!token.name) throw new Error("Gemini did not return a session token");
  recordUsage("app", "voice_session");
  return { token: token.name, model: INTERVIEW_MODEL, baseUrl: baseUrl() };
}

/** Counts an interview's audio, as reported by the browser that held the session. */
export function recordVoiceUsage(seconds: number, modelSeconds: number) {
  const price = LIVE_AUDIO_PRICES[INTERVIEW_MODEL];
  const costUsd = price ? (seconds / 60) * price.inPerMinute + (modelSeconds / 60) * price.outPerMinute : 0;
  recordUsage("gemini", INTERVIEW_MODEL, { calls: 1, unitsIn: seconds, unitsOut: modelSeconds, costUsd });
}
