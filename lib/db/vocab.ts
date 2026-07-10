import { getDb } from './sqlite';
import { supabase } from '@/lib/supabase';
import { isoToday } from '@/lib/srs';
import { Platform } from 'react-native';
import type { SrsData } from '@/types';

// ── Read ──────────────────────────────────────────────────────────────────────

type ProgressRow = {
  card_id: string;
  interval: number;
  ease_factor: number;
  due_date: string;
  repetitions: number;
};

export async function getCardProgress(
  userId: string,
  cardId: string,
): Promise<SrsData | null> {
  if (Platform.OS === 'web') return null;
  const db = await getDb();
  const row = await db.getFirstAsync<ProgressRow>(
    `SELECT interval, ease_factor, due_date, repetitions
     FROM vocab_progress WHERE user_id = ? AND card_id = ?`,
    [userId, cardId],
  );
  if (!row) return null;
  return {
    interval: row.interval,
    easeFactor: row.ease_factor,
    dueDate: row.due_date,
    repetitions: row.repetitions,
  };
}

export async function getDueCount(
  userId: string,
  cardIds: string[],
): Promise<number> {
  if (Platform.OS === 'web') return 0;
  if (!cardIds.length) return 0;
  const db = await getDb();
  const today = isoToday();
  const placeholders = cardIds.map(() => '?').join(',');

  const result = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM vocab_progress
     WHERE user_id = ? AND card_id IN (${placeholders}) AND due_date <= ?`,
    [userId, ...cardIds, today],
  );
  return result?.count ?? 0;
}

export type VocabStats = { learned: number; due: number; total: number };

/** learned = reviewed successfully at least once (repetitions >= 1). */
export async function getVocabStats(
  userId: string,
  cardIds: string[],
): Promise<VocabStats> {
  if (Platform.OS === 'web' || !cardIds.length) return { learned: 0, due: 0, total: cardIds.length };
  const db = await getDb();
  const today = isoToday();
  const placeholders = cardIds.map(() => '?').join(',');

  const [learnedRow, dueRow] = await Promise.all([
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM vocab_progress
       WHERE user_id = ? AND card_id IN (${placeholders}) AND repetitions >= 1`,
      [userId, ...cardIds],
    ),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM vocab_progress
       WHERE user_id = ? AND card_id IN (${placeholders}) AND due_date <= ?`,
      [userId, ...cardIds, today],
    ),
  ]);

  return {
    learned: learnedRow?.count ?? 0,
    due: dueRow?.count ?? 0,
    total: cardIds.length,
  };
}

/** Returns due card IDs (overdue + new), capped at 20 per session. */
export async function getDueCardIds(
  userId: string,
  deckId: string,
  allCardIds: string[],
  sessionLimit = 20,
): Promise<string[]> {
  if (Platform.OS === 'web') return allCardIds.slice(0, sessionLimit);
  if (!allCardIds.length) return [];
  const db = await getDb();
  const today = isoToday();
  const placeholders = allCardIds.map(() => '?').join(',');

  const due = await db.getAllAsync<{ card_id: string }>(
    `SELECT card_id FROM vocab_progress
     WHERE user_id = ? AND card_id IN (${placeholders}) AND due_date <= ?
     ORDER BY due_date ASC`,
    [userId, ...allCardIds, today],
  );
  const dueIds = new Set(due.map(r => r.card_id));

  const newIds = allCardIds.filter(id => !dueIds.has(id));
  const combined = [...dueIds, ...newIds].slice(0, sessionLimit);
  return combined;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function upsertCardProgress(
  userId: string,
  cardId: string,
  deckId: string,
  data: SrsData,
): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO vocab_progress
       (card_id, user_id, interval, ease_factor, due_date, repetitions, last_reviewed_at, dirty)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 1)
     ON CONFLICT (card_id, user_id) DO UPDATE SET
       interval = excluded.interval,
       ease_factor = excluded.ease_factor,
       due_date = excluded.due_date,
       repetitions = excluded.repetitions,
       last_reviewed_at = excluded.last_reviewed_at,
       dirty = 1`,
    [userId, cardId, data.interval, data.easeFactor, data.dueDate, data.repetitions],
  );
}

export async function logReview(
  userId: string,
  cardId: string,
  grade: number,
  before: SrsData,
  after: SrsData,
): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO review_log
       (card_id, user_id, grade, interval_before, interval_after, ease_before, ease_after)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [cardId, userId, grade, before.interval, after.interval, before.easeFactor, after.easeFactor],
  );
}

// ── Sync dirty rows to Supabase ───────────────────────────────────────────────

type DirtyRow = {
  card_id: string;
  interval: number;
  ease_factor: number;
  due_date: string;
  repetitions: number;
  last_reviewed_at: string | null;
};

export async function syncDirtyToSupabase(userId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = await getDb();
  const dirty = await db.getAllAsync<DirtyRow>(
    `SELECT card_id, interval, ease_factor, due_date, repetitions, last_reviewed_at
     FROM vocab_progress WHERE user_id = ? AND dirty = 1`,
    [userId],
  );
  if (!dirty.length) return;

  const rows = dirty.map(r => ({
    user_id: userId,
    card_id: r.card_id,
    interval: r.interval,
    ease_factor: r.ease_factor,
    due_date: r.due_date,
    repetitions: r.repetitions,
    last_reviewed_at: r.last_reviewed_at,
  }));

  const { error } = await supabase.from('srs_progress').upsert(rows, {
    onConflict: 'user_id,card_id',
  });

  if (!error) {
    await db.runAsync(
      `UPDATE vocab_progress SET dirty = 0 WHERE user_id = ? AND dirty = 1`,
      [userId],
    );
  }
}
