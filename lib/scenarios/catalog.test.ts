import fs from 'fs';
import path from 'path';
import { SCENARIO_CATALOG, loadScenario, scenariosForLevel } from './catalog';
import type { AssignmentType } from '@/types';

const CONTENT_DIR = path.join(__dirname, '../../content/scenarios');

describe('SCENARIO_CATALOG completeness', () => {
  it('has exactly 32 scenarios', () => {
    expect(SCENARIO_CATALOG).toHaveLength(32);
  });

  it('every content/scenarios/*.json file on disk has a matching catalog entry', () => {
    const files = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.json'));
    const ids = files.map(f => f.replace(/\.json$/, ''));
    const catalogIds = SCENARIO_CATALOG.map(s => s.id);

    for (const id of ids) {
      expect(catalogIds).toContain(id);
    }
    expect(ids.sort()).toEqual(catalogIds.sort());
  });

  it('every catalog entry loads its scenario content without error', () => {
    for (const meta of SCENARIO_CATALOG) {
      const scenario = loadScenario(meta.id);
      expect(scenario).not.toBeNull();
      expect(scenario!.id).toBe(meta.id);
    }
  });

  it('has no duplicate ids', () => {
    const ids = SCENARIO_CATALOG.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has exactly 2 free scenarios (unchanged by the content expansion)', () => {
    expect(SCENARIO_CATALOG.filter(s => s.isFree)).toHaveLength(2);
  });

  it('every scenario is visible to at least one course level', () => {
    const basicIds = new Set(scenariosForLevel('basic').map(s => s.id));
    const intermediateIds = new Set(scenariosForLevel('intermediate').map(s => s.id));
    for (const s of SCENARIO_CATALOG) {
      expect(basicIds.has(s.id) || intermediateIds.has(s.id)).toBe(true);
    }
  });

  it('category distribution matches the planned catalog (per assignment-type group)', () => {
    const checkin = ['checkin-walk-in-no-reservation', 'checkin-room-with-view-request', 'checkin-missing-reservation-alternative', 'checkin-group-arrival', 'checkin-card-declined', 'overbooking'];
    const restaurant = ['restaurant-simple-order', 'restaurant-dish-of-day-question', 'restaurant-wrong-dish-served', 'restaurant-no-table-wait-alternative', 'restaurant-wine-recommendation', 'restaurant-allergy-order'];
    const hotelPresentation = ['hotel-presentation-family-suite', 'hotel-presentation-business-traveller', 'hotel-presentation-honeymoon-package', 'hotel-presentation-spa-wellness'];
    const jobInterview = ['job-interview-front-office-trainee', 'job-interview-fnb-waiter-trainee', 'job-interview-housekeeping-supervisor-trainee', 'job-interview-kitchen-assistant-trainee'];
    const sayingNo = ['saying-no-early-checkin-unavailable', 'saying-no-pet-not-allowed', 'saying-no-discount-request', 'saying-no-room-upgrade-unavailable', 'saying-no-late-checkout-unavailable'];
    const complaint = ['complaint-slow-service', 'complaint-wrong-bill', 'complaint-room-not-cleaned', 'complaint-broken-ac', 'complaint-double-charge-checkout', 'noisy-room-complaint'];

    expect(checkin).toHaveLength(6);
    expect(restaurant).toHaveLength(6);
    expect(hotelPresentation).toHaveLength(4);
    expect(jobInterview).toHaveLength(4);
    expect(sayingNo).toHaveLength(5);
    expect(complaint).toHaveLength(6);

    const catalogIds = new Set(SCENARIO_CATALOG.map(s => s.id));
    for (const id of [...checkin, ...restaurant, ...hotelPresentation, ...jobInterview, ...sayingNo, ...complaint, 'lost-luggage']) {
      expect(catalogIds.has(id)).toBe(true);
    }
  });

  it('every scenario in an assignmentType-rotation category is tagged with that assignmentType', () => {
    const expected: Record<string, AssignmentType> = {
      'checkin-walk-in-no-reservation': 'checkin', 'checkin-room-with-view-request': 'checkin',
      'checkin-missing-reservation-alternative': 'checkin', 'checkin-group-arrival': 'checkin',
      'checkin-card-declined': 'checkin', 'overbooking': 'checkin',
      'restaurant-simple-order': 'restaurant', 'restaurant-dish-of-day-question': 'restaurant',
      'restaurant-wrong-dish-served': 'restaurant', 'restaurant-no-table-wait-alternative': 'restaurant',
      'restaurant-wine-recommendation': 'restaurant', 'restaurant-allergy-order': 'restaurant',
      'hotel-presentation-family-suite': 'hotel_presentation', 'hotel-presentation-business-traveller': 'hotel_presentation',
      'hotel-presentation-honeymoon-package': 'hotel_presentation', 'hotel-presentation-spa-wellness': 'hotel_presentation',
      'job-interview-front-office-trainee': 'job_interview', 'job-interview-fnb-waiter-trainee': 'job_interview',
      'job-interview-housekeeping-supervisor-trainee': 'job_interview', 'job-interview-kitchen-assistant-trainee': 'job_interview',
      'saying-no-early-checkin-unavailable': 'saying_no', 'saying-no-pet-not-allowed': 'saying_no',
      'saying-no-discount-request': 'saying_no', 'saying-no-room-upgrade-unavailable': 'saying_no',
      'saying-no-late-checkout-unavailable': 'saying_no',
      'complaint-slow-service': 'complaint', 'complaint-wrong-bill': 'complaint',
      'complaint-room-not-cleaned': 'complaint', 'complaint-broken-ac': 'complaint',
      'complaint-double-charge-checkout': 'complaint', 'noisy-room-complaint': 'complaint',
    };
    for (const [id, type] of Object.entries(expected)) {
      const meta = SCENARIO_CATALOG.find(s => s.id === id);
      expect(meta?.assignmentType).toBe(type);
    }
    expect(SCENARIO_CATALOG.find(s => s.id === 'lost-luggage')?.assignmentType).toBeUndefined();
  });
});
