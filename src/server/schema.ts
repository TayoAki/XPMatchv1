/**
 * Idempotent schema migrations, applied in order on first use of the database.
 * Add a new entry (never edit an applied one) to evolve the schema.
 */
export interface Migration {
  id: string;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    id: "0001_accounts_and_content",
    statements: [
      `CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        name text NOT NULL,
        handle text UNIQUE NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash text UNIQUE NOT NULL,
        expires_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)`,
      `CREATE TABLE IF NOT EXISTS profiles (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
        onboarded boolean NOT NULL DEFAULT false,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS trips (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL,
        destination text NOT NULL,
        place jsonb,
        start_date date,
        end_date date,
        travelers int,
        budget_tier text,
        summary text,
        itinerary jsonb NOT NULL DEFAULT '[]'::jsonb,
        preferences text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE TABLE IF NOT EXISTS trip_members (
        trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role text NOT NULL DEFAULT 'editor',
        added_by uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (trip_id, user_id)
      )`,
      `CREATE INDEX IF NOT EXISTS trip_members_user_idx ON trip_members(user_id)`,
      `CREATE TABLE IF NOT EXISTS trip_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        kind text NOT NULL,
        title text NOT NULL,
        note text NOT NULL DEFAULT '',
        url text,
        place jsonb,
        added_by uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS trip_items_trip_idx ON trip_items(trip_id, created_at)`,
      `CREATE TABLE IF NOT EXISTS chats (
        thread_id text PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
        title text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS chats_user_idx ON chats(user_id, updated_at DESC)`,
      `CREATE TABLE IF NOT EXISTS saved_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind text NOT NULL,
        ref_id text,
        title text NOT NULL,
        subtitle text,
        destination text,
        url text,
        place jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS saved_items_user_idx ON saved_items(user_id, created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS guides (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        author_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL,
        destination text NOT NULL,
        place jsonb,
        description text NOT NULL DEFAULT '',
        cover_url text,
        tags text[] NOT NULL DEFAULT '{}',
        published boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS guides_published_idx ON guides(published, updated_at DESC)`,
      `CREATE TABLE IF NOT EXISTS guide_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        guide_id uuid NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
        position int NOT NULL DEFAULT 0,
        place jsonb NOT NULL,
        note text NOT NULL DEFAULT ''
      )`,
      `CREATE INDEX IF NOT EXISTS guide_items_guide_idx ON guide_items(guide_id, position)`,
      `CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind text NOT NULL,
        text text NOT NULL,
        data jsonb NOT NULL DEFAULT '{}'::jsonb,
        read boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at DESC)`,
    ],
  },
];
