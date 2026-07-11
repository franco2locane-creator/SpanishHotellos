import { ExpoConfig, ConfigContext } from 'expo/config';

// Guard: EXPO_PUBLIC_PREMIUM_PREVIEW forces usePremium() to true (see
// lib/premiumGating.ts) and must only ever be set on the `preview` EAS build
// profile (eas.json). EAS sets EAS_BUILD_PROFILE automatically during cloud
// builds — hard-fail here rather than silently shipping a production build
// where the paywall is unreachable.
if (process.env.EAS_BUILD_PROFILE === 'production' && process.env.EXPO_PUBLIC_PREMIUM_PREVIEW === '1') {
  throw new Error(
    'EXPO_PUBLIC_PREMIUM_PREVIEW must never be set on the production build profile — check eas.json.'
  );
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Spanish4Hoteleros',
  slug: 'spanish4hoteleros',
  ios: {
    ...(config.ios ?? {}),
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    revenueCatApiKey: process.env.EXPO_PUBLIC_REVENUECAT_API_KEY,
    eas: { projectId: '3fdc630d-c767-4152-9706-d3b2287559c2' },
  },
});
