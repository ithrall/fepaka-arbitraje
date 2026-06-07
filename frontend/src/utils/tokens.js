/**
 * FEPAKA Design System — Tokens
 * Single source of truth for all design decisions.
 * Change here → changes everywhere.
 */

export const colors = {
  brand: {
    red: '#C8102E',
    redDark: '#9B0C22',
    redLight: '#FEF2F2',
    redMuted: 'rgba(200,16,46,0.08)',
  },
  accent: {
    gold: '#F5A623',
    goldLight: '#FEF3DC',
  },
  neutral: {
    900: '#0F172A',
    800: '#1E293B',
    700: '#334155',
    500: '#64748B',
    400: '#94A3B8',
    300: '#CBD5E1',
    200: '#E2E8F0',
    100: '#F1F5F9',
    0:   '#FFFFFF',
  },
  semantic: {
    success: '#10B981',
    successLight: '#ECFDF5',
    successBorder: '#6EE7B7',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
    error: '#EF4444',
    errorLight: '#FEF2F2',
    errorBorder: '#FCA5A5',
    info: '#3B82F6',
    infoLight: '#EFF6FF',
  },
}

export const typography = {
  fontDisplay: "'Bebas Neue', sans-serif",
  fontBody: "'DM Sans', sans-serif",
  fontMono: "'JetBrains Mono', monospace",
  size: {
    xs: '11px', sm: '12px', base: '13px', md: '14px',
    lg: '15px', xl: '17px', '2xl': '20px', '3xl': '24px',
  },
  weight: { normal: 400, medium: 500, semibold: 600 },
  letterSpacing: { tight: '-0.01em', normal: '0', wide: '0.05em', widest: '0.15em' },
}

export const spacing = {
  1: '4px', 2: '8px', 3: '12px', 4: '16px', 5: '20px',
  6: '24px', 7: '28px', 8: '32px', 10: '40px', 12: '48px',
}

export const radii = {
  sm: '6px', md: '8px', lg: '10px', xl: '12px',
  '2xl': '14px', '3xl': '20px', full: '9999px',
}

export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 4px 12px rgba(0,0,0,0.08)',
  lg: '0 8px 24px rgba(0,0,0,0.12)',
  focus: '0 0 0 3px rgba(200,16,46,0.15)',
}

export const transitions = {
  fast: 'all 0.15s ease',
  base: 'all 0.2s ease',
  slow: 'all 0.3s ease',
}
