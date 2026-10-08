// Stand-in for the Gemini Live API used by the onboarding's voice interview: mints single-use
// session tokens (POST /v1alpha/auth_tokens, what the server calls) and runs a scripted spoken
// interview over the constrained Live WebSocket (what the browser opens with the token). The
// script speaks a little audio, shows each section and records answers through tool calls,
// waiting for the page's reply to each. GET /__log returns what it saw, for the specs to check.
import http from "node:http";
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT || 4549);
const LIVE_PATH = "/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

/** Minted tokens: name → what the server locked into it, and whether it was used. */
const tokens = new Map();
/** One entry per Live connection. */
const sessions = [];

/** A quarter second of a quiet 24 kHz tone as 16-bit PCM, base64: enough for the page to play and time. */
function speech(seconds = 0.25) {
  const n = Math.round(24000 * seconds);
  const pcm = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) pcm.writeInt16LE(Math.round(Math.sin((i / 24000) * 2 * Math.PI * 220) * 1200), i * 2);
  return pcm.toString("base64");
}

/** The interview: lines the assistant says, what the traveler is heard saying, and the tool calls it makes. */
const SCRIPT = [
  { say: "Hi! Let's start with your travel style. Who do you usually travel with?" },
  { call: "show_section", args: { section: "style" } },
  { hear: "Usually with my wife, and we love a good dinner out." },
  { call: "record_answers", args: { companions: "my wife", budget: "Upscale", splurges: ["Restaurants", "spa days"] } },
  { say: "Lovely. Now, where do you like to stay?" },
  { call: "show_section", args: { section: "stays" } },
  { hear: "Boutique hotels or an Airbnb. I collect Hilton points." },
  { call: "record_answers", args: { accommodation: ["boutique hotels", "Airbnb"], loyalty: ["Hilton Honors"] } },
  { call: "show_section", args: { section: "food" } },
  { call: "record_answers", args: { restaurants: ["street food", "Coffee shops"], dietary: ["Vegetarian"] } },
  { call: "show_section", args: { section: "wrap" } },
  { call: "record_answers", args: { weekends: ["hiking", "Live music"], notes: "Allergic to cats." } },
  { say: "Thanks! Your answers are saved on screen, and you can edit them any time." },
  { call: "finish_interview", args: {} },
  { done: true },
];

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function runInterview(ws, session) {
  let callId = 0;
  const send = (msg) => ws.readyState === ws.OPEN && ws.send(JSON.stringify(msg));
  for (const step of SCRIPT) {
    if (ws.readyState !== ws.OPEN) return;
    await pause(120);
    if (step.say) {
      send({ serverContent: { outputTranscription: { text: step.say } } });
      send({ serverContent: { modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: speech() } }] } } });
      send({ serverContent: { turnComplete: true } });
    } else if (step.hear) {
      send({ serverContent: { inputTranscription: { text: step.hear } } });
    } else if (step.call) {
      const id = `call-${++callId}`;
      const answered = new Promise((resolve) => session.waiting.set(id, resolve));
      send({ toolCall: { functionCalls: [{ id, name: step.call, args: step.args }] } });
      // The page answers every call; a missing answer fails the spec rather than hanging it.
      await Promise.race([answered, pause(5000)]);
    } else if (step.done) {
      send({ serverContent: { turnComplete: true } });
    }
  }
}

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    const url = new URL(req.url.replace(/^\/+/, "/"), `http://localhost:${PORT}`);
    const send = (status, payload) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(payload));
    };
    if (req.method === "POST" && url.pathname === "/v1alpha/auth_tokens") {
      if (!req.headers["x-goog-api-key"]) return send(401, { error: { message: "API key missing" } });
      const name = `auth_tokens/e2e-${tokens.size + 1}-${Date.now().toString(36)}`;
      tokens.set(name, { body: JSON.parse(body || "{}"), used: false });
      return send(200, { name });
    }
    if (req.method === "GET" && url.pathname === "/__log") {
      return send(200, { tokens: [...tokens.entries()].map(([name, t]) => ({ name, used: t.used, body: t.body })), sessions: sessions.map((s) => ({ token: s.token, setup: s.setup, texts: s.texts, audioChunks: s.audioChunks, toolResponses: s.toolResponses })) });
    }
    return send(404, { error: { message: `no route for ${req.method} ${url.pathname}` } });
  });
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  // The SDK joins its base URL and path with a doubled slash ("//ws/…"), which URL() would read as a host.
  const url = new URL(req.url.replace(/^\/+/, "/"), `http://localhost:${PORT}`);
  if (url.pathname !== LIVE_PATH) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    const token = tokens.get(url.searchParams.get("access_token") ?? "");
    if (!token || token.used) {
      ws.close(1008, "Invalid or used session token");
      return;
    }
    token.used = true;
    const session = { token: url.searchParams.get("access_token"), setup: null, texts: [], audioChunks: 0, toolResponses: [], waiting: new Map() };
    sessions.push(session);
    let started = false;
    ws.on("message", (data) => {
      let msg;
      try {
        msg = JSON.parse(String(data));
      } catch {
        return;
      }
      if (msg.setup) {
        session.setup = msg.setup;
        ws.send(JSON.stringify({ setupComplete: {} }));
      } else if (msg.realtimeInput?.audio) {
        session.audioChunks += 1;
      } else if (typeof msg.realtimeInput?.text === "string") {
        session.texts.push(msg.realtimeInput.text);
        if (!started) {
          started = true;
          void runInterview(ws, session);
        }
      } else if (msg.toolResponse) {
        for (const r of msg.toolResponse.functionResponses ?? []) {
          session.toolResponses.push(r);
          session.waiting.get(r.id)?.();
        }
      }
    });
  });
});

server.listen(PORT, () => console.log(`mock gemini listening on ${PORT}`));
