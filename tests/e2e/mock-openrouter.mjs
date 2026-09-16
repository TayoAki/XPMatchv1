// Stand-in for OpenRouter: OpenAI-compatible /chat/completions with SSE streaming.
// Logs every request summary so the app's outgoing protocol can be inspected.
import http from "node:http";
import fs from "node:fs";

const PORT = Number(process.env.PORT || 4545);
const LOG = process.env.LOG || "";

const sse = (res, obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
const chunk = (delta, finish = null, extra = {}) => ({
  id: "chatcmpl-mock",
  object: "chat.completion.chunk",
  created: Math.floor(Date.now() / 1000),
  model: "mock/model",
  choices: [{ index: 0, delta, finish_reason: finish }],
  ...extra,
});

function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((p) => p?.text ?? "").join(" ");
  return "";
}

async function streamReply(res, { text, toolCall }) {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  sse(res, chunk({ role: "assistant", content: "" }));
  for (const word of (text || "").split(/(\s+)/).filter(Boolean)) {
    sse(res, chunk({ content: word }));
    await new Promise((r) => setTimeout(r, 8));
  }
  if (toolCall) {
    const id = `call_${Math.random().toString(36).slice(2, 10)}`;
    sse(res, chunk({ tool_calls: [{ index: 0, id, type: "function", function: { name: toolCall.name, arguments: "" } }] }));
    const args = JSON.stringify(toolCall.args);
    for (let i = 0; i < args.length; i += 24) {
      sse(res, chunk({ tool_calls: [{ index: 0, function: { arguments: args.slice(i, i + 24) } }] }));
      await new Promise((r) => setTimeout(r, 8));
    }
    sse(res, chunk({}, "tool_calls", { usage: { prompt_tokens: 100, completion_tokens: 40, total_tokens: 140 } }));
  } else {
    sse(res, chunk({}, "stop", { usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } }));
  }
  res.write("data: [DONE]\n\n");
  res.end();
}

/** Name of the tool a trailing tool result belongs to. */
function lastToolName(messages) {
  const last = messages[messages.length - 1];
  if (last?.role !== "tool") return null;
  for (let i = messages.length - 2; i >= 0; i--) {
    const m = messages[i];
    const call = m.role === "assistant" && (m.tool_calls || []).find((c) => c.id === last.tool_call_id);
    if (call) return call.function?.name ?? null;
  }
  return null;
}

const HOTELS = {
  destination: "Rome",
  guests: 2,
  hotels: [
    {
      name: "Hotel de Russie",
      area: "Piazza del Popolo",
      style: "Luxury",
      priceTier: "$$$$",
      nightlyEstimateUsd: 900,
      rating: 4.6,
      whyItFits: "Garden courtyard steps from the Spanish Steps.",
      amenities: ["Spa", "Garden", "Bar"],
      tradeoffs: ["Well over $250/night", "Piazza traffic noise in front rooms"],
    },
    {
      name: "Hotel Artemide",
      area: "Via Nazionale",
      style: "Boutique",
      priceTier: "$$$",
      nightlyEstimateUsd: 260,
      rating: 4.6,
      whyItFits: "Rooftop terrace and easy walks to Termini and the Trevi Fountain.",
      amenities: ["Rooftop", "Breakfast", "Spa"],
      tradeoffs: ["Busy street, ask for a courtyard room"],
    },
  ],
};

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", async () => {
    if (req.method === "GET" && req.url?.startsWith("/api/v1/models")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ data: [{ id: "mock/model" }] }));
    }
    if (req.method !== "POST" || !req.url?.startsWith("/api/v1/chat/completions")) {
      res.writeHead(404);
      return res.end("not found");
    }
    if (!/^Bearer sk-or-/.test(req.headers.authorization || "")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: { message: "missing bearer" } }));
    }
    const payload = JSON.parse(body || "{}");
    const tools = (payload.tools || []).map((t) => t.function?.name);
    const messages = payload.messages || [];
    const last = messages[messages.length - 1];
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const toolName = lastToolName(messages);
    if (LOG) fs.appendFileSync(
      LOG,
      JSON.stringify({
        model: payload.model,
        stream: payload.stream,
        tool_choice: payload.tool_choice,
        tools,
        headers: { referer: req.headers["http-referer"], title: req.headers["x-title"] },
        lastRole: last?.role,
        lastTool: toolName,
        lastText: textOf(lastUser?.content).slice(0, 80),
        systemLen: messages.filter((m) => m.role === "system").map((m) => textOf(m.content).length),
        contextHas: {
          learned: messages.some((m) => /Learned preferences/.test(textOf(m.content))),
          taste: messages.some((m) => /Taste profile/.test(textOf(m.content))),
        },
      }) + "\n",
    );
    const text = textOf(lastUser?.content).toLowerCase();
    const forced = payload.tool_choice?.function?.name;
    const system = messages.filter((m) => m.role === "system").map((m) => textOf(m.content)).join("\n");
    if (payload.stream !== true || payload.response_format) {
      // Structured helper calls (review answers, inspiration extraction) come in as JSON mode, not streamed.
      let content = "{}";
      if (/traveler question about a place/i.test(system)) {
        const refs = [];
        if (/\[summary 0\]/.test(textOf(lastUser?.content))) refs.push({ type: "summary", ref: 0 });
        if (/\[review 0\]/.test(textOf(lastUser?.content))) refs.push({ type: "review", ref: 0 });
        if (/\[attribute 0\]/.test(textOf(lastUser?.content))) refs.push({ type: "attribute", ref: 0 });
        const q = textOf(lastUser?.content).match(/Question: (.*)/)?.[1] ?? "";
        const answer = /nois|quiet/i.test(q)
          ? "Front rooms hear the buses early; ask for a courtyard room and it is quiet."
          : /dog/i.test(q)
            ? "Yes, dogs are allowed according to Google's listing and a recent review."
            : "The evidence points to yes, with one caveat mentioned in a review.";
        content = JSON.stringify({ answer, confidence: refs.length > 1 ? "clear" : "thin", refs });
      } else if (/extract the reservations/i.test(system)) {
        content = JSON.stringify({
          reservations: [
            {
              kind: "hotel",
              title: "Hotel Artemide, 3 nights",
              provider: "Hotel Artemide",
              confirmationCode: "ART-88213",
              startsAt: "2026-10-10T15:00",
              endsAt: "2026-10-13T11:00",
              placeName: "Hotel Artemide",
              address: "Via Nazionale 22, Rome",
              city: "Rome",
              travelers: 2,
              price: 780,
              currency: "EUR",
              notes: "Superior double, breakfast included, free cancellation until Oct 3",
            },
            {
              kind: "flight",
              title: "Delta ATL → FCO",
              provider: "Delta",
              confirmationCode: "DLX9Q2",
              travelers: 2,
              price: 1420,
              currency: "USD",
              legs: [{ from: "ATL", to: "FCO", flightNumber: "DL 1234", departsAt: "2026-10-09T17:30", arrivesAt: "2026-10-10T08:45" }],
            },
          ],
        });
      } else if (/extract the places/i.test(system)) {
        content = JSON.stringify({
          destination: "Rome, Italy",
          places: [
            { name: "Roscioli Salumeria con Cucina", kind: "restaurant", city: "Rome", why: "the carbonara everyone talks about" },
            { name: "Trattoria Da Enzo al 29", kind: "restaurant", city: "Rome", why: "cacio e pepe in Trastevere" },
            { name: "Villa Borghese", kind: "attraction", city: "Rome", why: "a green break with the gallery" },
            { name: "Hotel Artemide", kind: "hotel", city: "Rome", why: "rooftop hot tub, central" },
            { name: "Il Posto Segreto", kind: "restaurant", city: "Rome", why: "a place the author could not name precisely" },
          ],
        });
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          id: "chatcmpl-mock",
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: "mock/model",
          choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
          usage: { prompt_tokens: 200, completion_tokens: 60, total_tokens: 260 },
        }),
      );
    }
    if (forced === "copilotkitSuggest" || tools.includes("copilotkitSuggest")) {
      return streamReply(res, {
        toolCall: {
          name: "copilotkitSuggest",
          args: {
            suggestions: [
              { title: "Hotels in Rome", message: "Find hotels in Rome for me." },
              { title: "Things to do", message: "What are the top things to do in Rome?" },
            ],
          },
        },
      });
    }
    // Continuations after a tool result.
    if (last?.role === "tool") {
      if (toolName === "set_search_constraints" && tools.includes("show_hotels")) {
        return streamReply(res, { text: "Here are two stays that fit.", toolCall: { name: "show_hotels", args: HOTELS } });
      }
      if (toolName === "remember_preference") return streamReply(res, { text: "Got it — noted for next time." });
      if (toolName === "ask_about_place") return streamReply(res, { text: "Front rooms hear the buses early; a courtyard room fixes that." });
      if (toolName === "compare_options") return streamReply(res, { text: "Artemide is the safer pick for a quiet night at that budget." });
      if (toolName === "schedule_stops") return streamReply(res, { text: "Done — it's on the board." });
      if (toolName === "record_feedback") return streamReply(res, { text: "Noted — I'll steer away from that next time." });
      if (toolName === "import_inspiration") return streamReply(res, { text: "Those are on the cards above. Want them in a trip?" });
      if (toolName === "import_reservation") return streamReply(res, { text: "Got it — the bookings are on the cards above. Add them to a trip?" });
      if (toolName === "create_trip") return streamReply(res, { text: "Saved — the trip is in your Trips with the board ready. Want hotels next?" });
      return streamReply(res, { text: "Done — those are on the cards above. Want stays or things to do next?" });
    }
    if (/plan (?:a|my) trip to rome|itinerary for rome/.test(text) && tools.includes("create_trip")) {
      return streamReply(res, {
        text: "Here is a plan that fits you.",
        toolCall: {
          name: "create_trip",
          args: {
            title: "Long weekend in Rome",
            destination: "Rome, Italy",
            startDate: "2026-10-10",
            endDate: "2026-10-12",
            travelers: 2,
            budgetTier: "mid-range",
            summary: "Ancient Rome first, then Trastevere for the food; museums at opening to beat the crowds.",
            itinerary: [
              {
                day: 1,
                title: "Ancient Rome",
                stops: [
                  { name: "Colosseum", kind: "attraction", note: "book the arena floor", startTime: "09:00", durationMin: 120 },
                  { name: "Roscioli Salumeria con Cucina", kind: "restaurant", note: "book ahead", startTime: "13:00", durationMin: 90 },
                  { name: "Pantheon", kind: "attraction", startTime: "16:00", durationMin: 45 },
                ],
              },
              {
                day: 2,
                title: "Green Rome and Trastevere",
                stops: [
                  { name: "Villa Borghese", kind: "attraction", note: "rent a bike", startTime: "10:00", durationMin: 150 },
                  { name: "Trattoria Da Enzo al 29", kind: "restaurant", note: "cacio e pepe", startTime: "19:30" },
                ],
              },
            ],
          },
        },
      });
    }
    if (/confirmation|booking reference|itinerary receipt/.test(text) && tools.includes("import_reservation")) {
      return streamReply(res, { text: "Let me read that confirmation.", toolCall: { name: "import_reservation", args: { text: textOf(lastUser?.content) } } });
    }
    const link = textOf(lastUser?.content).match(/https?:\/\/\S+/);
    if (link && tools.includes("import_inspiration")) {
      return streamReply(res, { text: "Let me pull the places out of that.", toolCall: { name: "import_inspiration", args: { url: link[0].replace(/[.,)]+$/, "") } } });
    }
    const reaction = text.match(/^(?:the )?(.+?) was (too noisy|great|fine|not for me)/);
    if (reaction && tools.includes("record_feedback")) {
      const raw = reaction[1].trim();
      const name = /artemide/.test(raw) ? "Hotel Artemide" : /russie/.test(raw) ? "Hotel de Russie" : /enzo/.test(raw) ? "Trattoria Da Enzo al 29" : raw.replace(/\b\w/g, (c) => c.toUpperCase());
      const verdict = reaction[2] === "great" ? "loved" : reaction[2] === "fine" ? "fine" : "disliked";
      const reasons = reaction[2] === "too noisy" ? ["Noisy"] : reaction[2] === "great" ? ["Location"] : [];
      return streamReply(res, {
        text: "Sorry to hear that.",
        toolCall: { name: "record_feedback", args: { name, kind: /hotel|artemide|russie/.test(raw) ? "hotel" : "restaurant", verdict, reasons, destination: "Rome, Italy" } },
      });
    }
    const schedule = text.match(/put (?:the )?(.+?) on day (\d+)/);
    if (schedule && tools.includes("schedule_stops")) {
      const raw = schedule[1].trim();
      const name = raw.replace(/\b\w/g, (c) => c.toUpperCase());
      const kind = /hotel|artemide|russie/.test(raw) ? "hotel" : /roscioli|enzo|trattoria/.test(raw) ? "restaurant" : "attraction";
      return streamReply(res, {
        text: "Adding it to the board.",
        toolCall: { name: "schedule_stops", args: { stops: [{ name, day: Number(schedule[2]), kind, note: "from chat" }] } },
      });
    }
    if (/\b(is|does|do|are|how)\b.*\b(noisy|quiet|dogs|vegetarian|crowded|book|desk|kids)\b/.test(text) && tools.includes("ask_about_place")) {
      const name = /artemide/.test(text) ? "Hotel Artemide" : /russie/.test(text) ? "Hotel de Russie" : /roscioli/.test(text) ? "Roscioli Salumeria con Cucina" : "Colosseum";
      return streamReply(res, {
        text: "Let me check the reviews.",
        toolCall: { name: "ask_about_place", args: { name, kind: /hotel|artemide|russie/.test(text) ? "hotel" : /roscioli/.test(text) ? "restaurant" : "attraction", destination: "Rome, Italy", question: textOf(lastUser?.content) } },
      });
    }
    if (/^compare these options|compare .* and /.test(text) && tools.includes("compare_options")) {
      return streamReply(res, {
        text: "Here is how they stack up on what you care about.",
        toolCall: {
          name: "compare_options",
          args: {
            kind: "hotels",
            priorities: ["Quiet at night", "Under $250/night", "Pool"],
            options: [
              {
                name: "Hotel de Russie",
                area: "Piazza del Popolo",
                priceEstimateUsd: 900,
                rating: 4.6,
                cells: [
                  { priority: "Quiet at night", verdict: "ok", note: "Garden-side rooms are quiet; piazza-side less so" },
                  { priority: "Under $250/night", verdict: "weak", note: "Roughly $900/night" },
                  { priority: "Pool", verdict: "unknown", note: "Spa yes, pool not confirmed" },
                ],
                strengths: ["Secret garden", "Best location"],
                compromises: ["Price"],
                unknowns: ["Pool"],
              },
              {
                name: "Hotel Artemide",
                area: "Via Nazionale",
                priceEstimateUsd: 260,
                rating: 4.6,
                cells: [
                  { priority: "Quiet at night", verdict: "ok", note: "Courtyard rooms are quiet" },
                  { priority: "Under $250/night", verdict: "ok", note: "Around $260, close to budget" },
                  { priority: "Pool", verdict: "weak", note: "No pool; rooftop hot tub" },
                ],
                strengths: ["Rooftop terrace", "Value"],
                compromises: ["Busy street"],
                unknowns: [],
              },
            ],
            recommendation: "Artemide if budget matters most; de Russie for the garden and location.",
          },
        },
      });
    }
    if (/prefer|i love|i hate|always want/.test(text) && tools.includes("remember_preference")) {
      return streamReply(res, {
        text: "Noted.",
        toolCall: { name: "remember_preference", args: { statement: "Prefers boutique hotels over big chains", domain: "stays", polarity: "like" } },
      });
    }
    if (/search .* again with these filters|search .* again without/.test(text) && tools.includes("set_search_constraints")) {
      const chips = [];
      if (/quiet/.test(text)) chips.push({ label: "Quiet", type: "vibe", hard: /must have[^.]*quiet/.test(text) });
      if (/under \$250/.test(text)) chips.push({ label: "Under $250/night", type: "budget", value: "250 USD/night", hard: /must have[^.]*under \$250/.test(text) });
      if (/pool/.test(text)) chips.push({ label: "Pool", type: "amenity", hard: /must have[^.]*pool/.test(text) });
      if (/rooftop/.test(text)) chips.push({ label: "Rooftop bar", type: "amenity", hard: false });
      return streamReply(res, { text: "Updating the search.", toolCall: { name: "set_search_constraints", args: { kind: "hotels", constraints: chips, notUnderstood: [] } } });
    }
    if (/quiet|under \$|pool/.test(text) && /hotel/.test(text) && tools.includes("set_search_constraints")) {
      return streamReply(res, {
        text: "Here's how I read that.",
        toolCall: {
          name: "set_search_constraints",
          args: {
            kind: "hotels",
            constraints: [
              { label: "Quiet", type: "vibe", hard: false },
              { label: "Under $250/night", type: "budget", value: "250 USD/night", hard: true },
              { label: "Pool", type: "amenity", hard: false },
            ],
            notUnderstood: ["good vibes"],
          },
        },
      });
    }
    if (/visit|going to|headed/.test(text) && tools.includes("focus_map")) {
      return streamReply(res, { text: "Rome it is! Let me pull up the map.", toolCall: { name: "focus_map", args: { location: "Rome, Italy", reason: "traveler wants to visit" } } });
    }
    if (/hotel/.test(text) && tools.includes("show_hotels")) {
      return streamReply(res, { text: "Here are two well-located stays in Rome.", toolCall: { name: "show_hotels", args: HOTELS } });
    }
    return streamReply(res, { text: "Mock OpenRouter reply: tell me where you'd like to go." });
  });
});

server.listen(PORT, () => console.log(`mock openrouter listening on ${PORT}, log ${LOG}`));
