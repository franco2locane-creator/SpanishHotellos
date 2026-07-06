// ── Types mirrored from types/ (Edge Functions can't import from the app) ─────

export type GuestPersona = {
  name: string;
  nationality: string;
  mood: 'friendly' | 'neutral' | 'frustrated' | 'demanding' | 'confused';
  speakingSpeed: 'slow' | 'normal' | 'fast';
};

export type ScenarioObjective = { id: string; label: string };

export type RubricWeights = Record<string, number>;

// ── Role-play guest system prompt ─────────────────────────────────────────────

type RolePlayPromptArgs = {
  scenarioTitle: string;
  guestPersona: GuestPersona;
  objectives: ScenarioObjective[];
  openingLine: string;
  systemContext: string;
  difficulty: 1 | 2 | 3;
};

const moodGuidance: Record<GuestPersona['mood'], string> = {
  friendly:
    'You are patient, pleasant, and forgiving — a warm guest who makes the staff member feel at ease.',
  neutral:
    'You are professional and businesslike. You expect competent service but are not difficult.',
  frustrated:
    'You are visibly irritated. The staff must actively calm the situation and resolve the issue.',
  demanding:
    'You have high expectations. You ask precise questions, notice small errors, and expect prompt professional service.',
  confused:
    'You are uncertain and need guidance. Ask clarifying questions; the staff must lead you through the process.',
};

const speedGuidance: Record<GuestPersona['speakingSpeed'], string> = {
  slow: 'Speak in short, clear sentences (max 15 words). Pause naturally between thoughts.',
  normal: 'Speak at a natural conversational pace with sentences of varied length.',
  fast: 'Speak quickly with longer, more complex sentences (25+ words). The student must keep up.',
};

const difficultyGuidance: Record<1 | 2 | 3, string> = {
  1: 'DIFFICULTY 1 (Beginner-friendly): Use simple, everyday vocabulary. Be patient. Give the student time to formulate answers. Do not introduce unexpected complications.',
  2: 'DIFFICULTY 2 (Intermediate): Use moderate hospitality vocabulary. Show mild impatience if handled poorly. Occasionally ask a follow-up question to test whether the student understands you fully.',
  3: 'DIFFICULTY 3 (Advanced): Use idiomatic expressions and complex sentences. Be more demanding. Introduce a complication mid-conversation (e.g. remember an additional detail, change your request slightly). React with frustration to vague or evasive answers.',
};

export function buildGuestSystemPrompt(args: RolePlayPromptArgs): string {
  const { scenarioTitle, guestPersona, objectives, openingLine, systemContext, difficulty } = args;

  return `You are roleplaying as ${guestPersona.name}, a hotel guest from ${guestPersona.nationality}.

SCENARIO: ${scenarioTitle}

YOUR CHARACTER
${moodGuidance[guestPersona.mood]}
${speedGuidance[guestPersona.speakingSpeed]}
${difficultyGuidance[difficulty]}

SITUATION
${systemContext}
Your opening line was: "${openingLine}"

LANGUAGE — ABSOLUTE RULES (never deviate)
- Speak ONLY in Spanish. Never switch to English for any reason.
- If the student speaks English, react as a confused guest who only speaks Spanish: e.g. "Lo siento, no entiendo inglés."
- Address staff using "usted" — formal register is mandatory in hotel hospitality.
- Keep replies to 2–4 sentences unless a longer answer is truly needed.
- If the student's speech is garbled or makes no sense, say: "No le he entendido bien, ¿puede repetirlo?"
- Never break character. Never explain what you are doing. Never mention AI, Claude, or objectives.

OBJECTIVES (track which ones the student's latest response accomplishes)
${objectives.map((o) => `- [${o.id}] ${o.label}`).join('\n')}

OUTPUT FORMAT
You MUST call the guest_response tool with:
- guestReply: your in-character Spanish response (2–4 sentences)
- objectivesCompleted: array of objective IDs the student just accomplished (empty [] if none)
- sessionShouldEnd: true only if ALL objectives are completed OR the conversation has reached a natural farewell`;
}

// ── Grading system prompt ─────────────────────────────────────────────────────

type GradingPromptArgs = {
  scenarioTitle: string;
  objectives: ScenarioObjective[];
  transcript: string;
};

export function buildGradingSystemPrompt(): string {
  return `You are a senior examiner for hotel school Spanish oral exams.
Grade the student's performance using the submit_grade tool.
Be rigorous but fair. Base scores strictly on the transcript evidence provided.`;
}

export function buildGradingUserPrompt(args: GradingPromptArgs): string {
  const { scenarioTitle, objectives, transcript } = args;

  return `Grade the STUDENT'S Spanish (the "STAFF" lines only — ignore the AI guest lines).

SCENARIO: ${scenarioTitle}

OBJECTIVES THE STAFF MUST ACCOMPLISH:
${objectives.map((o, i) => `${i + 1}. [${o.id}] ${o.label}`).join('\n')}

TRANSCRIPT:
${transcript}

RUBRIC — score each criterion 0–20:

FLUENCY — natural flow, pace, confidence, minimal hesitation
  18–20: seamless  |  14–17: mostly fluent  |  10–13: frequent pauses but communicative  |  0–9: very limited

VOCABULARY — range and precision of hospitality-specific Spanish
  18–20: rich terminology  |  14–17: good range  |  10–13: basic but sufficient  |  0–9: severely limited

GRAMMAR — accuracy (conjugation, agreement, tense)
  18–20: near-perfect  |  14–17: minor errors  |  10–13: frequent but understood  |  0–9: severe breakdown

TASK COMPLETION — all scenario objectives accomplished
  18–20: all met professionally  |  14–17: most met  |  10–13: some met  |  0–9: few/none

REGISTER — formal register (usted, professional hospitality language throughout)
  18–20: perfect  |  14–17: mostly formal  |  10–13: mixed  |  0–9: predominantly informal

Use the submit_grade tool to return your evaluation.`;
}
