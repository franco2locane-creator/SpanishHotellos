import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Spanish4Hoteleros',
  slug: 'spanish4hoteleros',
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    revenueCatApiKey: process.env.REVENUECAT_API_KEY,
  },
});
