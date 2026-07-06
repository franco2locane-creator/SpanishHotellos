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
    greeting: 'Good morning',
    subtitle: 'Ready to practice your Spanish?',
  },
  practice: {
    title: 'Practice',
    subtitle: 'Choose a role-play scenario',
    freeBadge: 'Free',
    premiumBadge: 'Premium',
  },
  mockExam: {
    title: 'Mock Exam',
    subtitle: 'Simulate a real oral exam',
    startButton: 'Start Exam',
    freeLimit: '1 free attempt included',
  },
  progress: {
    title: 'Progress',
    subtitle: 'Track your improvement',
  },
  common: {
    loading: 'Loading…',
    error: 'Something went wrong.',
    retry: 'Retry',
    unlock: 'Unlock Full Access — €9.99',
    unlockSubtitle: 'One-time purchase, no subscription',
  },
} as const;

export default strings;
