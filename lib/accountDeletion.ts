import AsyncStorage from '@react-native-async-storage/async-storage';
import { wipeLocalVocabData } from '@/lib/db/vocab';
import { logoutPurchaseUser } from '@/lib/purchases';

// Keys with a per-day/per-exercise suffix — matched by prefix.
const WIPE_KEY_PREFIXES = ['@sp4h_resume_', '@sp4h_tiles_'];

// Fixed-name keys that hold this account's practice history / progress.
// Deliberately excludes '@sp4h_dev_premium' — that's a __DEV__-only build
// toggle for the paywall, not user data, and must survive account deletion.
const WIPE_KEY_NAMES = [
  '@sp4h_streak',
  '@sp4h_last_date',
  '@sp4h_completion_history',
  '@sp4h_readiness_history',
  '@sp4h_leaderboard_nickname_set',
];

async function wipeLocalAsyncStorage(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const toRemove = allKeys.filter(
    (k) => WIPE_KEY_NAMES.includes(k) || WIPE_KEY_PREFIXES.some((p) => k.startsWith(p)),
  );
  if (toRemove.length) await AsyncStorage.multiRemove(toRemove);
}

/**
 * Clears every trace of the current account from this device: local SQLite
 * SRS state, cached practice-history AsyncStorage keys, and the RevenueCat
 * identity. Call ONLY after the server-side delete-account call has already
 * succeeded — this never touches the server, so it's safe to run, but running
 * it first would desync local caches from an account that still exists.
 */
export async function wipeLocalAccountData(userId: string): Promise<void> {
  await wipeLocalVocabData(userId);
  await wipeLocalAsyncStorage();
  await logoutPurchaseUser();
}
