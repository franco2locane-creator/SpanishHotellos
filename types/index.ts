// ── Auth ──────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: string;
  email: string | null;
  isPremium: boolean;
};

// ── Entitlement ───────────────────────────────────────────────────────────────

export type EntitlementId = 'premium';

// ── Scenarios ─────────────────────────────────────────────────────────────────

export type ScenarioId = string;

export type ScenarioCategory =
  | 'check_in'
  | 'check_out'
  | 'complaint'
  | 'restaurant'
  | 'concierge'
  | 'housekeeping'
  | 'spa'
  | 'other';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type Scenario = {
  id: ScenarioId;
  category: ScenarioCategory;
  title: string;           // English title
  titleEs: string;         // Spanish title
  difficulty: DifficultyLevel;
  isPremium: boolean;
  durationMinutes: number;
  descriptionEn: string;
};

// ── Vocab ─────────────────────────────────────────────────────────────────────

export type VocabCard = {
  id: string;
  termEs: string;
  termEsLatam?: string;    // Latin American variant if different
  definitionEn: string;
  exampleEs: string;
  category: string;
  isPremium: boolean;
};

export type VocabDeck = {
  id: string;
  title: string;
  description: string;
  isPremium: boolean;
  cards: VocabCard[];
};

// ── Grading rubric ────────────────────────────────────────────────────────────

export type RubricDimension =
  | 'fluency'
  | 'vocabulary'
  | 'grammar'
  | 'task_completion'
  | 'register';

export type DimensionScore = {
  dimension: RubricDimension;
  score: number;       // 0–10
  feedback: string;    // AI-generated feedback in English
};

export type ExamResult = {
  id: string;
  scenarioId: ScenarioId;
  completedAt: string;  // ISO date string
  totalScore: number;   // 0–10, average of dimensions
  dimensions: DimensionScore[];
  transcript: string;
};

// ── Role-play ─────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  timestampMs: number;
};

export type RolePlaySession = {
  id: string;
  scenarioId: ScenarioId;
  messages: ChatMessage[];
  startedAt: string;
  endedAt?: string;
};

// ── API helpers ───────────────────────────────────────────────────────────────

export type ApiError = {
  message: string;
  code?: string;
};

export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: ApiError };
