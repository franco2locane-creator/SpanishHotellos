import { SCENARIO_CATALOG } from './scenarios/catalog';
import { DECK_CATALOG } from './vocab/decks';

describe('SCENARIO_CATALOG premium gating', () => {
  it('has exactly 2 free scenarios', () => {
    expect(SCENARIO_CATALOG.filter(s => s.isFree)).toHaveLength(2);
  });

  it('free scenarios are noisy-room-complaint and restaurant-allergy-order', () => {
    const freeIds = SCENARIO_CATALOG.filter(s => s.isFree).map(s => s.id);
    expect(freeIds).toContain('noisy-room-complaint');
    expect(freeIds).toContain('restaurant-allergy-order');
  });

  it('paid scenarios are overbooking and lost-luggage', () => {
    const paidIds = SCENARIO_CATALOG.filter(s => !s.isFree).map(s => s.id);
    expect(paidIds).toContain('overbooking');
    expect(paidIds).toContain('lost-luggage');
  });

  it('every scenario has required fields', () => {
    for (const s of SCENARIO_CATALOG) {
      expect(s.id).toBeTruthy();
      expect(s.title).toBeTruthy();
      expect(s.department).toBeTruthy();
      expect(typeof s.isFree).toBe('boolean');
      expect(s.difficulty).toBeGreaterThanOrEqual(1);
      expect(s.difficulty).toBeLessThanOrEqual(3);
      expect(s.durationMinutes).toBeGreaterThan(0);
    }
  });

  it('difficulty is within 1–3 for all scenarios', () => {
    for (const s of SCENARIO_CATALOG) {
      expect([1, 2, 3]).toContain(s.difficulty);
    }
  });
});

describe('DECK_CATALOG premium gating', () => {
  it('has exactly 1 free deck', () => {
    expect(DECK_CATALOG.filter(d => d.isFree)).toHaveLength(1);
  });

  it('free deck is front-office-basics', () => {
    const freeId = DECK_CATALOG.find(d => d.isFree)?.id;
    expect(freeId).toBe('front-office-basics');
  });

  it('has 5 paid decks', () => {
    expect(DECK_CATALOG.filter(d => !d.isFree)).toHaveLength(5);
  });

  it('every deck has a positive cardCount', () => {
    for (const d of DECK_CATALOG) {
      expect(d.cardCount).toBeGreaterThan(0);
    }
  });

  it('every deck has required fields', () => {
    for (const d of DECK_CATALOG) {
      expect(d.id).toBeTruthy();
      expect(d.title).toBeTruthy();
      expect(d.department).toBeTruthy();
      expect(typeof d.isFree).toBe('boolean');
    }
  });
});
