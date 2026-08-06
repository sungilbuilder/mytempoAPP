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
  /**
   * 골드(accent) 위에 얹는 텍스트·아이콘 색 (2026-08-06 신설, AOS 리뷰 V-1).
   *
   * 이전엔 화면마다 `colorScheme === 'dark' ? c.onPrimary : '#FFFFFF'`를 직접 썼다.
   * 라이트에서 흰색을 얹으면 **1.93:1** — WCAG AA(4.5:1)의 절반도 안 되는 값이고,
   * 야외 연습장에서 쓰는 앱이라 실사용은 계산값보다 더 나쁘다.
   * 골드 위에는 먹색을 얹는다 → **8.61:1**. (다크는 이미 12.45:1이라 그대로)
   *
   * ⚠️ 이 토큰이 생긴 이유가 "화면마다 색을 직접 조합했기 때문"이므로,
   * 골드 배경 위 텍스트는 반드시 `onAccent`(또는 클래스 `text-onAccent`)를 쓴다.
   */
  onAccent: '#16211A',
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
  /**
   * 2026-08-06: #7E8A79 → #8A9782 (AOS 리뷰 V-3).
   * Caption 기본색을 subtle에서 muted로 올리면서 muted 자체도 재검증했는데,
   * 기존 값은 surface2 위에서 4.08:1로 미달이었다(bg 위 5.26만 보고 통과로 봤던 값).
   * 앱에서 가장 흔한 조합은 카드 안(surface2)이라 그쪽을 기준으로 잡는다.
   *   bg 6.19 · surface 5.64 · surface2 4.81 · track 4.70 — 전 조합 AA 통과
   */
  muted: '#8A9782',
  subtle: '#5C6659',
  track: '#232C21',
  onPrimary: '#0A0F09',
  /** 골드 위 텍스트 — 다크는 원래 값이 정상(12.45:1)이라 그대로 토큰화만 한다 */
  onAccent: '#0A0F09',
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
