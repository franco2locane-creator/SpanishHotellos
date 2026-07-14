import { getRecommendation, getWeakestAreas, type RecommendationInput, type WeakestAreasInput } from './progressRecommendation';
import type { CoverageSummary } from './progressCoverage';
import type { ScenarioMeta } from './scenarios/catalog';
import type { DeckMeta } from './vocab/decks';
import type { DrillMeta } from './grammar/drills';

function makeCoverage(overrides: Partial<CoverageSummary> = {}): CoverageSummary {
  return {
    scenarios: [],
    offLevelScenariosCompleted: 0,
    completedScenarioIds: [],
    mocks: { completed: 0, total: 6 },
    offLevelMocksCompleted: 0,
    grammar: [],
    vocab: [],
    demoDrills: [],
    overallPct: 0,
    ...overrides,
  };
}

const SCENARIOS: ScenarioMeta[] = [
  { id: 'complaint-1', title: 'Complaint 1', titleEs: '', description: '', department: 'front_office', difficulty: 1, isFree: true, personaPreview: '', durationMinutes: 5, courseLevels: ['basic'], assignmentType: 'complaint' },
  { id: 'complaint-2', title: 'Complaint 2', titleEs: '', description: '', department: 'front_office', difficulty: 1, isFree: false, personaPreview: '', durationMinutes: 5, courseLevels: ['basic'], assignmentType: 'complaint' },
];

const DECKS: DeckMeta[] = [
  { id: 'front-office-basics', title: 'Front Office Basics', department: 'front_office', isFree: true, courseLevel: 'both', cardCount: 40 },
];

const DRILLS: DrillMeta[] = [
  { id: 'presente-regular', title: 'Present Tense', titleEs: '', courseLevel: 'both', isFree: true, questionCount: 10 },
];

describe('getRecommendation', () => {
  it('recommends an accessible scenario from the weakest incomplete coverage type', () => {
    const input: RecommendationInput = {
      coverage: makeCoverage({ scenarios: [{ type: 'complaint', completed: 0, total: 2 }] }),
      studyPlan: null,
      scenarios: SCENARIOS,
      decks: DECKS,
      drills: DRILLS,
      isPremium: false,
    };
    const rec = getRecommendation(input);
    expect(rec?.kind).toBe('scenario');
    expect(rec?.route).toBe('/roleplay/complaint-1');
  });

  it('never recommends a scenario the student has already completed individually', () => {
    const input: RecommendationInput = {
      coverage: makeCoverage({
        scenarios: [{ type: 'complaint', completed: 1, total: 2 }],
        completedScenarioIds: ['complaint-1'],
      }),
      studyPlan: null,
      scenarios: SCENARIOS,
      decks: DECKS,
      drills: DRILLS,
      isPremium: true,
    };
    const rec = getRecommendation(input);
    expect(rec?.kind).toBe('scenario');
    expect(rec?.route).toBe('/roleplay/complaint-2');
  });

  it('skips locked scenarios for free users and falls through to vocab', () => {
    const input: RecommendationInput = {
      coverage: makeCoverage({
        scenarios: [{ type: 'complaint', completed: 0, total: 1 }],
        vocab: [{ deckId: 'front-office-basics', title: 'Front Office Basics', isFree: true, seen: 0, learned: 5, mastered: 0, total: 40, bestFirstTryPct: null, bestCompletionSeconds: null }],
      }),
      studyPlan: null,
      scenarios: [SCENARIOS[1]], // only the locked one
      decks: DECKS,
      drills: DRILLS,
      isPremium: false,
    };
    const rec = getRecommendation(input);
    expect(rec?.kind).toBe('vocab');
    expect(rec?.route).toBe('/vocab/front-office-basics');
  });

  it('falls back to weakest performance criterion once coverage is complete', () => {
    const input: RecommendationInput = {
      coverage: makeCoverage(),
      studyPlan: {
        weakestDept: 'front_office',
        weakestCriterion: 'grammar',
        lowestScenarioId: null,
        weakestScenarioId: null,
        rankedWeakDepts: [],
        rankedCriteria: ['grammar', 'fluency', 'vocabulary', 'pronunciation', 'content'],
      },
      scenarios: [],
      decks: [],
      drills: [],
      isPremium: true,
    };
    const rec = getRecommendation(input);
    expect(rec?.kind).toBe('drill');
    expect(rec?.route).toBe('/drill/grammar');
  });

  it('never recommends an off-level vocab deck or grammar drill', () => {
    const input: RecommendationInput = {
      coverage: makeCoverage({
        vocab: [{ deckId: 'restaurant-service-steps', title: 'Restaurant Service', isFree: false, seen: 0, learned: 0, mastered: 0, total: 40, bestFirstTryPct: null, bestCompletionSeconds: null, offLevel: true }],
        grammar: [{ drillId: 'ser-estar', title: 'Ser vs Estar', isFree: true, attempted: false, bestAccuracy: null, bestCompletionSeconds: null, offLevel: true }],
      }),
      studyPlan: null,
      scenarios: [],
      decks: [],
      drills: [],
      isPremium: true,
    };
    expect(getRecommendation(input)).toBeNull();
  });

  it('returns null on true cold start', () => {
    const input: RecommendationInput = {
      coverage: makeCoverage(),
      studyPlan: null,
      scenarios: [],
      decks: [],
      drills: [],
      isPremium: true,
    };
    expect(getRecommendation(input)).toBeNull();
  });
});

describe('getWeakestAreas', () => {
  it('ranks worst coverage gaps first, capped at 3', () => {
    const input: WeakestAreasInput = {
      coverage: makeCoverage({
        scenarios: [
          { type: 'complaint', completed: 0, total: 6 },
          { type: 'checkin', completed: 5, total: 6 },
          { type: 'restaurant', completed: 1, total: 6 },
          { type: 'saying_no', completed: 3, total: 6 },
        ],
      }),
      isFull: false,
    };
    const items = getWeakestAreas(input);
    expect(items).toHaveLength(3);
    expect(items[0].detail).toBe('0/6 scenarios completed');
  });

  it('never surfaces an off-level vocab deck as a weakest area', () => {
    const input: WeakestAreasInput = {
      coverage: makeCoverage({
        vocab: [{ deckId: 'restaurant-service-steps', title: 'Restaurant Service', isFree: false, seen: 0, learned: 0, mastered: 0, total: 40, bestFirstTryPct: null, bestCompletionSeconds: null, offLevel: true }],
      }),
      isFull: true,
    };
    expect(getWeakestAreas(input)).toHaveLength(0);
  });

  it('excludes performance criteria for LITE users', () => {
    const input: WeakestAreasInput = {
      coverage: makeCoverage(),
      isFull: false,
      avgScores: { fluency: 5, vocabulary: 5, grammar: 5, pronunciation: 5, content: 5 },
    };
    expect(getWeakestAreas(input)).toHaveLength(0);
  });

  it('includes performance criteria for FULL users and flags a declining trend', () => {
    const series = [
      { fluency: 16, vocabulary: 16, grammar: 16, pronunciation: 16, content: 16 },
      { fluency: 16, vocabulary: 16, grammar: 16, pronunciation: 16, content: 16 },
      { fluency: 16, vocabulary: 16, grammar: 16, pronunciation: 16, content: 16 },
      { fluency: 16, vocabulary: 16, grammar: 16, pronunciation: 16, content: 16 },
      { fluency: 16, vocabulary: 16, grammar: 16, pronunciation: 16, content: 16 },
      { fluency: 16, vocabulary: 16, grammar: 16, pronunciation: 16, content: 8 },
    ];
    const input: WeakestAreasInput = {
      coverage: makeCoverage(),
      isFull: true,
      avgScores: { fluency: 16, vocabulary: 16, grammar: 16, pronunciation: 16, content: 8 },
      criterionSeries: series,
    };
    const items = getWeakestAreas(input);
    expect(items[0].label).toBe('Content');
    expect(items[0].detail).toContain('trending down');
  });
});
