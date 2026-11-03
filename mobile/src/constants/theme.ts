import { Platform, ViewStyle } from 'react-native';

export const colors = {
  primary: '#4F46E5',
  primarySoft: '#EEF2FF',
  accent: '#F97316',
  accentSoft: '#FFF7ED',
  bg: '#F4F6FB',
  card: '#FFFFFF',
  text: '#0F172A',
  textSoft: '#475569',
  muted: '#94A3B8',
  border: '#E2E8F0',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  star: '#F59E0B',
  white: '#FFFFFF',
} as const;

export const gradients = {
  brand: ['#4F46E5', '#7C3AED'] as const,
  sale: ['#F97316', '#DB2777'] as const,
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export function shadow(level: 1 | 2 | 3 = 1): ViewStyle {
  const map = {
    1: { elevation: 2, opacity: 0.06, radius: 6, y: 2 },
    2: { elevation: 5, opacity: 0.1, radius: 12, y: 4 },
    3: { elevation: 10, opacity: 0.16, radius: 18, y: 8 },
  }[level];
  return Platform.select<ViewStyle>({
    android: { elevation: map.elevation },
    default: {
      shadowColor: '#0F172A',
      shadowOpacity: map.opacity,
      shadowRadius: map.radius,
      shadowOffset: { width: 0, height: map.y },
    },
  });
}
