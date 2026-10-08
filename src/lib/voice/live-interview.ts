"use client";

import type { FunctionResponseScheduling, LiveServerMessage, Session } from "@google/genai";

/**
 * One spoken conversation with Gemini Live from the browser. The microphone is captured with an
 * AudioWorklet, resampled to 16 kHz 16-bit PCM and streamed; the model's 24 kHz PCM replies are
 * scheduled back to back and cut off the moment the traveler talks over them. Tool calls go to
 * the page, which answers with what it saved.
 */

export type InterviewState = "connecting" | "live" | "ended" | "error";

export interface InterviewCallbacks {
  onState: (state: InterviewState, detail?: string) => void;
  /** A tool call from the model; the return value is sent back as the function's response. */
  onToolCall: (name: string, args: Record<string, unknown>) => Record<string, unknown>;
  /** Captions: what the traveler said and what the assistant said, as they arrive. */
  onTranscript: (who: "you" | "assistant", text: string) => void;
  /** Microphone loudness, 0 to 1, about ten times a second. */
  onLevel?: (level: number) => void;
  onSpeaking?: (speaking: boolean) => void;
  /** The model finished a turn (it is the traveler's turn to talk). */
  onTurnComplete?: () => void;
}

export interface InterviewStart {
  token: string;
  model: string;
  /** A stand-in server in tests; Google's endpoint otherwise. */
  baseUrl?: string;
}

/** Thrown by the start parameters when the session could not be had; its message is shown as is. */
export class InterviewUnavailable extends Error {}

const CONNECT_TIMEOUT_MS = 20_000;
const START_FAILED = "Couldn't start the voice interview. You can finish by typing.";

/** Turns float samples (any rate) into 100 ms chunks of 16 kHz 16-bit PCM, posted to the page with a loudness reading. */
const CAPTURE_WORKLET = `
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / 16000;
    this.pos = 0;
    this.buf = new Int16Array(1600);
    this.n = 0;
    this.sum = 0;
    this.count = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) { this.sum += ch[i] * ch[i]; this.count++; }
    while (this.pos < ch.length) {
      const i = Math.floor(this.pos);
      const f = this.pos - i;
      const a = ch[i];
      const b = i + 1 < ch.length ? ch[i + 1] : a;
      const s = Math.max(-1, Math.min(1, a + (b - a) * f));
      this.buf[this.n++] = s < 0 ? s * 0x8000 : s * 0x7fff;
      if (this.n === this.buf.length) {
        const level = Math.sqrt(this.sum / Math.max(1, this.count));
        this.port.postMessage({ pcm: this.buf, level }, [this.buf.buffer]);
        this.buf = new Int16Array(1600);
        this.n = 0;
        this.sum = 0;
        this.count = 0;
      }
      this.pos += this.ratio;
    }
    this.pos -= ch.length;
    return true;
  }
}
registerProcessor("pcm-capture", PcmCapture);
`;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function fromBase64(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Whether this browser can hold a voice interview at all (microphone access and audio worklets). */
export function voiceSupported(): boolean {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof AudioWorkletNode !== "undefined" && typeof WebSocket !== "undefined";
}

export class LiveInterview {
  private session: Session | null = null;
  private stream: MediaStream | null = null;
  private micContext: AudioContext | null = null;
  private playContext: AudioContext | null = null;
  private playing = new Set<AudioBufferSourceNode>();
  private playAt = 0;
  private muted = false;
  private startedAt = 0;
  private spokenSeconds = 0;
  private stopped = false;
  private failed = false;
  /** Set once the model calls finish_interview: the session closes when its goodbye has played. */
  private closing = false;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private scheduling: FunctionResponseScheduling | undefined;

  constructor(private readonly callbacks: InterviewCallbacks) {}

  /**
   * Connects and opens the microphone. Call it from a click: both audio contexts are made before
   * anything is awaited, because Safari only lets audio start inside the gesture. The parameters
   * can be a function, so the session token is fetched after that.
   */
  async start(params: InterviewStart | (() => Promise<InterviewStart>)): Promise<void> {
    this.callbacks.onState("connecting");
    try {
      this.playContext = new AudioContext({ sampleRate: 24000 });
      // The device's own rate: some browsers refuse to connect a microphone to a context at another rate.
      this.micContext = new AudioContext();
      void this.playContext.resume();
      void this.micContext.resume();
    } catch {
      this.fail("This browser can't play audio here. You can finish by typing.");
      return;
    }
    const timeout = setTimeout(() => {
      if (!this.session) this.fail("The voice service didn't answer. You can finish by typing.");
    }, CONNECT_TIMEOUT_MS);
    // The permission prompt shows while the session is set up.
    const microphone = this.openMicrophone().then(
      () => null,
      () => "Microphone access was blocked. Allow it in the browser to talk, or finish by typing.",
    );
    try {
      let start: InterviewStart;
      try {
        start = typeof params === "function" ? await params() : params;
      } catch (err) {
        this.fail(err instanceof InterviewUnavailable ? err.message : START_FAILED);
        return;
      }
      if (this.stopped) return;
      const { GoogleGenAI, Modality, FunctionResponseScheduling: Scheduling } = await import("@google/genai");
      // A tool's result joins the conversation and the model carries on once it is done talking.
      // (SILENT would keep it from speaking again after a call, which leaves the traveler in silence.)
      this.scheduling = Scheduling.WHEN_IDLE;
      const ai = new GoogleGenAI({ apiKey: start.token, httpOptions: { apiVersion: "v1alpha", ...(start.baseUrl ? { baseUrl: start.baseUrl } : {}) } });
      const session = await ai.live.connect({
        model: start.model,
        // The token locks the rest of the configuration (voice, instructions, tools, transcripts).
        config: { responseModalities: [Modality.AUDIO] },
        callbacks: {
          onmessage: (message) => this.handle(message),
          onerror: () => this.fail("The voice connection dropped. Your answers so far are kept."),
          onclose: (event) => {
            if (this.stopped) return;
            // Closed before the session was set up: the token was refused or the service is down.
            if (!this.session) {
              console.warn("[voice] the session closed before it started:", event?.code, event?.reason);
              this.fail(START_FAILED);
            } else void this.stop();
          },
        },
      });
      if (this.stopped) {
        session.close();
        return;
      }
      this.session = session;
      const blocked = await microphone;
      if (blocked) {
        this.fail(blocked);
        return;
      }
      if (this.stopped) return;
      this.startedAt = Date.now();
      this.callbacks.onState("live");
      // The model speaks first: a greeting and the first question.
      session.sendRealtimeInput({ text: "Hi! I'm ready." });
    } catch (err) {
      console.warn("[voice] could not start:", err instanceof Error ? err.message : err);
      this.fail(START_FAILED);
    } finally {
      clearTimeout(timeout);
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  /** Ends the conversation; returns how long it ran and how long the model spoke, for the cost meter. */
  async stop(): Promise<{ seconds: number; modelSeconds: number }> {
    if (this.stopped) return this.usage();
    this.stopped = true;
    if (this.closeTimer) clearTimeout(this.closeTimer);
    try {
      this.session?.close();
    } catch {
      // Already closed.
    }
    this.session = null;
    this.stopPlayback();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    await this.micContext?.close().catch(() => undefined);
    await this.playContext?.close().catch(() => undefined);
    this.micContext = null;
    this.playContext = null;
    if (!this.failed) this.callbacks.onState("ended");
    return this.usage();
  }

  private usage() {
    return { seconds: this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0, modelSeconds: Math.round(this.spokenSeconds) };
  }

  private fail(detail: string) {
    if (this.stopped || this.failed) return;
    this.failed = true;
    void this.stop().then(() => this.callbacks.onState("error", detail));
  }

  private async openMicrophone() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    const ctx = this.micContext;
    if (this.stopped || !ctx) {
      this.stream.getTracks().forEach((t) => t.stop());
      return;
    }
    const url = URL.createObjectURL(new Blob([CAPTURE_WORKLET], { type: "application/javascript" }));
    try {
      await ctx.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    if (this.stopped || !this.stream) return;
    const source = ctx.createMediaStreamSource(this.stream);
    const capture = new AudioWorkletNode(ctx, "pcm-capture");
    capture.port.onmessage = (event: MessageEvent<{ pcm: Int16Array; level: number }>) => {
      this.callbacks.onLevel?.(this.muted ? 0 : Math.min(1, event.data.level * 4));
      if (this.muted || !this.session || this.stopped) return;
      this.session.sendRealtimeInput({ audio: { data: toBase64(new Uint8Array(event.data.pcm.buffer)), mimeType: "audio/pcm;rate=16000" } });
    };
    // A silent sink keeps the worklet running without playing the microphone back.
    const sink = ctx.createGain();
    sink.gain.value = 0;
    source.connect(capture).connect(sink).connect(ctx.destination);
  }

  private handle(message: LiveServerMessage) {
    if (this.stopped) return;
    const content = message.serverContent;
    if (content?.interrupted) this.stopPlayback();
    for (const part of content?.modelTurn?.parts ?? []) {
      if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("audio/")) this.play(part.inlineData.data);
    }
    if (content?.inputTranscription?.text) this.callbacks.onTranscript("you", content.inputTranscription.text);
    if (content?.outputTranscription?.text) this.callbacks.onTranscript("assistant", content.outputTranscription.text);
    if (content?.turnComplete) {
      this.callbacks.onTurnComplete?.();
      if (this.closing) this.closeWhenQuiet();
    }
    const calls = message.toolCall?.functionCalls ?? [];
    if (calls.length && this.session) {
      const responses = calls.map((call) => {
        const name = call.name ?? "";
        if (name === "finish_interview") this.closing = true;
        let response: Record<string, unknown>;
        try {
          response = this.callbacks.onToolCall(name, (call.args ?? {}) as Record<string, unknown>);
        } catch {
          response = { error: "Not saved" };
        }
        return { id: call.id, name, response, scheduling: this.scheduling };
      });
      this.session.sendToolResponse({ functionResponses: responses });
      // The goodbye may already have played, or still be on its way: give it a moment either way.
      if (this.closing) this.closeWhenQuiet(2500);
    }
    if (message.goAway) this.closeWhenQuiet();
  }

  private play(data: string) {
    const ctx = this.playContext;
    if (!ctx) return;
    const bytes = fromBase64(data);
    const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
    if (!samples.length) return;
    const buffer = ctx.createBuffer(1, samples.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) channel[i] = samples[i] / 0x8000;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    if (this.closeTimer) clearTimeout(this.closeTimer);
    const at = Math.max(ctx.currentTime, this.playAt);
    source.start(at);
    this.playAt = at + buffer.duration;
    this.spokenSeconds += buffer.duration;
    this.playing.add(source);
    if (this.playing.size === 1) this.callbacks.onSpeaking?.(true);
    source.onended = () => {
      this.playing.delete(source);
      if (!this.playing.size) {
        this.callbacks.onSpeaking?.(false);
        if (this.closing) this.closeWhenQuiet();
      }
    };
  }

  private stopPlayback() {
    for (const source of this.playing) {
      try {
        source.stop();
      } catch {
        // Not started yet.
      }
    }
    this.playing.clear();
    this.playAt = 0;
    this.callbacks.onSpeaking?.(false);
  }

  /** Lets the goodbye finish playing, then ends the session (audio arriving meanwhile postpones it). */
  private closeWhenQuiet(delayMs = 400) {
    if (this.playing.size) return;
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      if (!this.playing.size) void this.stop();
    }, delayMs);
  }
}
