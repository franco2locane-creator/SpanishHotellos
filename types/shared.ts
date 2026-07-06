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

export type AuthUser = {
  id: string;
  email: string | null;
  isPremium: boolean;
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
export type RubricCriterion =
  | 'fluency'
  | 'vocabulary'
  | 'grammar'
  | 'taskCompletion'
  | 'register';

// Per-criterion score map. Values are 0–20; weights sum to 1.0.
export type RubricScore = Record<RubricCriterion, number>;
export type RubricWeights = Record<RubricCriterion, number>;
