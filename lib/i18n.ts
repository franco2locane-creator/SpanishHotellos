// All user-facing UI strings live here. Learning content (Spanish) lives in content/*.json.
const strings = {
  tabs: {
    today: 'Today',
    practice: 'Practice',
    mockExam: 'Mock Exam',
    progress: 'Progress',
  },
  today: {
    title: 'Today',
    sessionTitle: "Today's 15-minute session",
    sessionDone: "Today's session complete",
  },
  emptyStates: {
    // Vocab review
    vocabAllCaughtUp: {
      title: "You're all caught up",
      body: 'No cards due right now — your spacing is working. Come back tomorrow to keep the streak.',
      cta: 'Back to decks',
    },
    // Progress screen
    progressNone: {
      title: 'Your first session is the hardest',
      body: "Complete a role-play or mock exam and you'll see your scores and improvement here. You've got this.",
      cta: 'Start practising',
    },
    // Trend chart (< 2 sessions)
    progressNeedMore: 'Complete 2 or more sessions to see your trend',
  },
  roleplay: {
    startBtn: 'Start conversation',
    grading: 'Grading your session…',
    gradingDetail: 'Looking at fluency, vocabulary, grammar, task completion and register.',
    done: 'Session complete',
    interruptedTitle: 'Exam paused',
    interruptedBody: 'It looks like something interrupted your session — a call, maybe. This attempt has been voided. No worries, just retry when you\'re ready.',
    retryBtn: 'Retry this assignment',
    errorRetry: 'Connection issue. Check your signal and try again.',
  },
  vocab: {
    speakItOn: '🎤 Speak-it ON',
    speakItOff: '🎤 Speak-it',
    sessionDone: 'Session complete',
    allCaughtUp: "All caught up!",
  },
  feedback: {
    excellent: 'Excellent',
    good: 'Good',
    developing: 'Getting there',
    needsWork: 'Needs more practice',
    passLabel: 'PASS',
    failLabel: 'Not yet',
    backBtn: 'Back to Practice',
    topThingsTitle: 'Top 3 things to work on',
  },
  mockExam: {
    examComplete: 'Exam complete',
    pass: 'PASS',
    fail: 'Not yet — keep practising',
    passNote: 'Pass mark: 60/100',
    topImprovements: 'Areas to focus on',
    backBtn: 'Back to Mock Exams',
    assignmentBreakdown: 'Assignment breakdown',
  },
  settings: {
    title: 'Settings',
    accountSection: 'Account',
    examDateSection: 'Exam date',
    courseYearSection: 'Course year',
    saveBtn: 'Save changes',
    signOutBtn: 'Sign out',
    deleteAccountBtn: 'Delete account',
    deleteAccountConfirm: 'This will permanently delete your account and all your data — scores, vocab progress, everything. This cannot be undone.',
    deleteAccountAction: 'Delete my account',
  },
  common: {
    loading: 'Loading…',
    error: 'Something went wrong.',
    retry: 'Try again',
    back: 'Back',
    cancel: 'Cancel',
    unlock: 'Unlock Full Access — €9.99',
    unlockSubtitle: 'One-time purchase · No subscription',
  },
} as const;

export default strings;
