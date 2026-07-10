// Shared primitive types and utilities used across all domain modules.

export type EntitlementId = 'premium';

export type ApiError = {
  message: string;
  code?: string;
};

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };

// Where the user is in the onboarding flow.
// 'exam-setup' → authenticated, hasn't picked school/format/date yet
// 'placement'  → done exam setup, placement test not yet completed
// 'complete'   → placement done, onboarding_completed_at is set in DB
export type OnboardingStep = 'exam-setup' | 'placement' | 'complete';

export type AuthUser = {
  id: string;
  email: string | null;
  isPremium: boolean;
  onboardingStep: OnboardingStep;
  examFormat: ExamFormat;
  examDate?: string;             // ISO YYYY-MM-DD
  mockLevel: 'basic' | 'intermediate';
};

export type MessageRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  timestampMs: number;
};

export type RolePlaySession = {
  id: string;
  scenarioId: string;
  messages: ChatMessage[];
  startedAt: string;
  endedAt?: string;
};

// Hotel departments — drives both scenario categorisation and vocab deck grouping.
export type Department =
  | 'front_office'
  | 'fnb'
  | 'housekeeping'
  | 'concierge'
  | 'events'
  | 'management';

// Oral exam delivery formats used across mock exams and practice scenarios.
export type ExamFormat =
  | 'monologue'
  | 'guided_dialogue'
  | 'picture_description'
  | 'spontaneous_qa';

// The five rubric criteria scored by the AI grader (0–20 each).
// Register/formality is NOT scored here — it's a pass/fail hospitality gate
// (see HospitalityGateResult) applied separately per the real exam rules.
export type RubricCriterion =
  | 'fluency'
  | 'vocabulary'
  | 'grammar'
  | 'pronunciation'
  | 'content';

// Per-criterion score map. Values are 0–20; weights sum to 1.0.
export type RubricScore = Record<RubricCriterion, number>;
export type RubricWeights = Record<RubricCriterion, number>;

// Binary formal-register check, evaluated on hospitality assignments only
// (never on personal_presentation, where tú is correct). A failed gate caps
// the whole mock exam at 10/100, mirroring the real oral exam's rules.
export type HospitalityGateResult = {
  applicable: boolean;   // false for personal_presentation (tú allowed)
  passed: boolean;
  tuForms: string[];
  note: string;
};

export type CourseLevel = 'basic' | 'intermediate';
