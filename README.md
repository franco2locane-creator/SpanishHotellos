# Spanish4Hoteleros — Developer Setup

Mobile app for hotel-school students practising Spanish oral exams. Expo + React Native, Supabase backend, Anthropic AI grading.

## Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Supabase CLI: `npm install -g supabase`
- Xcode 15+ (iOS) or Android Studio (Android)
- A Supabase project and an Anthropic API key

## 1. Clone and install

```bash
git clone <repo-url> spanish4hoteleros
cd spanish4hoteleros
npm install
```

## 2. Environment variables

Copy `.env.example` to `.env` and fill in values. Never commit `.env`.

```env
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_...
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
```

The Anthropic API key lives **only** in Supabase Edge Function secrets — never in this file.

## 3. Supabase local dev

```bash
supabase start          # starts local Postgres + Auth + Edge Runtime
supabase db reset       # applies all migrations
supabase functions serve --env-file ./supabase/.env.local
```

Create `supabase/.env.local` with:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

This file must stay out of git (already in `.gitignore`).

## 4. Run the app

```bash
npx expo start          # Metro bundler
# then press i (iOS Simulator) or a (Android Emulator) or scan QR
```

### Web (limited — speech recognition requires HTTPS)

```bash
npx expo start --web
```

Web uses a text-input fallback for role-play because Chrome's Web Speech API requires a secure origin.

## 5. Tests

```bash
npm test                # Jest + ts-jest, node environment
```

All test files are `lib/**/*.test.ts`. New tests must not import from `lib/today.ts`, `lib/supabase.ts`, or any file that pulls in `AsyncStorage` or Supabase — use pure function extraction instead (see `lib/grading.ts`, `lib/safeJson.ts`).

## 6. Supabase Edge Functions

| Function | Purpose |
|---|---|
| `roleplay` | Streams AI guest responses (claude-sonnet-4-6) |
| `grade` | Grades student transcript with tool-use rubric |
| `delete-account` | Soft-deletes user data (App Store requirement) |

Deploy all:

```bash
supabase functions deploy
```

**Security rule:** The Anthropic API key is set via `supabase secrets set ANTHROPIC_API_KEY=...` and read from `Deno.env.get('ANTHROPIC_API_KEY')` inside the functions. It never appears in client code or committed files.

## 7. EAS Build

```bash
eas build --profile development   # dev client (simulator)
eas build --profile preview       # internal distribution
eas build --profile production    # App Store / Play Store
```

Fill in `submit.production.ios.ascAppId` and `appleTeamId` in `eas.json` before your first production build.

Submit:

```bash
eas submit --platform ios --latest
eas submit --platform android --latest
```

## 8. RevenueCat

- Product ID: `spanish4hoteleros_full_access`
- Entitlement: `premium`
- Price: €9.99 one-time (non-consumable on iOS; one-time on Android)

Configure offerings in the RevenueCat dashboard and set API keys in `.env`.

## 9. Project structure

```
app/                   expo-router screens and layouts
  (tabs)/              bottom-tab screens (today, practice, progress)
  roleplay/[id]        role-play conversation screen
  vocab/[deckId]       flashcard deck session
  drill/[drillType]    drill screen
  exam/                mock exam prep + session + feedback
  paywall.tsx          purchase screen
components/            shared UI components
content/               static JSON (scenarios, vocab decks)
lib/                   pure helpers and API clients
  api/                 Supabase function callers
  scenarios/           catalog + loader
  vocab/               deck catalog + SRS
  grading.ts           pure score computation (also tested)
  safeJson.ts          defensive JSON parsing
  srs.ts               SM-2 spaced repetition algorithm
  today.ts             streak, tiles, study plan
stores/                Zustand stores
supabase/
  functions/           Edge Functions (Deno)
  migrations/          SQL migrations
types/                 shared TypeScript types
```

## 10. Conventions

- Functional components and hooks only — no class components
- All user-facing strings go in `lib/i18n.ts`
- Files under 300 lines; extract aggressively
- `Platform.OS === 'web'` guards for any native-only API
- `router.canGoBack() ? router.back() : router.replace('/(tabs)')` for all back navigation
