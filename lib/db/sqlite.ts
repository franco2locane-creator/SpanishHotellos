import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Offline SQLite schema — vocab SRS state
//
// SYNC STRATEGY
// ─────────────────────────────────────────────────────────────────────────────
// SQLite is the *source of truth* for SRS state while the user is on-device.
// Supabase (srs_progress table) is the cloud backup / cross-device restore.
//
// Sync runs in two directions:
//
//   1. Push (local → cloud) — after every review session, any rows with
//      dirty = 1 are upserted to public.srs_progress via the Supabase client.
//      Uses ON CONFLICT (user_id, card_id) DO UPDATE so partial syncs are safe.
//      dirty is cleared to 0 on successful push.
//
//   2. Pull (cloud → local) — on first launch after login, or after a
//      fresh install, fetch all srs_progress rows for the user and INSERT OR
//      REPLACE into the local table. This restores state after reinstall or
//      on a new device.
//
// Conflict resolution: last-write-wins on due_date. The push payload includes
// last_reviewed_at so the Supabase UPSERT can compare timestamps if needed.
//
// Reviews are never lost because the app queues push retries (dirty flag) and
// the SRS algorithm is deterministic given the same inputs.
// ─────────────────────────────────────────────────────────────────────────────

export const DB_NAME = 'spanish4hoteleros.db';

const CREATE_VOCAB_PROGRESS = `
  CREATE TABLE IF NOT EXISTS vocab_progress (
    card_id           TEXT    NOT NULL,
    user_id           TEXT    NOT NULL,
    interval          INTEGER NOT NULL DEFAULT 1,
    ease_factor       REAL    NOT NULL DEFAULT 2.5,
    due_date          TEXT    NOT NULL DEFAULT (date('now')),
    repetitions       INTEGER NOT NULL DEFAULT 0,
    last_reviewed_at  TEXT,
    dirty             INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (card_id, user_id)
  );
`;

const CREATE_REVIEW_LOG = `
  CREATE TABLE IF NOT EXISTS review_log (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id          TEXT    NOT NULL,
    user_id          TEXT    NOT NULL,
    reviewed_at      TEXT    NOT NULL DEFAULT (datetime('now')),
    grade            INTEGER NOT NULL CHECK (grade BETWEEN 0 AND 5),
    interval_before  INTEGER NOT NULL,
    interval_after   INTEGER NOT NULL,
    ease_before      REAL    NOT NULL,
    ease_after       REAL    NOT NULL
  );
`;

// Index to quickly fetch all cards due today for a user.
const CREATE_DUE_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_vocab_progress_due
    ON vocab_progress (user_id, due_date);
`;

// Index to find unsynced rows for the push loop.
const CREATE_DIRTY_INDEX = `
  CREATE INDEX IF NOT EXISTS idx_vocab_progress_dirty
    ON vocab_progress (user_id, dirty)
    WHERE dirty = 1;
`;

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') throw new Error('SQLite not available on web');
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync('PRAGMA journal_mode = WAL;');
  await _db.execAsync(CREATE_VOCAB_PROGRESS);
  await _db.execAsync(CREATE_REVIEW_LOG);
  await _db.execAsync(CREATE_DUE_INDEX);
  await _db.execAsync(CREATE_DIRTY_INDEX);
  return _db;
}
