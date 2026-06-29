/**
 * Central design tokens for AniJikan.
 * Dark, "anime streaming app" aesthetic with an indigo/violet accent.
 */
export const colors = {
  bg: '#0B1020',
  bgElevated: '#141A2E',
  card: '#171E36',
  cardAlt: '#1E2740',
  border: '#26304D',
  primary: '#7C5CFC',
  primaryDark: '#5B3FD6',
  accent: '#34D6C8',
  text: '#F4F6FB',
  textMuted: '#9AA3BD',
  textFaint: '#5B6483',
  star: '#FFC542',
  danger: '#FF5C7A',
  success: '#43D9A3',
  overlay: 'rgba(7, 10, 20, 0.78)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const font = {
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 18,
    xl: 22,
    xxl: 28,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
} as const;
