import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

/**
 * Model selection shared by the chat agent and the server-side helper calls
 * (review Q&A, inspiration extraction).
 */

/** Default model when an Anthropic key is present. */
export const DEFAULT_ANTHROPIC_MODEL = "anthropic/claude-opus-5";
/** Spec prefix for models routed through OpenRouter, e.g. `openrouter/openai/gpt-4o-mini`. */
export const OPENROUTER_PREFIX = "openrouter/";
/** Cheap default with reliable tool calling; override with OPENROUTER_MODEL. */
export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";
export const DEMO_MODEL = "demo";

export type ModelMode = "live" | "demo";

/**
 * Picks the model spec for the built-in agent.
 *
 * - `COPILOT_MODEL` wins when set (e.g. `openrouter/google/gemini-2.5-flash`,
 *   `anthropic/claude-opus-5`, `openai/gpt-5`, `demo`).
 * - Otherwise the first provider with a key in the environment is used, OpenRouter first
 *   (it can route to any model, so a single key covers the cheap options).
 * - Without any key the app runs in demo mode with canned, offline responses so
 *   the UI can be explored before configuring a provider.
 */
export function resolveModelSpec(): string {
  const explicit = process.env.COPILOT_MODEL?.trim();
  if (explicit) return explicit;
  if (process.env.OPENROUTER_API_KEY) {
    return `${OPENROUTER_PREFIX}${process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL}`;
  }
  if (process.env.ANTHROPIC_API_KEY) return DEFAULT_ANTHROPIC_MODEL;
  if (process.env.OPENAI_API_KEY) return "openai/gpt-5";
  if (process.env.GOOGLE_API_KEY) return "google/gemini-2.5-pro";
  return DEMO_MODEL;
}

export function modelMode(spec: string = resolveModelSpec()): ModelMode {
  return spec === DEMO_MODEL || spec === "mock" ? "demo" : "live";
}

/**
 * OpenRouter exposes an OpenAI-compatible Chat Completions API, so any model it lists
 * (`provider/model`) works through the AI SDK's OpenAI-compatible provider. The key stays
 * on the server. `OPENROUTER_BASE_URL` exists for testing against a stand-in server.
 */
export function createOpenRouterModel(modelId: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error(`OPENROUTER_API_KEY is required to use ${OPENROUTER_PREFIX}${modelId}`);
  const provider = createOpenAICompatible({
    name: "openrouter",
    baseURL: process.env.OPENROUTER_BASE_URL?.trim() || "https://openrouter.ai/api/v1",
    apiKey,
    headers: {
      // Optional attribution headers OpenRouter recommends for app rankings.
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL?.trim() || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "XPMatch",
    },
    includeUsage: true,
  });
  return provider.chatModel(modelId);
}

/**
 * A language model for small server-side jobs (structured extraction, review
 * answers). Null in demo mode or when only a gateway model spec is configured,
 * in which case callers fall back to deterministic output.
 */
export function getHelperModel(): LanguageModel | null {
  const spec = resolveModelSpec();
  if (modelMode(spec) === "demo") return null;
  if (spec.startsWith(OPENROUTER_PREFIX)) {
    const id = process.env.HELPER_MODEL?.trim() || spec.slice(OPENROUTER_PREFIX.length);
    return createOpenRouterModel(id);
  }
  // Gateway specs ("anthropic/…", "openai/…") are resolved by the agent runtime; the AI SDK accepts them directly.
  return spec;
}
