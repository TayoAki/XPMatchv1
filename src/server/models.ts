import type { ResolvedPlace } from "@/lib/places/types";
import type {
  ChatSummary,
  SavedItem,
  SavedKind,
  TravelerProfile,
  Trip,
  TripDetail,
  TripItem,
  TripMember,
  UpdateItem,
  UpdateKind,
} from "@/lib/types";
import { DEFAULT_PROFILE } from "@/lib/types";
import { queryAll, queryOne, type Row } from "./db";

/* ----------------------------- helpers ----------------------------- */

export const iso = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString();
  }
  return new Date().toISOString();
};

const dateOnly = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};

export const jsonb = <T>(value: unknown): T | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  return value as T;
};

/* ----------------------------- profile ----------------------------- */

export async function loadProfile(userId: string, userName: string): Promise<TravelerProfile> {
  const row = await queryOne<{ preferences: unknown; onboarded: boolean }>(
    "SELECT preferences, onboarded FROM profiles WHERE user_id = $1",
    [userId],
  );
  const prefs = jsonb<Partial<TravelerProfile>>(row?.preferences) ?? {};
  return { ...DEFAULT_PROFILE, ...prefs, name: prefs.name?.trim() || userName, onboarded: row?.onboarded ?? false };
}

export async function saveProfile(userId: string, profile: TravelerProfile): Promise<void> {
  const { onboarded, ...preferences } = profile;
  await queryAll(
    `INSERT INTO profiles (user_id, preferences, onboarded, updated_at) VALUES ($1, $2::jsonb, $3, now())
     ON CONFLICT (user_id) DO UPDATE SET preferences = EXCLUDED.preferences, onboarded = EXCLUDED.onboarded, updated_at = now()`,
    [userId, JSON.stringify(preferences), onboarded],
  );
  if (profile.name.trim()) await queryAll("UPDATE users SET name = $2 WHERE id = $1", [userId, profile.name.trim()]);
}

/* ------------------------------ saved ------------------------------ */

export interface SavedRow extends Row {
  id: string;
  kind: string;
  ref_id: string | null;
  title: string;
  subtitle: string | null;
  destination: string | null;
  url: string | null;
  place: unknown;
  created_at: unknown;
}

export const mapSaved = (r: SavedRow): SavedItem => ({
  id: r.id,
  kind: r.kind as SavedKind,
  title: r.title,
  subtitle: r.subtitle ?? undefined,
  destination: r.destination ?? undefined,
  url: r.url ?? undefined,
  refId: r.ref_id ?? undefined,
  place: jsonb<ResolvedPlace>(r.place),
  savedAt: iso(r.created_at),
});

export async function loadSaved(userId: string): Promise<SavedItem[]> {
  const rows = await queryAll<SavedRow>(
    "SELECT id, kind, ref_id, title, subtitle, destination, url, place, created_at FROM saved_items WHERE user_id = $1 ORDER BY created_at DESC",
    [userId],
  );
  return rows.map(mapSaved);
}

export async function insertSaved(
  userId: string,
  item: Omit<SavedItem, "id" | "savedAt">,
): Promise<SavedItem> {
  const refId = item.refId ?? item.place?.id ?? null;
  const existing = refId
    ? await queryOne<SavedRow>(
        "SELECT id, kind, ref_id, title, subtitle, destination, url, place, created_at FROM saved_items WHERE user_id = $1 AND kind = $2 AND ref_id = $3",
        [userId, item.kind, refId],
      )
    : await queryOne<SavedRow>(
        "SELECT id, kind, ref_id, title, subtitle, destination, url, place, created_at FROM saved_items WHERE user_id = $1 AND kind = $2 AND ref_id IS NULL AND lower(title) = lower($3)",
        [userId, item.kind, item.title],
      );
  if (existing) return mapSaved(existing);
  const row = await queryOne<SavedRow>(
    `INSERT INTO saved_items (user_id, kind, ref_id, title, subtitle, destination, url, place)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING id, kind, ref_id, title, subtitle, destination, url, place, created_at`,
    [
      userId,
      item.kind,
      refId,
      item.title,
      item.subtitle ?? null,
      item.destination ?? null,
      item.url ?? null,
      item.place ? JSON.stringify(item.place) : null,
    ],
  );
  if (!row) throw new Error("Could not save item");
  return mapSaved(row);
}

/* ------------------------------ chats ------------------------------ */

interface ChatRow extends Row {
  thread_id: string;
  title: string;
  trip_id: string | null;
  created_at: unknown;
  updated_at: unknown;
}

const mapChat = (r: ChatRow): ChatSummary => ({
  id: r.thread_id,
  title: r.title,
  tripId: r.trip_id ?? undefined,
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

export async function loadChats(userId: string): Promise<ChatSummary[]> {
  const rows = await queryAll<ChatRow>(
    "SELECT thread_id, title, trip_id, created_at, updated_at FROM chats WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 200",
    [userId],
  );
  return rows.map(mapChat);
}

export async function upsertChat(userId: string, threadId: string, title: string, tripId?: string | null): Promise<ChatSummary> {
  const row = await queryOne<ChatRow>(
    `INSERT INTO chats (thread_id, user_id, title, trip_id) VALUES ($1, $2, $3, $4)
     ON CONFLICT (thread_id) DO UPDATE SET title = EXCLUDED.title, trip_id = COALESCE(EXCLUDED.trip_id, chats.trip_id), updated_at = now()
     WHERE chats.user_id = $2
     RETURNING thread_id, title, trip_id, created_at, updated_at`,
    [threadId, userId, title, tripId ?? null],
  );
  if (!row) throw new Error("Chat belongs to another user");
  return mapChat(row);
}

/* -------------------------- notifications -------------------------- */

interface NotificationRow extends Row {
  id: string;
  kind: string;
  text: string;
  data: unknown;
  read: boolean;
  created_at: unknown;
}

export async function loadNotifications(userId: string): Promise<UpdateItem[]> {
  const rows = await queryAll<NotificationRow>(
    "SELECT id, kind, text, data, read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100",
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as UpdateKind,
    text: r.text,
    data: jsonb<Record<string, unknown>>(r.data),
    read: r.read,
    at: iso(r.created_at),
  }));
}

export async function notify(userId: string, kind: UpdateKind, text: string, data: Record<string, unknown> = {}) {
  await queryAll("INSERT INTO notifications (user_id, kind, text, data) VALUES ($1, $2, $3, $4::jsonb)", [
    userId,
    kind,
    text,
    JSON.stringify(data),
  ]);
}

/* ------------------------------ trips ------------------------------ */

interface TripRow extends Row {
  id: string;
  owner_id: string;
  role: string;
  title: string;
  destination: string;
  place: unknown;
  start_date: unknown;
  end_date: unknown;
  travelers: number | null;
  budget_tier: string | null;
  summary: string | null;
  itinerary: unknown;
  preferences: string;
  member_count: number | string;
  created_at: unknown;
  updated_at: unknown;
}

const TRIP_SELECT = `
  SELECT t.id, t.owner_id, tm.role, t.title, t.destination, t.place, t.start_date::text AS start_date,
         t.end_date::text AS end_date, t.travelers, t.budget_tier, t.summary, t.itinerary, t.preferences,
         (SELECT count(*) FROM trip_members m WHERE m.trip_id = t.id) AS member_count,
         t.created_at, t.updated_at
    FROM trips t
    JOIN trip_members tm ON tm.trip_id = t.id AND tm.user_id = $1`;

const mapTrip = (r: TripRow): Trip => ({
  id: r.id,
  ownerId: r.owner_id,
  role: (r.role as Trip["role"]) ?? "viewer",
  title: r.title,
  destination: r.destination,
  place: jsonb<ResolvedPlace>(r.place),
  startDate: dateOnly(r.start_date),
  endDate: dateOnly(r.end_date),
  travelers: r.travelers ?? undefined,
  budgetTier: r.budget_tier ?? undefined,
  summary: r.summary ?? undefined,
  itinerary: jsonb<Trip["itinerary"]>(r.itinerary) ?? [],
  preferences: r.preferences ?? "",
  memberCount: Number(r.member_count ?? 1),
  createdAt: iso(r.created_at),
  updatedAt: iso(r.updated_at),
});

export async function loadTripsForUser(userId: string): Promise<Trip[]> {
  const rows = await queryAll<TripRow>(`${TRIP_SELECT} ORDER BY t.start_date NULLS LAST, t.created_at DESC`, [userId]);
  return rows.map(mapTrip);
}

export async function loadTrip(tripId: string, userId: string): Promise<Trip | null> {
  const row = await queryOne<TripRow>(`${TRIP_SELECT} WHERE t.id = $2`, [userId, tripId]);
  return row ? mapTrip(row) : null;
}

interface MemberRow extends Row {
  user_id: string;
  name: string;
  handle: string;
  email: string;
  role: string;
}

interface ItemRow extends Row {
  id: string;
  kind: string;
  title: string;
  note: string;
  url: string | null;
  place: unknown;
  added_by: string | null;
  created_at: unknown;
}

export async function loadTripDetail(tripId: string, userId: string): Promise<TripDetail | null> {
  const trip = await loadTrip(tripId, userId);
  if (!trip) return null;
  const [members, items, chats] = await Promise.all([
    queryAll<MemberRow>(
      `SELECT u.id AS user_id, u.name, u.handle, u.email, tm.role FROM trip_members tm JOIN users u ON u.id = tm.user_id
        WHERE tm.trip_id = $1 ORDER BY tm.created_at`,
      [tripId],
    ),
    queryAll<ItemRow>(
      "SELECT id, kind, title, note, url, place, added_by, created_at FROM trip_items WHERE trip_id = $1 ORDER BY created_at DESC",
      [tripId],
    ),
    queryAll<ChatRow>(
      "SELECT thread_id, title, trip_id, created_at, updated_at FROM chats WHERE trip_id = $1 ORDER BY updated_at DESC",
      [tripId],
    ),
  ]);
  const toMember = (m: MemberRow): TripMember => ({ userId: m.user_id, name: m.name, handle: m.handle, email: m.email, role: m.role as TripMember["role"] });
  const toItem = (i: ItemRow): TripItem => ({
    id: i.id,
    kind: i.kind as TripItem["kind"],
    title: i.title,
    note: i.note,
    url: i.url ?? undefined,
    place: jsonb<ResolvedPlace>(i.place),
    addedBy: i.added_by ?? undefined,
    createdAt: iso(i.created_at),
  });
  return { ...trip, members: members.map(toMember), items: items.map(toItem), chats: chats.map(mapChat) };
}

export async function tripMemberIds(tripId: string): Promise<string[]> {
  const rows = await queryAll<{ user_id: string }>("SELECT user_id FROM trip_members WHERE trip_id = $1", [tripId]);
  return rows.map((r) => r.user_id);
}
