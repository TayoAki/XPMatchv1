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
  {
    id: "0002_chat_transcripts_and_preferences",
    statements: [
      // Full chat transcripts (AG-UI messages) so reopening a chat survives deploys and restarts.
      // No FK to chats: the transcript can land before the client has named the chat.
      `CREATE TABLE IF NOT EXISTS chat_messages (
        thread_id text PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        messages jsonb NOT NULL DEFAULT '[]'::jsonb,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS chat_messages_user_idx ON chat_messages(user_id, updated_at DESC)`,
      // Preferences learned in conversation, picked in onboarding (dealbreakers) or given as feedback.
      `CREATE TABLE IF NOT EXISTS preferences (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trip_id uuid REFERENCES trips(id) ON DELETE CASCADE,
        domain text NOT NULL DEFAULT 'general',
        polarity text NOT NULL DEFAULT 'like',
        statement text NOT NULL,
        source text NOT NULL DEFAULT 'chat',
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS preferences_user_idx ON preferences(user_id, created_at DESC)`,
    ],
  },
  {
    id: "0003_place_facts_feedback_imports",
    statements: [
      // Shared, 30-day cache of Place Details (reviews, summaries, attributes) for every feature that needs evidence.
      `CREATE TABLE IF NOT EXISTS place_facts (
        place_id text PRIMARY KEY,
        kind text NOT NULL DEFAULT 'attraction',
        name text NOT NULL DEFAULT '',
        facts jsonb NOT NULL DEFAULT '{}'::jsonb,
        fetched_at timestamptz NOT NULL DEFAULT now()
      )`,
      // Reactions to places (loved / fine / not for me) with reasons; one row per user and place.
      `CREATE TABLE IF NOT EXISTS place_feedback (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        place_id text NOT NULL,
        kind text NOT NULL,
        name text NOT NULL,
        destination text,
        place jsonb,
        verdict text NOT NULL,
        reasons text[] NOT NULL DEFAULT '{}',
        note text NOT NULL DEFAULT '',
        trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
        source text NOT NULL DEFAULT 'card',
        score numeric,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, place_id)
      )`,
      `CREATE INDEX IF NOT EXISTS place_feedback_user_idx ON place_feedback(user_id, updated_at DESC)`,
      // Inspiration imports: the places extracted from a link or screenshot.
      `CREATE TABLE IF NOT EXISTS imports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_url text,
        source_title text NOT NULL DEFAULT '',
        site text NOT NULL DEFAULT '',
        destination text,
        place jsonb,
        places jsonb NOT NULL DEFAULT '[]'::jsonb,
        unverified jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS imports_user_idx ON imports(user_id, created_at DESC)`,
      `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS taste jsonb NOT NULL DEFAULT '{}'::jsonb`,
    ],
  },
  {
    id: "0004_reservations",
    statements: [
      // Structured booking details (kind, provider, confirmation code, dates, price, legs) read from confirmations.
      `ALTER TABLE trip_items ADD COLUMN IF NOT EXISTS details jsonb`,
    ],
  },
  {
    id: "0005_beta_polish",
    statements: [
      // The destination a chat's map focused on, so "Jump back in" can show its photo.
      `ALTER TABLE chats ADD COLUMN IF NOT EXISTS destination text`,
      `ALTER TABLE chats ADD COLUMN IF NOT EXISTS place jsonb`,
      // Thumbs up / down on recommendations: did the match score get it right? One row per traveler and place.
      `CREATE TABLE IF NOT EXISTS rec_feedback (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        place_id text NOT NULL,
        kind text NOT NULL,
        name text NOT NULL,
        destination text,
        context text NOT NULL DEFAULT 'chat',
        verdict text NOT NULL,
        score int,
        factors text[] NOT NULL DEFAULT '{}',
        reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, place_id)
      )`,
      `CREATE INDEX IF NOT EXISTS rec_feedback_user_idx ON rec_feedback(user_id, updated_at DESC)`,
      // Bug reports from testers, with an optional downscaled screenshot (base64) and the page context.
      `CREATE TABLE IF NOT EXISTS bug_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        reporter_email text NOT NULL DEFAULT '',
        title text NOT NULL,
        body text NOT NULL DEFAULT '',
        expected text NOT NULL DEFAULT '',
        severity text NOT NULL DEFAULT 'broken',
        page text NOT NULL DEFAULT '',
        thread_id text,
        user_agent text NOT NULL DEFAULT '',
        app_version text NOT NULL DEFAULT '',
        screenshot_type text,
        screenshot_data text,
        status text NOT NULL DEFAULT 'open',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS bug_reports_created_idx ON bug_reports(created_at DESC)`,
    ],
  },
  {
    id: "0006_password_resets",
    statements: [
      // Single-use password reset links issued by an admin (the raw token is only ever in the link).
      `CREATE TABLE IF NOT EXISTS password_resets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash text UNIQUE NOT NULL,
        expires_at timestamptz NOT NULL,
        used_at timestamptz,
        created_by uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS password_resets_user_idx ON password_resets(user_id)`,
    ],
  },
  {
    id: "0007_place_catalog",
    statements: [
      // Every place Google has returned to us, stored once (by place id) and served to everyone.
      `CREATE TABLE IF NOT EXISTS places (
        place_id text PRIMARY KEY,
        kind text NOT NULL,
        name text NOT NULL,
        name_norm text NOT NULL,
        locality text,
        destination_id text,
        lat double precision NOT NULL,
        lng double precision NOT NULL,
        data jsonb NOT NULL,
        google_fetched_at timestamptz NOT NULL DEFAULT now(),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS places_kind_lat_lng_idx ON places(kind, lat, lng)`,
      `CREATE INDEX IF NOT EXISTS places_destination_idx ON places(destination_id)`,
      // What a lookup query (normalized) resolved to, per kind and destination: the durable version of the old in-process search cache.
      `CREATE TABLE IF NOT EXISTS place_aliases (
        alias text NOT NULL,
        kind text NOT NULL,
        destination_id text NOT NULL DEFAULT '',
        place_id text NOT NULL REFERENCES places(place_id) ON DELETE CASCADE,
        source text NOT NULL DEFAULT 'lookup',
        hits int NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (alias, kind, destination_id)
      )`,
      // Ordered results of list searches (Explore, home picks, seeding), shared by every user and process.
      `CREATE TABLE IF NOT EXISTS search_cache (
        key text PRIMARY KEY,
        place_ids jsonb NOT NULL,
        fetched_at timestamptz NOT NULL DEFAULT now()
      )`,
      // Resolved Google photo URLs, so an image is bought once per place rather than once per process.
      `CREATE TABLE IF NOT EXISTS photo_urls (
        key text PRIMARY KEY,
        uri text NOT NULL,
        fetched_at timestamptz NOT NULL DEFAULT now()
      )`,
    ],
  },
  {
    id: "0008_package_events",
    statements: [
      // What travelers do with a package (variant picked, swaps, locks, thumbs, turned into a trip): the learning signal.
      `CREATE TABLE IF NOT EXISTS package_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        destination_id text NOT NULL,
        variant text NOT NULL,
        slot text,
        action text NOT NULL,
        from_place_id text,
        to_place_id text,
        reason text,
        factors jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS package_events_user_idx ON package_events(user_id, created_at DESC)`,
    ],
  },
  {
    id: "0009_reviews",
    statements: [
      // A review is a reaction with words: the text, whether other travelers may read it, and when it was written.
      `ALTER TABLE place_feedback ADD COLUMN IF NOT EXISTS review text NOT NULL DEFAULT ''`,
      `ALTER TABLE place_feedback ADD COLUMN IF NOT EXISTS shared boolean NOT NULL DEFAULT false`,
      `ALTER TABLE place_feedback ADD COLUMN IF NOT EXISTS reviewed_at timestamptz`,
      `CREATE INDEX IF NOT EXISTS place_feedback_place_idx ON place_feedback(place_id, reviewed_at DESC)`,
      // Proof of a visit: a check-in on the spot. Only that it happened (and how far off the reading was) is kept, never the location.
      `CREATE TABLE IF NOT EXISTS place_visits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        place_id text NOT NULL,
        proof text NOT NULL DEFAULT 'checked_in',
        distance_m int,
        created_at timestamptz NOT NULL DEFAULT now()
      )`,
      `CREATE INDEX IF NOT EXISTS place_visits_user_place_idx ON place_visits(user_id, place_id)`,
      `CREATE INDEX IF NOT EXISTS place_visits_place_idx ON place_visits(place_id)`,
    ],
  },
];
