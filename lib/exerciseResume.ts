import AsyncStorage from '@react-native-async-storage/async-storage';

// Generic mid-exercise resume-state persistence, shared by every exercise
// type except mock exams (which intentionally never auto-save — exam
// conditions, leaving abandons the attempt). Key convention:
// `@sp4h_resume_<type>_<userId>_<exerciseId>`. Called at natural checkpoints
// (after each answer/turn), not on a timer.

export function resumeKey(type: string, userId: string, exerciseId: string): string {
  return `@sp4h_resume_${type}_${userId}_${exerciseId}`;
}

export async function saveResumeState<T>(key: string, state: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(state));
  } catch (e) {
    console.warn('saveResumeState failed', e);
  }
}

export async function loadResumeState<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (e) {
    console.warn('loadResumeState failed', e);
    return null;
  }
}

export async function clearResumeState(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn('clearResumeState failed', e);
  }
}
