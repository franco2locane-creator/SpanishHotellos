import {
  resolvePremium,
  FREE_LIMITS,
  canAccessScenario,
  canAccessDeck,
  canAccessGrammarDrillSet,
  canAccessDemoDrill,
  canStartMockExam,
  showDailyRotation,
  isFinalWeekModeActive,
  progressTabMode,
  getCatalogSummary,
  getPaywallTeaserLine,
} from './premiumGating';
import { SCENARIO_CATALOG } from './scenarios/catalog';
import { DECK_CATALOG } from './vocab/decks';
import { DRILL_CATALOG } from './grammar/drills';
import { TOTAL_MOCK_COUNT } from './mockExam/loader';

describe('resolvePremium', () => {
  it('is true when the dev override is active in __DEV__', () => {
    expect(resolvePremium(true, false)).toBe(true);
  });

  it('falls back to the RevenueCat-derived value when no override is active', () => {
    expect(resolvePremium(false, true)).toBe(true);
    expect(resolvePremium(false, false)).toBe(false);
  });
});

describe('preview flag behavior (EXPO_PUBLIC_PREMIUM_PREVIEW)', () => {
  const ORIGINAL_ENV = process.env.EXPO_PUBLIC_PREMIUM_PREVIEW;

  afterEach(() => {
    process.env.EXPO_PUBLIC_PREMIUM_PREVIEW = ORIGINAL_ENV;
  });

  it('forces resolvePremium() true and requires DB mirroring for a signed-in user when the flag is "1"', () => {
    jest.isolateModules(() => {
      process.env.EXPO_PUBLIC_PREMIUM_PREVIEW = '1';
      const gating = require('./premiumGating');
      expect(gating.PREVIEW_PREMIUM_ENABLED).toBe(true);
      expect(gating.resolvePremium(false, false)).toBe(true);
      expect(gating.shouldMirrorPreviewPremium(true)).toBe(true);
      expect(gating.shouldMirrorPreviewPremium(false)).toBe(false);
    });
  });

  it('does not force premium or mirror when the flag is unset', () => {
    jest.isolateModules(() => {
      delete process.env.EXPO_PUBLIC_PREMIUM_PREVIEW;
      const gating = require('./premiumGating');
      expect(gating.PREVIEW_PREMIUM_ENABLED).toBe(false);
      expect(gating.resolvePremium(false, false)).toBe(false);
      expect(gating.shouldMirrorPreviewPremium(true)).toBe(false);
    });
  });
});

describe('access helpers', () => {
  it('canAccessScenario / canAccessDeck / canAccessGrammarDrillSet honor isFree and isPremium', () => {
    expect(canAccessScenario({ isFree: true }, false)).toBe(true);
    expect(canAccessScenario({ isFree: false }, false)).toBe(false);
    expect(canAccessScenario({ isFree: false }, true)).toBe(true);

    expect(canAccessDeck({ isFree: true }, false)).toBe(true);
    expect(canAccessDeck({ isFree: false }, false)).toBe(false);

    expect(canAccessGrammarDrillSet({ isFree: false }, false)).toBe(false);
    expect(canAccessGrammarDrillSet({ isFree: false }, true)).toBe(true);
  });

  it('canAccessDemoDrill only allows the free demo drill type for free users', () => {
    expect(canAccessDemoDrill('grammar', false)).toBe(true);
    expect(canAccessDemoDrill('fluency', false)).toBe(false);
    expect(canAccessDemoDrill('register', false)).toBe(false);
    expect(canAccessDemoDrill('fluency', true)).toBe(true);
  });

  it('canStartMockExam enforces the free attempt cap and is unlimited for premium', () => {
    expect(canStartMockExam(false, 0)).toBe(true);
    expect(canStartMockExam(false, 1)).toBe(false);
    expect(canStartMockExam(false, 5)).toBe(false);
    expect(canStartMockExam(true, 0)).toBe(true);
    expect(canStartMockExam(true, 50)).toBe(true);
  });

  it('showDailyRotation is premium-only and off during final week', () => {
    expect(showDailyRotation(false, false)).toBe(false);
    expect(showDailyRotation(true, false)).toBe(true);
    expect(showDailyRotation(true, true)).toBe(false);
  });

  it('isFinalWeekModeActive requires both premium and an exam date within 7 days', () => {
    const soon = new Date(Date.now() + 3 * 86400000).toISOString();
    const far = new Date(Date.now() + 30 * 86400000).toISOString();
    expect(isFinalWeekModeActive(true, soon)).toBe(true);
    expect(isFinalWeekModeActive(false, soon)).toBe(false);
    expect(isFinalWeekModeActive(true, far)).toBe(false);
    expect(isFinalWeekModeActive(true, undefined)).toBe(false);
  });

  it('progressTabMode maps premium to full and free to lite', () => {
    expect(progressTabMode(true)).toBe('full');
    expect(progressTabMode(false)).toBe('lite');
  });
});

describe('FREE_LIMITS stays in sync with the real catalogs', () => {
  it('scenarios', () => {
    expect(FREE_LIMITS.scenarios).toBe(SCENARIO_CATALOG.filter(s => s.isFree).length);
  });
  it('vocabDecks', () => {
    expect(FREE_LIMITS.vocabDecks).toBe(DECK_CATALOG.filter(d => d.isFree).length);
  });
  it('grammarDrillSets', () => {
    expect(FREE_LIMITS.grammarDrillSets).toBe(DRILL_CATALOG.filter(d => d.isFree).length);
  });
});

describe('getCatalogSummary', () => {
  it('is fully derived from the real catalogs', () => {
    const summary = getCatalogSummary();
    expect(summary.scenarioCount).toBe(SCENARIO_CATALOG.length);
    expect(summary.freeScenarioCount).toBe(SCENARIO_CATALOG.filter(s => s.isFree).length);
    expect(summary.deckCount).toBe(DECK_CATALOG.length);
    expect(summary.mockCount).toBe(TOTAL_MOCK_COUNT);
    expect(summary.mocksPerLevel).toBe(TOTAL_MOCK_COUNT / 2);
    expect(summary.grammarDrillSetCount).toBe(DRILL_CATALOG.length);
  });
});

describe('getPaywallTeaserLine', () => {
  it('includes the live scenario, deck, and mock counts', () => {
    const { scenarioCount, deckCount, mockCount } = getCatalogSummary();
    const line = getPaywallTeaserLine();
    expect(line).toContain(String(scenarioCount));
    expect(line).toContain(String(deckCount));
    expect(line).toContain(String(mockCount));
  });
});
