/**
 * 마이템포 디자인 시스템 — raw hex 사본 (2026-07-31 프리미엄 리디자인 반영)
 *
 * 화면 컴포넌트는 NativeWind className(`bg-bg dark:bg-bgDark` 등)을 우선 사용한다.
 * 이 파일은 className을 못 쓰는 곳 — React Navigation의 tabBarStyle,
 * react-native-svg의 stroke/fill prop, StatusBar 색상 등 — 에서 쓰기 위한 것이다.
 *
 * ⚠️ tailwind.config.js와 값이 반드시 일치해야 한다. 한쪽만 고치면 라이트/다크가 어긋난다.
 */
export const lightColors = {
  bg: '#FBFAF6',
  surface: '#FFFFFF',
  surface2: '#F2F0E8',
  line: '#E7E4D9',
  ink: '#16211A',
  muted: '#5F6C5C',
  subtle: '#8A9382',
  track: '#F0EEE6',
  onPrimary: '#F2F5EE',
  primary: '#3F6136',
  primaryDeep: '#2E4A24',
  primarySoft: '#4A7040',
  accent: '#D9B84A',
  accentDeep: '#C9A431',
} as const;

export const darkColors = {
  bg: '#0D110D',
  surface: '#161C15',
  surface2: '#222A20',
  line: '#2C3629',
  ink: '#F2F5EE',
  muted: '#7E8A79',
  subtle: '#5C6659',
  track: '#232C21',
  onPrimary: '#0A0F09',
  primary: '#7ED45C',
  primaryDeep: '#4E8C39',
  primarySoft: '#4E8C39',
  accent: '#E9CE6C',
  accentDeep: '#E4C863',
} as const;

export type AppColors = typeof lightColors;

/** 8pt 그리드 (Turn 4 SPACING) */
export const space = { s1: 8, s2: 16, s3: 24, s4: 32, s6: 48 } as const;

/** RADIUS 12 · 18 · 24 · 999 */
export const radius = { sm: 12, card: 18, lg: 24, pill: 999 } as const;

/**
 * 현재 컬러스킴에 맞는 팔레트를 고른다.
 * nativewind의 useColorScheme() 결과를 그대로 넘기면 된다.
 */
export function palette(scheme: 'light' | 'dark' | null | undefined): AppColors {
  return scheme === 'dark' ? (darkColors as unknown as AppColors) : lightColors;
}
