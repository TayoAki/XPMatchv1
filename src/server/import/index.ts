import { generateObject } from "ai";
import { z } from "zod";
import type { ResolvedPlace } from "@/lib/places/types";
import { IMPORT_MAX_PLACES, screenshotOnlyHost, type ImportRecord, type ImportedPlace, type UnverifiedPlace } from "@/lib/import/types";
import { createOpenRouterModel, getHelperModel, OPENROUTER_PREFIX, resolveModelSpec } from "../model";
import { resolveDestination, resolvePointOfInterest } from "../places";
import { queryAll, queryOne, type Row } from "../db";
import { iso, jsonb } from "../models";
import { fetchPage, ImportError } from "./guard";
import { extractHtml, extractReddit, extractYouTube, MAX_TEXT, normalizeExtraction, siteName, type Candidate, type ExtractedContent } from "./extract";

export { ImportError } from "./guard";

/**
 * Inspiration import: a link (blog, Reddit, YouTube, an article) or a
 * screenshot becomes a list of places. The model only names candidates; each
 * one must resolve through Places with a matching name before it is shown as
 * a card, and everything else is listed as "couldn't verify".
 */

const extractionSchema = z.object({
  destination: z.string().optional().describe("The main city or region the source is about, as 'City, Country'"),
  places: z
    .array(
      z.object({
        name: z.string().describe("The place exactly as it would appear on Google Maps"),
        kind: z.enum(["hotel", "restaurant", "attraction", "destination"]),
        city: z.string().optional().describe("City the place is in, when stated"),
        why: z.string().describe("How the source mentions it, in at most 160 characters"),
      }),
    )
    .max(IMPORT_MAX_PLACES),
});

const SYSTEM = `You extract the places named in travel content so an app can look them up. List every specific hotel, restaurant, bar, cafe, attraction, neighborhood or destination mentioned by name (skip generic mentions like "a pizza place"). For each give the exact name as it appears on Google Maps, its kind (hotel | restaurant | attraction | destination), the city when stated, and a short "why": how the source mentions it. Extract the places the text actually names and never invent any. At most ${IMPORT_MAX_PLACES}.`;

function statusError(status: number): ImportError {
  if (status === 401 || status === 403) return new ImportError(422, "That site blocks automated readers. Take a screenshot of the page and upload it instead.");
  if (status === 404) return new ImportError(422, "That page could not be found (404). Check the link.");
  if (status === 429) return new ImportError(422, "That site is rate-limiting readers right now. Try again later or upload a screenshot.");
  return new ImportError(422, `That site answered with an error (${status}). Try a screenshot instead.`);
}

/** Fetches and reads a source page, choosing the reader by site. */
export async function readSource(url: string): Promise<{ content: ExtractedContent; finalUrl: string; site: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    throw new ImportError(400, "That does not look like a link");
  }
  const blocked = screenshotOnlyHost(parsed.hostname);
  if (blocked) throw new ImportError(422, `${blocked} posts can't be read from a link. Take a screenshot of the post and upload it instead.`);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "reddit.com" || host.endsWith(".reddit.com")) {
    const jsonUrl = `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}.json?raw_json=1`;
    const page = await fetchPage(jsonUrl, { accept: "application/json" });
    if (page.status !== 200) throw statusError(page.status);
    try {
      return { content: extractReddit(JSON.parse(page.body)), finalUrl: page.url, site: "reddit.com" };
    } catch {
      throw new ImportError(422, "Reddit did not return a readable thread. Try the screenshot path.");
    }
  }
  const page = await fetchPage(url);
  if (page.status !== 200) throw statusError(page.status);
  const type = page.contentType.toLowerCase();
  if (!/text\/html|application\/xhtml|text\/plain|application\/json/.test(type)) {
    throw new ImportError(415, "That link is not a web page. Paste the page the content came from, or upload a screenshot.");
  }
  const site = siteName(page.url);
  let content: ExtractedContent;
  if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(host)) content = extractYouTube(page.body);
  else if (/text\/plain|application\/json/.test(type)) content = { title: "", description: "", headings: [], paragraphs: [], items: [], text: page.body.slice(0, MAX_TEXT) };
  else content = extractHtml(page.body);
  return { content, finalUrl: page.url, site };
}

async function extractCandidates(text: string, hint?: string): Promise<{ destination?: string; places: Candidate[] }> {
  const model = getHelperModel();
  if (!model) throw new ImportError(503, "No model is configured, so places cannot be extracted right now.");
  try {
    const { object } = await generateObject({ model, schema: extractionSchema, system: SYSTEM, prompt: `${hint ? `Source: ${hint}\n\n` : ""}${text}`, maxRetries: 1 });
    return normalizeExtraction(object);
  } catch (err) {
    throw new ImportError(502, `The model could not read that content (${err instanceof Error ? err.message.slice(0, 120) : "error"}).`);
  }
}

/** A model that can read images: OpenRouter's gpt-4o-mini by default, overridable with HELPER_VISION_MODEL. */
function visionModel() {
  const spec = resolveModelSpec();
  if (spec.startsWith(OPENROUTER_PREFIX)) return createOpenRouterModel(process.env.HELPER_VISION_MODEL?.trim() || "openai/gpt-4o-mini");
  return getHelperModel();
}

async function extractFromImage(bytes: Uint8Array, mediaType: string): Promise<{ destination?: string; places: Candidate[] }> {
  const model = visionModel();
  if (!model) throw new ImportError(503, "No model is configured, so screenshots cannot be read right now.");
  try {
    const { object } = await generateObject({
      model,
      schema: extractionSchema,
      system: `${SYSTEM} The content is a screenshot or photo (a social post, a saved list, a map, a menu, a note).`,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", image: bytes, mediaType },
            { type: "text", text: "Extract the places shown or named in this image." },
          ],
        },
      ],
      maxRetries: 1,
    });
    return normalizeExtraction(object);
  } catch (err) {
    throw new ImportError(502, `The model could not read that image (${err instanceof Error ? err.message.slice(0, 120) : "error"}).`);
  }
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const STOP = new Set(["the", "a", "an", "of", "de", "di", "da", "del", "della", "la", "le", "il", "lo", "al", "and", "e", "restaurant", "hotel", "cafe", "bar", "trattoria", "osteria", "ristorante"]);

/** A Places result counts as the mentioned place only when the names agree (one contains the other, or most meaningful words overlap). */
export function namesMatch(candidate: string, resolved: string): boolean {
  const a = norm(candidate);
  const b = norm(resolved);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  const ta = new Set(a.split(" ").filter((t) => t.length > 1 && !STOP.has(t)));
  const tb = new Set(b.split(" ").filter((t) => t.length > 1 && !STOP.has(t)));
  if (ta.size === 0 || tb.size === 0) return false;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / Math.min(ta.size, tb.size) >= 0.6;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Resolves every candidate through Places; only name-matching results become cards. */
export async function verifyCandidates(candidates: Candidate[], destinationName?: string): Promise<{ destination: ResolvedPlace | null; places: ImportedPlace[]; unverified: UnverifiedPlace[] }> {
  const destination = destinationName ? await resolveDestination(destinationName).catch(() => null) : null;
  const seen = new Set<string>();
  const results = await mapLimit(candidates, 4, async (c): Promise<{ ok: ImportedPlace } | { fail: UnverifiedPlace }> => {
    const fail = { fail: { name: c.name, kind: c.kind, why: c.why } };
    try {
      const place =
        c.kind === "destination"
          ? await resolveDestination([c.name, c.city].filter(Boolean).join(", "))
          : await resolvePointOfInterest(c.city ? `${c.name}, ${c.city}` : c.name, c.kind, destination);
      if (!place || place.source !== "google" || !namesMatch(c.name, place.name)) return fail;
      return { ok: { name: place.name, kind: c.kind, why: c.why, place } };
    } catch {
      return fail;
    }
  });
  const places: ImportedPlace[] = [];
  const unverified: UnverifiedPlace[] = [];
  for (const r of results) {
    if ("ok" in r) {
      if (seen.has(r.ok.place.id)) continue;
      seen.add(r.ok.place.id);
      places.push(r.ok);
    } else unverified.push(r.fail);
  }
  return { destination, places, unverified };
}

/* --------------------------------- storage --------------------------------- */

interface ImportRow extends Row {
  id: string;
  source_url: string | null;
  source_title: string;
  site: string;
  destination: string | null;
  place: unknown;
  places: unknown;
  unverified: unknown;
  created_at: unknown;
}

const SELECT = "SELECT id, source_url, source_title, site, destination, place, places, unverified, created_at FROM imports";

const mapImport = (r: ImportRow): ImportRecord => {
  const out: ImportRecord = {
    id: r.id,
    sourceTitle: r.source_title,
    site: r.site,
    places: jsonb<ImportedPlace[]>(r.places) ?? [],
    unverified: jsonb<UnverifiedPlace[]>(r.unverified) ?? [],
    createdAt: iso(r.created_at),
  };
  if (r.source_url) out.sourceUrl = r.source_url;
  if (r.destination) out.destination = r.destination;
  const place = jsonb<ResolvedPlace>(r.place);
  if (place) out.place = place;
  return out;
};

export async function loadImports(userId: string): Promise<ImportRecord[]> {
  const rows = await queryAll<ImportRow>(`${SELECT} WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [userId]);
  return rows.map(mapImport);
}

export async function loadImport(userId: string, id: string): Promise<ImportRecord | null> {
  const row = await queryOne<ImportRow>(`${SELECT} WHERE user_id = $1 AND id = $2`, [userId, id]);
  return row ? mapImport(row) : null;
}

/** The same link imported within seven days is served from the traveler's own history (no fetch, no model call). */
async function findRecentImport(userId: string, url: string): Promise<ImportRecord | null> {
  const row = await queryOne<ImportRow>(`${SELECT} WHERE user_id = $1 AND source_url = $2 AND created_at > now() - interval '7 days' ORDER BY created_at DESC LIMIT 1`, [userId, url]);
  return row ? mapImport(row) : null;
}

async function insertImport(userId: string, record: Omit<ImportRecord, "id" | "createdAt">): Promise<ImportRecord> {
  const row = await queryOne<ImportRow>(
    `INSERT INTO imports (user_id, source_url, source_title, site, destination, place, places, unverified)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
     RETURNING id, source_url, source_title, site, destination, place, places, unverified, created_at`,
    [
      userId,
      record.sourceUrl ?? null,
      record.sourceTitle.slice(0, 200),
      record.site.slice(0, 120),
      record.destination ?? null,
      record.place ? JSON.stringify(record.place) : null,
      JSON.stringify(record.places),
      JSON.stringify(record.unverified),
    ],
  );
  if (!row) throw new Error("Could not save the import");
  return mapImport(row);
}

export async function deleteImport(userId: string, id: string): Promise<void> {
  await queryAll("DELETE FROM imports WHERE id = $1 AND user_id = $2", [id, userId]);
}

/* ---------------------------------- flows ---------------------------------- */

export async function importFromUrl(userId: string, input: string): Promise<ImportRecord> {
  const url = input.trim();
  const cached = await findRecentImport(userId, url);
  if (cached) return { ...cached, cached: true };
  const { content, site } = await readSource(url);
  if (content.text.trim().length < 40) throw new ImportError(422, "That page has no readable text. Upload a screenshot of it instead.");
  const extraction = await extractCandidates(content.text, [site, content.title].filter(Boolean).join(" — "));
  if (extraction.places.length === 0) throw new ImportError(422, "No places were named in that page.");
  const verified = await verifyCandidates(extraction.places, extraction.destination);
  return insertImport(userId, {
    sourceUrl: url,
    sourceTitle: content.title || site,
    site,
    destination: verified.destination?.name ?? extraction.destination,
    place: verified.destination ?? undefined,
    places: verified.places,
    unverified: verified.unverified,
  });
}

export async function importFromImage(userId: string, bytes: Uint8Array, mediaType: string, filename?: string): Promise<ImportRecord> {
  const extraction = await extractFromImage(bytes, mediaType);
  if (extraction.places.length === 0) throw new ImportError(422, "No places could be read from that image.");
  const verified = await verifyCandidates(extraction.places, extraction.destination);
  return insertImport(userId, {
    sourceTitle: filename?.trim().slice(0, 120) || "Screenshot",
    site: "screenshot",
    destination: verified.destination?.name ?? extraction.destination,
    place: verified.destination ?? undefined,
    places: verified.places,
    unverified: verified.unverified,
  });
}
