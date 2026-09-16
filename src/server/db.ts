import { mkdirSync } from "node:fs";
import path from "node:path";
import { MIGRATIONS } from "./schema";

/**
 * One tiny query interface over two drivers:
 * - `pg` against Postgres when DATABASE_URL is set (Railway in production)
 * - PGlite (embedded Postgres) persisted under .data/pglite for local development
 * Both accept `$1`-style parameters and return plain row objects.
 */
export type Row = Record<string, unknown>;

export interface Db {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  driver: "pg" | "pglite";
}

const globalRef = globalThis as typeof globalThis & { __xpDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!globalRef.__xpDb) {
    globalRef.__xpDb = init().catch((err) => {
      globalRef.__xpDb = undefined;
      throw err;
    });
  }
  return globalRef.__xpDb;
}

async function init(): Promise<Db> {
  const url = process.env.DATABASE_URL?.trim();
  let db: Db;
  if (url) {
    const { Pool } = await import("pg");
    const needsSsl = /sslmode=require/i.test(url) || process.env.PGSSL === "true";
    const pool = new Pool({
      connectionString: url,
      max: 5,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    });
    db = {
      driver: "pg",
      async query<T extends Row>(sql: string, params: unknown[] = []) {
        const result = await pool.query(sql, params);
        return result.rows as T[];
      },
    };
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.PGLITE_DIR?.trim() || path.join(process.cwd(), ".data", "pglite");
    mkdirSync(dir, { recursive: true });
    const pglite = new PGlite(dir);
    await pglite.waitReady;
    db = {
      driver: "pglite",
      async query<T extends Row>(sql: string, params: unknown[] = []) {
        const result = await pglite.query<T>(sql, params);
        return result.rows;
      },
    };
  }
  await migrate(db);
  return db;
}

async function migrate(db: Db) {
  await db.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const applied = new Set((await db.query<{ id: string }>("SELECT id FROM schema_migrations")).map((r) => r.id));
  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    for (const statement of migration.statements) await db.query(statement);
    await db.query("INSERT INTO schema_migrations (id) VALUES ($1)", [migration.id]);
  }
}

/** Convenience for single-row lookups. */
export async function queryOne<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T | null> {
  const db = await getDb();
  const rows = await db.query<T>(sql, params);
  return rows[0] ?? null;
}

export async function queryAll<T extends Row = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  return db.query<T>(sql, params);
}
