export const Colors = {
  // Primary palette — warm, professional hospitality
  navy: '#1B3A5C',
  navyLight: '#2A5480',
  navyDark: '#0F2233',

  gold: '#C8973A',
  goldLight: '#E0B96A',
  goldDark: '#9E7220',

  // Backgrounds
  background: '#F8F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#F0EDE8',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#5A5A5A',
  textMuted: '#9A9A9A',
  textOnDark: '#FFFFFF',
  textOnGold: '#1A1A1A',

  // Semantic
  success: '#2D7A4F',
  warning: '#B97D2A',
  error: '#C0392B',
  info: '#2471A3',

  // Borders
  border: '#E0DDD8',
  borderStrong: '#C8C5C0',

  // Tab bar
  tabActive: '#C8973A',
  tabInactive: '#9A9A9A',
  tabBackground: '#FFFFFF',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Typography = {
  // Font sizes
  caption: 11,
  body: 15,
  bodyLarge: 17,
  subtitle: 19,
  title: 22,
  heading: 26,
  display: 32,

  // Line heights
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.7,

  // Font weights (as string literals for RN compatibility)
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export const Radii = {
  sm: 6,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
  },
} as const;
