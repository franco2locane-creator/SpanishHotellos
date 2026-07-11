import { GUIDED_STEP_ORDER, guidedNextRoute } from './guidedSession';

describe('guidedNextRoute', () => {
  it('has exactly 3 steps: vocab, scenario, drill', () => {
    expect(GUIDED_STEP_ORDER).toEqual(['vocab', 'scenario', 'drill']);
  });

  it('routes to the transition screen with the next step while steps remain', () => {
    expect(guidedNextRoute(0)).toEqual({ screen: 'transition', next: 'vocab' });
    expect(guidedNextRoute(1)).toEqual({ screen: 'transition', next: 'scenario' });
    expect(guidedNextRoute(2)).toEqual({ screen: 'transition', next: 'drill' });
  });

  it('routes to the complete screen once all steps are exhausted', () => {
    expect(guidedNextRoute(3)).toEqual({ screen: 'complete' });
    expect(guidedNextRoute(4)).toEqual({ screen: 'complete' });
  });
});
