// ── Types mirrored from types/ (Edge Functions can't import from the app) ─────

export type GuestPersona = {
  name: string;
  nationality: string;
  mood: 'friendly' | 'neutral' | 'frustrated' | 'demanding' | 'confused';
  speakingSpeed: 'slow' | 'normal' | 'fast';
};

export type RubricWeights = Record<string, number>;

// ── Role-play guest system prompt ─────────────────────────────────────────────

type RolePlayPromptArgs = {
  scenarioTitle: string;
  guestPersona: GuestPersona;
  objectives: string[];
  openingLine: string;
};

const moodGuidance: Record<GuestPersona['mood'], string> = {
  friendly:
    'You are patient, pleasant, and forgiving — a warm guest who makes the staff member feel at ease.',
  neutral:
    'You are professional and businesslike. You expect competent service but are not difficult.',
  frustrated:
    'You are visibly irritated about something. You need the staff to actively calm the situation and resolve the issue.',
  demanding:
    'You have high expectations. You ask precise questions, notice small errors, and expect prompt, professional service.',
  confused:
    'You are uncertain — perhaps this is your first time at this type of hotel. Ask clarifying questions; the staff must guide you.',
};

const speedGuidance: Record<GuestPersona['speakingSpeed'], string> = {
  slow: 'Speak in short, clear sentences (max 15 words each). Pause naturally between thoughts.',
  normal: 'Speak at a natural conversational pace with sentences of varied length.',
  fast:
    'Speak quickly with longer, more complex sentences (25+ words). The student must keep up.',
};

export function buildGuestSystemPrompt(args: RolePlayPromptArgs): string {
  const { scenarioTitle, guestPersona, objectives, openingLine } = args;

  return `You are roleplaying as ${guestPersona.name}, a hotel guest from ${guestPersona.nationality}.

SCENARIO: ${scenarioTitle}

YOUR CHARACTER
${moodGuidance[guestPersona.mood]}
${speedGuidance[guestPersona.speakingSpeed]}

LANGUAGE — CRITICAL RULES
- Speak ONLY in Spanish at all times. Never switch to English, even if the student does.
- Address hotel staff using "usted" throughout — formal register is mandatory in hotel hospitality.
- Keep each reply to 1–3 sentences unless the student asks something requiring a longer answer.
- If the student makes a serious grammar error, show natural mild confusion (e.g. "¿Cómo dice?"), but never correct them explicitly — you are a guest, not a teacher.

SCENARIO CONTEXT
Your opening line was: "${openingLine}"

OBJECTIVES the staff member must accomplish to serve you correctly:
${objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

BEHAVIOUR
- Stay strictly in character at all times. Never break the fourth wall.
- React authentically to what the staff member says, driving toward the scenario objectives.
- If all objectives have been met, conclude naturally (e.g. thank the staff member and say goodbye).
- Do not summarise or explain what just happened. Just speak as the guest.`;
}

// ── Grading system prompt ─────────────────────────────────────────────────────

type GradingPromptArgs = {
  scenarioTitle: string;
  objectives: string[];
  transcript: string;
};

export function buildGradingSystemPrompt(): string {
  return `You are a senior examiner for hotel school Spanish oral exams.
Your task is to grade a student's performance using the submit_grade tool.
Be rigorous but fair. Base scores strictly on the transcript evidence provided.`;
}

export function buildGradingUserPrompt(args: GradingPromptArgs): string {
  const { scenarioTitle, objectives, transcript } = args;

  return `Grade the STUDENT'S Spanish (the "STAFF" lines only — ignore the AI guest lines).

SCENARIO: ${scenarioTitle}

OBJECTIVES THE STAFF MUST ACCOMPLISH:
${objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

TRANSCRIPT:
${transcript}

RUBRIC — score each criterion 0–20:

FLUENCY — natural flow, pace, confidence, minimal hesitation
  18–20: seamless and natural  |  14–17: mostly fluent  |  10–13: frequent pauses but communicative
  6–9: hesitant, hard to follow  |  0–5: very limited production

VOCABULARY — range and precision of hospitality-specific Spanish
  18–20: rich and varied terminology  |  14–17: good range  |  10–13: basic but sufficient
  6–9: notable gaps  |  0–5: severely limited

GRAMMAR — accuracy (verb conjugation, agreement, tense)
  18–20: near-perfect  |  14–17: minor errors only  |  10–13: frequent errors but understood
  6–9: major errors  |  0–5: severe breakdown

TASK COMPLETION — all scenario objectives accomplished
  18–20: all met professionally  |  14–17: most met  |  10–13: some met
  6–9: few attempted  |  0–5: none accomplished

REGISTER — appropriate formal register (usted, professional hospitality language throughout)
  18–20: perfect formal register  |  14–17: mostly formal, minor lapses
  10–13: mixed (some tú or casual language)  |  6–9: predominantly informal  |  0–5: no register awareness

Use the submit_grade tool to return your evaluation.`;
}
