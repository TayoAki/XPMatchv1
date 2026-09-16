import { z } from "zod";
import type { ResolvedPlace } from "@/lib/places/types";
import type { Guide, GuideDetail, GuideItem, SavedItem } from "@/lib/types";
import type { SessionUser } from "./auth";
import { queryAll, queryOne, type Row } from "./db";
import { iso, jsonb, mapSaved, notify, type SavedRow } from "./models";

/* ------------------------------ schemas ------------------------------ */

export const guidePlaceSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(["destination", "hotel", "restaurant", "attraction"]),
    lat: z.number(),
    lng: z.number(),
    photos: z.array(z.string()).default([]),
    source: z.enum(["google", "estimate"]).default("google"),
  })
  .passthrough();

export const guideItemSchema = z.object({
  place: guidePlaceSchema,
  note: z.string().max(500).default(""),
});

export const guideBodySchema = z.object({
  title: z.string().trim().min(1, "Give the guide a title").max(120),
  destination: z.string().trim().min(1, "Where is this guide about?").max(120),
  description: z.string().max(4000).default(""),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  published: z.boolean().default(false),
  coverUrl: z.string().max(2000).nullable().optional(),
  items: z.array(guideItemSchema).max(40).default([]),
});

export type GuideBody = z.output<typeof guideBodySchema>;

/** A place + note as accepted by the writers (zod output and stored items both fit). */
export interface GuideItemInput {
  place: { photos?: string[] };
  note: string;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ------------------------------ helpers ------------------------------ */

function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    const inner = value.replace(/^\{/, "").replace(/\}$/, "");
    return inner ? inner.split(",").map((t) => t.trim().replace(/^"|"$/g, "")) : [];
  }
  return [];
}

/** Postgres array literal, safe for both drivers. */
function toPgArray(values: string[]): string {
  return `{${values.map((v) => `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/* ------------------------------- rows -------------------------------- */

interface GuideRow extends Row {
  id: string;
  author_id: string;
  author_name: string;
  author_handle: string;
  title: string;
  destination: string;
  place: unknown;
  description: string | null;
  cover_url: string | null;
  tags: unknown;
  published: boolean;
  item_count: number | string;
  save_count: number | string;
  saved_by_me: boolean;
  created_at: unknown;
  updated_at: unknown;
}

interface GuideItemRow extends Row {
  id: string;
  position: number;
  place: unknown;
  note: string;
}

const GUIDE_SELECT = `
  SELECT g.id, g.author_id, u.name AS author_name, u.handle AS author_handle, g.title, g.destination, g.place,
         g.description, g.cover_url, g.tags, g.published, g.created_at, g.updated_at,
         (SELECT count(*) FROM guide_items gi WHERE gi.guide_id = g.id) AS item_count,
         (SELECT count(*) FROM saved_items s WHERE s.kind = 'guide' AND s.ref_id = g.id::text) AS save_count,
         EXISTS (SELECT 1 FROM saved_items s2 WHERE s2.kind = 'guide' AND s2.ref_id = g.id::text AND s2.user_id = $1) AS saved_by_me
    FROM guides g
    JOIN users u ON u.id = g.author_id`;

const mapGuide = (r: GuideRow): Guide => ({
  id: r.id,
  authorId: r.author_id,
  authorName: r.author_name,
  authorHandle: r.author_handle,
  title: r.title,
  destination: r.destination,
  place: jsonb<ResolvedPlace>(r.place),
  description: r.description ?? "",
  coverUrl: r.cover_url ?? undefined,
  tags: parseTags(r.tags),
  published: !!r.published,
  itemCount: Number(r.item_count ?? 0),
  saveCount: Number(r.save_count ?? 0),
  savedByMe: !!r.saved_by_me,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

/* ------------------------------- reads ------------------------------- */

export interface GuideQuery {
  q?: string;
  /** Only the viewer's own guides, drafts included. */
  mine?: boolean;
  /** Order by distance to a point and drop guides farther than radiusKm (default 150). */
  near?: { lat: number; lng: number; radiusKm?: number };
  limit?: number;
}

export async function loadGuides(viewerId: string, opts: GuideQuery = {}): Promise<Guide[]> {
  const where: string[] = [opts.mine ? "g.author_id = $1" : "(g.published OR g.author_id = $1)"];
  const params: unknown[] = [viewerId];
  const q = opts.q?.trim();
  if (q) {
    params.push(`%${q}%`);
    const p = `$${params.length}`;
    where.push(`(g.title ILIKE ${p} OR g.destination ILIKE ${p} OR g.description ILIKE ${p})`);
  }
  const limit = Math.min(Math.max(opts.limit ?? 60, 1), 200);
  const rows = await queryAll<GuideRow>(
    `${GUIDE_SELECT} WHERE ${where.join(" AND ")} ORDER BY g.updated_at DESC LIMIT ${opts.near ? 500 : limit}`,
    params,
  );
  let guides = rows.map(mapGuide);
  if (opts.near) {
    const { lat, lng, radiusKm = 150 } = opts.near;
    guides = guides
      .map((g) => ({ g, d: g.place ? haversineKm(lat, lng, g.place.lat, g.place.lng) : Number.POSITIVE_INFINITY }))
      .filter((x) => x.d <= radiusKm)
      .sort((a, b) => a.d - b.d)
      .slice(0, limit)
      .map((x) => x.g);
  }
  return guides;
}

export async function loadGuide(id: string, viewerId: string): Promise<GuideDetail | null> {
  if (!UUID_RE.test(id)) return null;
  const row = await queryOne<GuideRow>(`${GUIDE_SELECT} WHERE g.id = $2 AND (g.published OR g.author_id = $1)`, [viewerId, id]);
  if (!row) return null;
  const items = await queryAll<GuideItemRow>("SELECT id, position, place, note FROM guide_items WHERE guide_id = $1 ORDER BY position, id", [id]);
  const toItem = (i: GuideItemRow): GuideItem | null => {
    const place = jsonb<ResolvedPlace>(i.place);
    return place ? { id: i.id, position: i.position, place, note: i.note ?? "" } : null;
  };
  return { ...mapGuide(row), items: items.map(toItem).filter((i): i is GuideItem => !!i) };
}

/* ------------------------------ writes ------------------------------- */

interface GuideWrite {
  title: string;
  destination: string;
  place: ResolvedPlace | null;
  description: string;
  coverUrl: string | null;
  tags: string[];
  published: boolean;
}

export async function createGuide(authorId: string, input: GuideWrite, items: GuideItemInput[]): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO guides (author_id, title, destination, place, description, cover_url, tags, published)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::text[], $8) RETURNING id`,
    [authorId, input.title, input.destination, input.place ? JSON.stringify(input.place) : null, input.description, input.coverUrl, toPgArray(input.tags), input.published],
  );
  if (!row) throw new Error("Could not create guide");
  await replaceGuideItems(row.id, items);
  return row.id;
}

export async function updateGuide(id: string, patch: Partial<GuideWrite>): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [id];
  const add = (column: string, value: unknown, cast = "") => {
    values.push(value);
    sets.push(`${column} = $${values.length}${cast}`);
  };
  if (patch.title !== undefined) add("title", patch.title);
  if (patch.destination !== undefined) add("destination", patch.destination);
  if (patch.place !== undefined) add("place", patch.place ? JSON.stringify(patch.place) : null, "::jsonb");
  if (patch.description !== undefined) add("description", patch.description);
  if (patch.coverUrl !== undefined) add("cover_url", patch.coverUrl);
  if (patch.tags !== undefined) add("tags", toPgArray(patch.tags), "::text[]");
  if (patch.published !== undefined) add("published", patch.published);
  await queryAll(`UPDATE guides SET ${[...sets, "updated_at = now()"].join(", ")} WHERE id = $1`, values);
}

export async function replaceGuideItems(guideId: string, items: GuideItemInput[]): Promise<void> {
  await queryAll("DELETE FROM guide_items WHERE guide_id = $1", [guideId]);
  for (const [index, item] of items.entries()) {
    await queryAll("INSERT INTO guide_items (guide_id, position, place, note) VALUES ($1, $2, $3::jsonb, $4)", [
      guideId,
      index,
      JSON.stringify(item.place),
      item.note,
    ]);
  }
}

export async function deleteGuide(id: string): Promise<void> {
  await queryAll("DELETE FROM saved_items WHERE kind = 'guide' AND ref_id = $1", [id]);
  await queryAll("DELETE FROM guides WHERE id = $1", [id]);
}

/** Saves or unsaves a guide for a user; saving notifies the author. */
export async function setGuideSaved(user: SessionUser, guide: Guide, saved: boolean): Promise<SavedItem | null> {
  const SAVED_COLUMNS = "id, kind, ref_id, title, subtitle, destination, url, place, created_at";
  if (!saved) {
    await queryAll("DELETE FROM saved_items WHERE user_id = $1 AND kind = 'guide' AND ref_id = $2", [user.id, guide.id]);
    return null;
  }
  const existing = await queryOne<SavedRow>(`SELECT ${SAVED_COLUMNS} FROM saved_items WHERE user_id = $1 AND kind = 'guide' AND ref_id = $2`, [user.id, guide.id]);
  if (existing) return mapSaved(existing);
  const row = await queryOne<SavedRow>(
    `INSERT INTO saved_items (user_id, kind, ref_id, title, subtitle, destination, url, place)
     VALUES ($1, 'guide', $2, $3, $4, $5, $6, $7::jsonb) RETURNING ${SAVED_COLUMNS}`,
    [
      user.id,
      guide.id,
      guide.title,
      `${guide.destination} · by @${guide.authorHandle}`,
      guide.destination,
      `/guides/${guide.id}`,
      guide.place ? JSON.stringify(guide.place) : null,
    ],
  );
  if (!row) throw new Error("Could not save guide");
  if (guide.authorId !== user.id) {
    await notify(guide.authorId, "guide_saved", `${user.name} saved your guide "${guide.title}".`, { guideId: guide.id, by: user.handle });
  }
  return mapSaved(row);
}

/** Cover photo: the destination's first photo, else the first place photo. */
export function pickCover(place: ResolvedPlace | null, items: GuideItemInput[]): string | null {
  return place?.photos?.[0] ?? items.find((i) => i.place.photos?.[0])?.place.photos?.[0] ?? null;
}
