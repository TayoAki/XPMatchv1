import type { PlaceKind } from "@/lib/places/types";
import { IMPORT_MAX_PLACES } from "@/lib/import/types";

/**
 * Turns a fetched page into the text the extraction model reads: title,
 * social metadata, headings, paragraphs and list items, with scripts, styles
 * and chrome removed. Reddit and YouTube have their own shapes.
 */

export const MAX_TEXT = 15_000;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#x27": "'", "#x2F": "/", "#47": "/" };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    const key = code.toLowerCase();
    if (ENTITIES[key] !== undefined) return ENTITIES[key];
    if (key.startsWith("#x")) return String.fromCodePoint(parseInt(key.slice(2), 16));
    if (key.startsWith("#")) return String.fromCodePoint(parseInt(key.slice(1), 10));
    return m;
  });
}

const collapse = (s: string) => decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

function stripNoise(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, " ");
}

function meta(html: string, property: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  if (!tag) return "";
  const content = tag.match(/content=["']([^"']*)["']/i)?.[1] ?? "";
  return decodeEntities(content).trim();
}

function allMatches(html: string, re: RegExp): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(re)) {
    const text = collapse(m[1]);
    if (text) out.push(text);
  }
  return out;
}

export interface ExtractedContent {
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  items: string[];
  /** The text handed to the model, capped at MAX_TEXT. */
  text: string;
}

export function extractHtml(html: string): ExtractedContent {
  const clean = stripNoise(html);
  const title = collapse(clean.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "") || meta(html, "og:title");
  const description = meta(html, "og:description") || meta(html, "description");
  const headings = allMatches(clean, /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi).slice(0, 60);
  const paragraphs = allMatches(clean, /<p[^>]*>([\s\S]*?)<\/p>/gi).filter((p) => p.length > 20).slice(0, 300);
  const items = allMatches(clean, /<li[^>]*>([\s\S]*?)<\/li>/gi).filter((i) => i.length > 3).slice(0, 300);
  const text = [title, description, ...headings, ...paragraphs, ...items].filter(Boolean).join("\n").slice(0, MAX_TEXT);
  return { title, description, headings, paragraphs, items, text };
}

interface RedditNode {
  data?: { title?: string; selftext?: string; body?: string; children?: RedditNode[]; replies?: RedditNode | string; score?: number };
  kind?: string;
}

/** Reddit's public JSON form: the post, then top-level comments by score. */
export function extractReddit(json: unknown): ExtractedContent {
  const listing = Array.isArray(json) ? (json as RedditNode[]) : [];
  const post = listing[0]?.data?.children?.[0]?.data;
  const title = post?.title?.trim() ?? "";
  const body = post?.selftext?.trim() ?? "";
  const comments = (listing[1]?.data?.children ?? [])
    .map((c) => c.data)
    .filter((d): d is NonNullable<RedditNode["data"]> => !!d && typeof d.body === "string")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .map((d) => (d.body ?? "").trim())
    .filter(Boolean)
    .slice(0, 40);
  const paragraphs = [body, ...comments].filter(Boolean);
  const text = [title, ...paragraphs].join("\n").slice(0, MAX_TEXT);
  return { title, description: "", headings: [], paragraphs, items: [], text };
}

/** YouTube pages: title and description from metadata plus the player's short description when present. */
export function extractYouTube(html: string): ExtractedContent {
  const base = extractHtml(html);
  const short = html.match(/"shortDescription":"((?:[^"\\]|\\.)*)"/)?.[1];
  const description = short ? JSON.parse(`"${short}"`) : base.description;
  const text = [base.title, description].filter(Boolean).join("\n").slice(0, MAX_TEXT);
  return { ...base, description, text };
}

export function siteName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/* ------------------------------ model output ------------------------------ */

const KINDS: PlaceKind[] = ["hotel", "restaurant", "attraction", "destination"];

export interface RawPlace {
  name?: unknown;
  kind?: unknown;
  city?: unknown;
  why?: unknown;
}

export interface Candidate {
  name: string;
  kind: PlaceKind;
  city?: string;
  why: string;
}

/** Cleans what the model returned: real names only, known kinds, short reasons, no duplicates, at most 20. */
export function normalizeExtraction(raw: { destination?: unknown; places?: unknown }): { destination?: string; places: Candidate[] } {
  const seen = new Set<string>();
  const places: Candidate[] = [];
  for (const entry of Array.isArray(raw.places) ? (raw.places as RawPlace[]) : []) {
    const name = typeof entry?.name === "string" ? entry.name.trim().slice(0, 120) : "";
    if (!name || name.length < 2) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const kind = KINDS.includes(entry.kind as PlaceKind) ? (entry.kind as PlaceKind) : "attraction";
    const city = typeof entry.city === "string" && entry.city.trim() ? entry.city.trim().slice(0, 80) : undefined;
    const why = typeof entry.why === "string" ? entry.why.trim().slice(0, 160) : "";
    places.push({ name, kind, city, why });
    if (places.length >= IMPORT_MAX_PLACES) break;
  }
  const destination = typeof raw.destination === "string" && raw.destination.trim() ? raw.destination.trim().slice(0, 120) : undefined;
  return { destination, places };
}
