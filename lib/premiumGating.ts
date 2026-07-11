import { SCENARIO_CATALOG } from './scenarios/catalog';
import { DECK_CATALOG } from './vocab/decks';
import { DRILL_CATALOG } from './grammar/drills';
import { TOTAL_MOCK_COUNT } from './mockExam/loader';
import { isFinalWeek } from './examDate';

/**
 * Single source of truth for free-tier limits and premium access. Every
 * screen that needs to know what's free/locked reads from here — no
 * scattered `user.isPremium` checks.
 */

// ── Entitlement resolution ──────────────────────────────────────────────────

export const PREVIEW_PREMIUM_ENABLED = process.env.EXPO_PUBLIC_PREMIUM_PREVIEW === '1';

/**
 * @param devOverrideActive - the __DEV__-only "simulate premium" toggle (stores/purchaseStore.ts)
 * @param rcIsPremium - the RevenueCat-derived value already reconciled into the auth store
 *   by app/_layout.tsx's loginPurchaseUser()/checkIsPremium() flow — NOT a direct DB read.
 */
export function resolvePremium(devOverrideActive: boolean, rcIsPremium: boolean): boolean {
  if (__DEV__ && devOverrideActive) return true;
  if (PREVIEW_PREMIUM_ENABLED) return true;
  return rcIsPremium;
}

/**
 * The preview flag only affects resolvePremium() on the client — it cannot
 * reach server-side checks, because Supabase Edge Functions (Deno) can't
 * import this module and correctly enforce real entitlement by reading
 * `profiles.is_premium` from the DB (see supabase/functions/roleplay/index.ts).
 * That server check must stay intact — it's the real paywall enforcement,
 * not a stray gate to weaken. So when the preview flag is active, the
 * client instead mirrors premium status to that same DB row for the
 * signed-in tester, the same way a real purchase does (lib/purchases.ts's
 * mirrorPremiumToDb) — the server check then sees a genuinely premium
 * profile and needs no changes.
 */
export function shouldMirrorPreviewPremium(hasUser: boolean): boolean {
  return PREVIEW_PREMIUM_ENABLED && hasUser;
}

// ── Free-tier limits ─────────────────────────────────────────────────────────

export const FREE_LIMITS = {
  scenarios: 2,
  vocabDecks: 1,
  mockAttempts: 1, // total, across all levels/mocks
  grammarDemoDrillType: 'grammar' as const,
  grammarDrillSets: 1,
};

// ── Access helpers ────────────────────────────────────────────────────────────

export function canAccessScenario(s: { isFree: boolean }, isPremium: boolean): boolean {
  return s.isFree || isPremium;
}

export function canAccessDeck(d: { isFree: boolean }, isPremium: boolean): boolean {
  return d.isFree || isPremium;
}

export function canAccessGrammarDrillSet(d: { isFree: boolean }, isPremium: boolean): boolean {
  return d.isFree || isPremium;
}

export function canAccessDemoDrill(drillType: string, isPremium: boolean): boolean {
  return isPremium || drillType === FREE_LIMITS.grammarDemoDrillType;
}

export function canStartMockExam(isPremium: boolean, priorAttemptCount: number): boolean {
  return isPremium || priorAttemptCount < FREE_LIMITS.mockAttempts;
}

export function showDailyRotation(isPremium: boolean, finalWeekActive: boolean): boolean {
  return isPremium && !finalWeekActive;
}

/** Final week mode (failed-scenario re-runs, calmer tone) is premium-only. */
export function isFinalWeekModeActive(isPremium: boolean, examDate?: string): boolean {
  return isPremium && isFinalWeek(examDate);
}

export function progressTabMode(isPremium: boolean): 'lite' | 'full' {
  return isPremium ? 'full' : 'lite';
}

// ── Truthful, derived paywall numbers ─────────────────────────────────────────

export type CatalogSummary = {
  scenarioCount: number;
  freeScenarioCount: number;
  deckCount: number;
  mockCount: number;
  mocksPerLevel: number;
  grammarDrillSetCount: number;
};

export function getCatalogSummary(): CatalogSummary {
  return {
    scenarioCount: SCENARIO_CATALOG.length,
    freeScenarioCount: SCENARIO_CATALOG.filter(s => s.isFree).length,
    deckCount: DECK_CATALOG.length,
    mockCount: TOTAL_MOCK_COUNT,
    mocksPerLevel: TOTAL_MOCK_COUNT / 2,
    grammarDrillSetCount: DRILL_CATALOG.length,
  };
}

/** Short one-line summary shared by the paywall and the post-mock upgrade teaser. */
export function getPaywallTeaserLine(): string {
  const { scenarioCount, deckCount, mockCount } = getCatalogSummary();
  return `${scenarioCount} scenarios · ${deckCount} vocab decks · ${mockCount} mock exams`;
}
