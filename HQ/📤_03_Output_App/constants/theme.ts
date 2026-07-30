/**
 * 마이템포 디자인 시스템 (WBS 1.4 → 1.5 다크 → 1.6 라이트/다크 토글)
 * 근거: HQ/📑_02_Workspace/product_design/light-dark-mode-guideline.md
 *
 * 화면 컴포넌트는 NativeWind className(`bg-bg dark:bg-bgDark` 등, tailwind.config.js와 동일 토큰)을
 * 우선 사용한다. 이 파일은 React Navigation의 headerStyle/tabBarStyle처럼 className을 못 쓰는
 * 곳에서 현재 컬러스킴에 맞는 raw hex를 골라 쓰기 위한 것 (app/(tabs)/_layout.tsx 참고).
 */
export const lightColors = {
  bg: '#FAF8F2',
  surface: '#FFFFFF',
  surface2: '#F3EFE2',
  line: '#E3DFD1',
  ink: '#26331F',
  muted: '#6E7C66',
  disabled: '#B9C2B2',
  accent: '#436437', // 라이트모드 활성 탭 등에 쓰는 차분한 그린
  gold: '#D4AF37',
  onAccent: '#F7F1E0',
} as const;

export const darkColors = {
  bg: '#101410',
  surface: '#181D17',
  surface2: '#20261F',
  line: '#2B322A',
  ink: '#F5F7F2',
  muted: '#A9B3A5',
  disabled: '#5C6459',
  accent: '#5FC639', // 다크모드 활성 탭 등에 쓰는 네온 그린
  gold: '#EFC94D',
  onAccent: '#0A0F09',
} as const;

export type AppColors = typeof lightColors;
