# 아키텍처 검토 — NativeWind + Reanimated + Expo-Blur 도입 (WBS 1.5)

`[@golf-mobile-architect]` · 2026-07-30

## 결정: 도입 승인 (조건부)

창업자 지시대로 NativeWind(Tailwind for RN)를 스타일링 방식으로 도입한다. 기존 `StyleSheet.create` 방식과 공존 가능(파일 단위로 점진 전환 가능)하므로 기존 코드(프리셋/연습/내 스윙 화면)를 한 번에 다 바꾸지 않아도 위험이 낮음.

**추가 패키지**: `nativewind`, `tailwindcss`(devDependency), `react-native-reanimated`, `expo-blur`

**설정 변경**:
- `babel.config.js`: `presets: ['babel-preset-expo']`는 유지하되 NativeWind는 Babel 프리셋이 아니라 **Metro 플러그인**(`nativewind/metro`) 방식으로 붙인다(Expo SDK 51 + NativeWind v4 기준). `react-native-reanimated/plugin`은 babel `plugins` 배열의 **반드시 마지막**에 추가(reanimated 공식 요구사항).
- `metro.config.js`(신규): `withNativeWind(getDefaultConfig(__dirname), { input: './global.css' })`
- `tailwind.config.js`(신규): `content` 경로에 `app/**/*.{ts,tsx}` 포함, `theme.extend.colors`에 브랜드 토큰(그린/골드 네온 포함) 등록
- `global.css`(신규): Tailwind 3-directive, `app/_layout.tsx`에서 최상단 import
- `nativewind-env.d.ts`(신규): `/// <reference types="nativewind/types" />` — TS에서 `className` prop 인식용

## 리스크 / 확인 필요 (Founder_Review 대상 아님, 기술 리스크)

1. **이 샌드박스는 `registry.npmjs.org` 접근이 막혀 있어 `npm install`을 실행/검증하지 못함.** 버전 호환(Expo SDK 51 ↔ NativeWind v4 ↔ reanimated 최신 버전) 조합은 로컬에서 `npm install` 후 `npx expo start` 1회 실행으로 반드시 확인 필요 — 특히 NativeWind는 메이저 버전 간 설정 방식이 자주 바뀌므로, 설치 시 공식 문서 버전과 아래 설정이 다르면 `nativewind` 공식 setup 가이드를 우선한다.
2. **react-native-reanimated는 네이티브 코드가 포함**되어 있어 Expo Go에서 일부 최신 기능이 제한될 수 있음 — 문제가 있으면 EAS Build(Dev Client)로 전환 필요.
3. 기존 리스크 Top 3(오디오 타이밍/프레임 탐색/대용량 비디오 저장)와는 무관한 변경이라 PLANNING.md 6절의 핵심 아키텍처 결정에는 영향 없음.

## 적용 범위

이번 리팩토링은 메인 화면(프리셋/연습/내 스윙)에 한정. 아직 구현되지 않은 스윙 마킹 화면(Phase 2)은 실제 구현 시점에 처음부터 NativeWind로 작성하면 되므로 별도 마이그레이션 불필요.
