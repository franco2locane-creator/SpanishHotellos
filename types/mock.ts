// TypeScript types for all 7 oral-exam assignment types and the mock exam container.

export type AssignmentType =
  | 'personal_presentation'
  | 'checkin'
  | 'restaurant'
  | 'hotel_presentation'
  | 'job_interview'
  | 'complaint'
  | 'saying_no';

export type MockLevel = 'basic' | 'intermediate';
export type MockSource = 'transcribed' | 'generated';

// ── personal_presentation ─────────────────────────────────────────────────────
// Student gives a monologue covering 3 topics; assessor asks follow-up questions.

export type PersonalPresentationData = {
  topics: [string, string, string];
  assessorQuestions: string[];
};

// ── checkin ───────────────────────────────────────────────────────────────────
// Student plays receptionist; AI plays arriving guest.

export type CheckinReservation = {
  guestName: string;
  nights: number;
  persons: number;
  rooms: number;
  roomType: string;
  view: string;
};

export type CheckinData = {
  hotelName: string;
  hotelCity: string;
  timeOfDay: string;
  reservations: CheckinReservation[];
  /** Plain-English instruction for what to do with walk-in guests. */
  walkIn: string;
  hotelInfo: Array<{ label: string; detail: string }>;
  checkoutTime: string;
  breakfastIncluded: boolean;
  checklist: string[];
};

// ── restaurant ────────────────────────────────────────────────────────────────
// Student plays waiter/waitress; AI plays guests arriving at the restaurant.

export type TableReservation = {
  guestName: string;
  covers: number;
  seating: string;
};

export type DishOfDay = {
  name: string;
  ingredients: string;
  cookingMethod: string;
  flavourTexture: string;
};

export type RestaurantData = {
  restaurantName: string;
  hotelName: string;
  hotelCity: string;
  timeOfDay: string;
  reservations: TableReservation[];
  /** Description of the no-table / waiting situation and suggested alternative. */
  noTableSituation: string;
  dishOfDay: DishOfDay;
  checklist: string[];
};

// ── hotel_presentation ────────────────────────────────────────────────────────
// Student delivers a promotional pitch for a hotel and handles guest Q&A.
// Must use the 'dejarse sorprender por' slogan formula and include at least one NO answer.

export type FeaturedRoom = {
  type: string;
  furniture: string[];
  bathroomFeature: string;
};

export type HotelPresentationData = {
  hotelName: string;
  hotelCity: string;
  sloganCompletion: string;
  architectureStyle: string;
  featuredRoom: FeaturedRoom;
  shuttlePriceEuros: number;
  extraFacility: { name: string; hours: string; priceNote?: string };
  targetAudience: string;
  guestQuestions: string[];
  checklist: string[];
};

// ── job_interview ─────────────────────────────────────────────────────────────
// Student plays hospitality applicant; AI plays the interviewer.

export type JobInterviewData = {
  hotelName: string;
  hotelCity: string;
  position: string;
  context: string;
  assessorQuestions: string[];
  checklist: string[];
};

// ── complaint ─────────────────────────────────────────────────────────────────
// Student plays hotel staff member handling an upset guest.

export type ComplaintData = {
  hotelName: string;
  hotelCity: string;
  timeOfDay: string;
  complaintScenario: string;
  guestName: string;
  problemDetails: string;
  resolutionOptions: string[];
  checklist: string[];
};

// ── saying_no ─────────────────────────────────────────────────────────────────
// Student must politely decline a guest request while offering alternatives.

export type SayingNoData = {
  hotelName: string;
  hotelCity: string;
  timeOfDay: string;
  requestContext: string;
  reasonForNo: string;
  alternatives: string[];
  checklist: string[];
};

// ── Assignment union ──────────────────────────────────────────────────────────

export type Assignment =
  | { type: 'personal_presentation'; number: number; prepTimeSecs: number; maxKeywords: number; data: PersonalPresentationData }
  | { type: 'checkin'; number: number; prepTimeSecs: number; maxKeywords: number; data: CheckinData }
  | { type: 'restaurant'; number: number; prepTimeSecs: number; maxKeywords: number; data: RestaurantData }
  | { type: 'hotel_presentation'; number: number; prepTimeSecs: number; maxKeywords: number; data: HotelPresentationData }
  | { type: 'job_interview'; number: number; prepTimeSecs: number; maxKeywords: number; data: JobInterviewData }
  | { type: 'complaint'; number: number; prepTimeSecs: number; maxKeywords: number; data: ComplaintData }
  | { type: 'saying_no'; number: number; prepTimeSecs: number; maxKeywords: number; data: SayingNoData };

// ── Mock exam container ───────────────────────────────────────────────────────

export type MockExamData = {
  id: string;
  level: MockLevel;
  number: number;
  source: MockSource;
  assignments: Assignment[];
};
