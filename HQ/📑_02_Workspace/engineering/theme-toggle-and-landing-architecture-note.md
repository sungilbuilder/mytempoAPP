# 테마 토글 + 랜딩페이지 기술 아키텍처 노트

`[@golf-mobile-architect]` · 2026-07-30 · WBS 1.6/1.7 · **이번 라운드는 기획 단계 — 코드 구현은 다음 개발 착수 시점으로 보류**

## 1. 라이트/다크 토글 구현 방식

NativeWind v4는 이미 도입했으므로(WBS 1.5) 별도 커스텀 ThemeContext를 새로 만들 필요 없이 **NativeWind 내장 색상 스킴 API**를 그대로 쓰면 된다.

- `tailwind.config.js`에 `darkMode: 'class'` 설정 추가(수동 전환 지원에 필요).
- 컴포넌트에서 `className="bg-[#FAF8F2] dark:bg-bg text-[#26331F] dark:text-ink"`처럼 **모든 컬러 클래스에 `dark:` variant를 병행 표기**하는 방식으로 `light-dark-mode-guideline.md`의 매핑 테이블을 반영.
- 설정 화면(우상단 톱니바퀴)에서 라이트/다크/시스템 3버튼 → NativeWind의 `colorScheme.set('light' | 'dark' | 'system')` 호출. `useColorScheme()`으로 현재 값을 읽어 선택 UI에 표시.
- 선택값은 NativeWind가 내부적으로 유지하지만, 앱 재시작 후에도 유지하려면 AsyncStorage에 별도 저장 후 앱 시작 시 `colorScheme.set()`으로 복원하는 코드가 한 줄 필요(NativeWind 자체 영속성 여부는 버전별로 달라 구현 시점에 재확인).

**리스크**: `darkMode:'class'` + 수동 토글 조합은 NativeWind 메이저 버전 간 API가 자주 바뀌는 영역이라, 구현 시점의 공식 문서를 반드시 재확인할 것(이 노트 작성 시점 기준 지식이라 실제 구현 때 API가 달라졌을 수 있음).

## 2. 랜딩/온보딩 페이지 라우팅

expo-router 구조에 진입 가드 화면을 하나 추가하는 방식을 제안한다.

```
app/index.tsx        # 신규: 진입 가드 — AsyncStorage(hasSeenOnboarding) 확인 후 리다이렉트
app/onboarding.tsx    # 신규: 3장 스와이프 랜딩(온보딩) 화면
app/(tabs)/...        # 기존 유지
```

- `app/index.tsx`가 앱 시작 시 최초 진입점이 되도록 `app/_layout.tsx`의 `Stack`에 순서 배치. `hasSeenOnboarding`이 없으면 `router.replace('/onboarding')`, 있으면 `router.replace('/(tabs)')`.
- 온보딩 마지막 CTA("무료로 시작하기")에서 AsyncStorage에 플래그 저장 후 `/(tabs)`로 이동.
- 스와이프 캐러셀 구현은 새 제스처 라이브러리를 추가하지 않고 **`ScrollView horizontal pagingEnabled` + `onMomentumScrollEnd`**로 충분(react-native-gesture-handler 등 추가 의존성 불필요, 리스크 최소화). 진행 바/도트는 스크롤 위치 기반 인덱스로 갱신.
- 베스트/펄스 링 애니메이션은 이미 도입된 `react-native-reanimated`의 `withRepeat(withTiming(...))`로 구현(이번에도 새 패키지 불필요).

## 3. (선택) 인터랙션 디테일 강화 — 새 의존성 필요

CTA/도트 탭에 햅틱 피드백을 주면 "인터랙티브함"이 한층 살아난다. `expo-haptics`(Expo 공식, Expo Go 지원) 추가를 제안 — 다만 이것도 새 패키지 추가이니 창업자 확인 후 진행. 필수는 아니고 있으면 좋은 정도.

## 4. 영향받는 기존 코드
- `app/_layout.tsx`: Stack에 `index`/`onboarding` 라우트 등록 필요
- `tailwind.config.js`: `darkMode:'class'` 추가, 라이트 토큰 추가
- 기존 3개 화면(프리셋/연습/내 스윙): 모든 색상 클래스에 `dark:` variant 병행 표기로 리라이트 필요(WBS 1.5에서 다크 전용으로 짠 클래스를 라이트 기본값+dark: 오버라이드 구조로 다시 정리)

## 5. 다음 단계
실제 코드 반영은 WBS 1.8(가칭, 아래 5절 로드맵 참고)로 별도 착수. 이번엔 계획만 확정.
