import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { SCENARIO_CATALOG } from './scenarios/catalog';
import type { Department, RubricCriterion } from '@/types';

// ── Date helpers ──────────────────────────────────────────────────────────────

export function getDaysUntilExam(examDate?: string): number | null {
  if (!examDate) return null;
  const diff = Date.parse(examDate) - Date.now();
  return Math.ceil(diff / 86400000);
}

export function isFinalWeek(examDate?: string): boolean {
  const days = getDaysUntilExam(examDate);
  return days !== null && days >= 0 && days <= 7;
}

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
    await recordActivity();
  }
  await AsyncStorage.setItem(tileKey(), JSON.stringify(next));
  return next;
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
};

export async function getStudyPlanData(userId: string): Promise<StudyPlanData> {
  const { data } = await supabase
    .from('exam_attempts')
    .select('scenario_id, total_score, format, scores')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false })
    .limit(30);

  const rows = (data ?? []) as AttemptRow[];

  // Weakest department
  const deptScores: Record<string, number[]> = {};
  for (const r of rows) {
    const dept = SCENARIO_CATALOG.find(s => s.id === r.scenario_id)?.department ?? 'front_office';
    (deptScores[dept] ??= []).push(r.total_score);
  }
  let weakestDept: Department = 'front_office';
  let minDeptAvg = Infinity;
  for (const [dept, scores] of Object.entries(deptScores)) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg < minDeptAvg) { minDeptAvg = avg; weakestDept = dept as Department; }
  }

  // Weakest criterion
  const critSums: Record<string, number[]> = {};
  for (const r of rows) {
    for (const [k, v] of Object.entries(r.scores ?? {})) {
      (critSums[k] ??= []).push(v);
    }
  }
  const criteria: RubricCriterion[] = ['fluency', 'vocabulary', 'grammar', 'taskCompletion', 'register'];
  let weakestCriterion: RubricCriterion = 'register';
  let minCrit = Infinity;
  for (const k of criteria) {
    const vals = critSums[k] ?? [];
    if (vals.length > 0) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (avg < minCrit) { minCrit = avg; weakestCriterion = k; }
    }
  }

  // Lowest-scoring scenario (for final-week re-run)
  const lowestAttempt = rows.length
    ? rows.reduce((a, b) => a.total_score < b.total_score ? a : b)
    : null;

  // Best scenario for weakest dept (first catalog entry in that dept)
  const weakestScenario = SCENARIO_CATALOG.find(s => s.department === weakestDept);

  return {
    weakestDept,
    weakestCriterion,
    lowestScenarioId: lowestAttempt?.scenario_id ?? null,
    weakestScenarioId: weakestScenario?.id ?? null,
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
