import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { SCENARIO_CATALOG, scenariosForLevel } from './scenarios/catalog';
import type { CourseLevel, Department, RubricCriterion } from '@/types';

// ── Date helpers ──────────────────────────────────────────────────────────────
// Re-exported from lib/examDate.ts (kept dependency-free there) so existing
// imports of getDaysUntilExam/isFinalWeek from '@/lib/today' keep working.

export { getDaysUntilExam, isFinalWeek } from './examDate';
import { getWeekDates } from './examDate';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayISO(): string {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

// ── Streak ────────────────────────────────────────────────────────────────────

const STREAK_KEY = '@sp4h_streak';
const LAST_DATE_KEY = '@sp4h_last_date';

export async function getStreak(): Promise<number> {
  const [streak, lastDate] = await Promise.all([
    AsyncStorage.getItem(STREAK_KEY),
    AsyncStorage.getItem(LAST_DATE_KEY),
  ]);
  const s = parseInt(streak ?? '0', 10);
  return lastDate === todayISO() || lastDate === yesterdayISO() ? s : 0;
}

export async function recordActivity(): Promise<number> {
  const today = todayISO();
  const [streak, lastDate] = await Promise.all([
    AsyncStorage.getItem(STREAK_KEY),
    AsyncStorage.getItem(LAST_DATE_KEY),
  ]);
  if (lastDate === today) return parseInt(streak ?? '0', 10);
  const s = parseInt(streak ?? '0', 10);
  const newStreak = lastDate === yesterdayISO() ? s + 1 : 1;
  await Promise.all([
    AsyncStorage.setItem(STREAK_KEY, String(newStreak)),
    AsyncStorage.setItem(LAST_DATE_KEY, today),
  ]);
  return newStreak;
}

// ── Tile check state ──────────────────────────────────────────────────────────

const tileKey = () => `@sp4h_tiles_${todayISO()}`;

export async function getTodayChecked(): Promise<string[]> {
  const data = await AsyncStorage.getItem(tileKey());
  return data ? JSON.parse(data) : [];
}

export async function toggleTile(id: string): Promise<string[]> {
  const current = await getTodayChecked();
  const idx = current.indexOf(id);
  let next: string[];
  if (idx >= 0) {
    next = current.filter(x => x !== id);
  } else {
    next = [...current, id];
    // Streak counts a full guided-session completion (all 3 steps), not
    // just starting one — matches the guided flow, where a skipped step
    // never gets added here at all.
    if (next.length >= 3) {
      await recordActivity();
      await recordDayCompleted();
    }
  }
  await AsyncStorage.setItem(tileKey(), JSON.stringify(next));
  return next;
}

// ── Completion history (7-day dot row) ─────────────────────────────────────────

const HISTORY_KEY = '@sp4h_completion_history';
const HISTORY_MAX_ENTRIES = 60;

async function recordDayCompleted(): Promise<void> {
  const today = todayISO();
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  const history: string[] = raw ? JSON.parse(raw) : [];
  if (!history.includes(today)) {
    history.push(today);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-HISTORY_MAX_ENTRIES)));
  }
}

export type WeekDot = { dateISO: string; completed: boolean; isToday: boolean };

/** Monday-first completion dots for the current calendar week. */
export async function getWeekCompletionDots(): Promise<WeekDot[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  const history = new Set<string>(raw ? JSON.parse(raw) : []);
  const todayStr = todayISO();
  return getWeekDates().map(dateISO => ({
    dateISO,
    completed: history.has(dateISO),
    isToday: dateISO === todayStr,
  }));
}

// ── Readiness score history (for the Progress tab's "+2 this week" delta) ──────

const READINESS_HISTORY_KEY = '@sp4h_readiness_history';
const READINESS_HISTORY_MAX_ENTRIES = 60;
const DELTA_WINDOW_DAYS = 7;

type ReadinessSnapshot = { dateISO: string; score: number };

/** Records today's composite readiness score — dedups by day (last write today wins). */
export async function recordReadinessSnapshot(score: number): Promise<void> {
  const today = todayISO();
  const raw = await AsyncStorage.getItem(READINESS_HISTORY_KEY);
  const history: ReadinessSnapshot[] = raw ? JSON.parse(raw) : [];
  const withoutToday = history.filter(h => h.dateISO !== today);
  const next = [...withoutToday, { dateISO: today, score }].slice(-READINESS_HISTORY_MAX_ENTRIES);
  await AsyncStorage.setItem(READINESS_HISTORY_KEY, JSON.stringify(next));
}

/** Delta vs. the closest snapshot at least 7 days old — null if there isn't one yet. */
export async function getReadinessSevenDayDelta(currentScore: number): Promise<number | null> {
  const raw = await AsyncStorage.getItem(READINESS_HISTORY_KEY);
  const history: ReadinessSnapshot[] = raw ? JSON.parse(raw) : [];
  if (!history.length) return null;

  const cutoff = Date.now() - DELTA_WINDOW_DAYS * 86400000;
  const eligible = history.filter(h => Date.parse(h.dateISO) <= cutoff);
  if (!eligible.length) return null;

  // Closest to (but not after) the cutoff — the most relevant "week ago" baseline.
  const baseline = eligible.reduce((best, h) => (Date.parse(h.dateISO) > Date.parse(best.dateISO) ? h : best));
  return currentScore - baseline.score;
}

// ── Study plan data ───────────────────────────────────────────────────────────

type AttemptRow = {
  scenario_id: string;
  total_score: number;
  format: string;
  scores: Record<string, number>;
};

export type StudyPlanData = {
  weakestDept: Department;
  weakestCriterion: RubricCriterion;
  lowestScenarioId: string | null;
  weakestScenarioId: string | null;
  /** All departments seen in the user's history, weakest average score first. */
  rankedWeakDepts: Department[];
  /** All 5 rubric criteria, weakest average score first. */
  rankedCriteria: RubricCriterion[];
};

export async function getStudyPlanData(userId: string, level: CourseLevel = 'basic'): Promise<StudyPlanData> {
  const { data } = await supabase
    .from('exam_attempts')
    .select('scenario_id, total_score, format, scores')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(30);

  const rows = (data ?? []) as AttemptRow[];
  const availableScenarios = scenariosForLevel(level);

  // Departments ranked weakest-first
  const deptScores: Record<string, number[]> = {};
  for (const r of rows) {
    const dept = SCENARIO_CATALOG.find(s => s.id === r.scenario_id)?.department ?? 'front_office';
    (deptScores[dept] ??= []).push(r.total_score);
  }
  const deptAvgs = Object.entries(deptScores).map(([dept, scores]) => ({
    dept: dept as Department,
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  }));
  deptAvgs.sort((a, b) => a.avg - b.avg);
  const rankedWeakDepts = deptAvgs.map(d => d.dept);
  const weakestDept: Department = rankedWeakDepts[0] ?? 'front_office';

  // Criteria ranked weakest-first
  const critSums: Record<string, number[]> = {};
  for (const r of rows) {
    for (const [k, v] of Object.entries(r.scores ?? {})) {
      (critSums[k] ??= []).push(v);
    }
  }
  const allCriteria: RubricCriterion[] = ['fluency', 'vocabulary', 'grammar', 'pronunciation', 'content'];
  const critAvgs = allCriteria.map(k => {
    const vals = critSums[k] ?? [];
    return { key: k, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : Infinity };
  });
  critAvgs.sort((a, b) => a.avg - b.avg);
  const rankedCriteria = critAvgs.map(c => c.key);
  const weakestCriterion: RubricCriterion = rankedCriteria[0] ?? 'content';

  // Lowest-scoring scenario (for final-week re-run) — must still be offered at this level
  const lowestAttempt = rows
    .filter(r => availableScenarios.some(s => s.id === r.scenario_id))
    .reduce<AttemptRow | null>((lowest, r) => (!lowest || r.total_score < lowest.total_score) ? r : lowest, null);

  // Best scenario for weakest dept, restricted to this level (first catalog entry in that dept)
  const weakestScenario = availableScenarios.find(s => s.department === weakestDept) ?? availableScenarios[0];

  return {
    weakestDept,
    weakestCriterion,
    lowestScenarioId: lowestAttempt?.scenario_id ?? null,
    weakestScenarioId: weakestScenario?.id ?? null,
    rankedWeakDepts,
    rankedCriteria,
  };
}

export async function getMockExamAttemptCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('exam_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('format', 'roleplay');
  return count ?? 0;
}
