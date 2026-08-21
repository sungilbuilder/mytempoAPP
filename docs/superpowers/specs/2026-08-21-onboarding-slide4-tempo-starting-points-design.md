# 온보딩 4번째 슬라이드 — "3:1 배지 + 속도 눈금" 시각 요소 교체

- 상태: 승인됨 (대화로 확정, 2026-08-21)
- 관련: T-45(오늘 신설된 4번째 슬라이드), swingSpeeds.ts, presets.ts

## 왜 하는가

T-45가 오늘 온보딩에 4번째 슬라이드("추천 템포는 목표가 아니에요")를 새로 추가했다.
문구는 "3:1 비율이 반복 관찰된다"는 **비율 축** 얘기인데, 붙어있는 시각 요소
(`RecommendedTempoPreview`)는 비율 프리셋 3종(2.5:1/3:1/3.5:1)을 나열해 **다른 축**을
보여주고 있었다 — 문구와 화면이 서로 다른 걸 말하는 상태.

대화로 문구를 다시 확정하면서(창업자 요청) 슬라이드의 실제 메시지는 "속도는 다양해도
비율(3:1)은 일관된다"로 정리됐다. 시각 요소도 여기 맞춰 새로 설계한다.

## 범위

1. 슬라이드4 시각 요소를 `RecommendedTempoPreview`(비율 3종 리스트)에서 새 컴포넌트로 교체
2. 슬라이드4 title/body i18n 텍스트 확정 (ko/en)
3. 온보딩 마지막 CTA 버튼 라벨 변경 ("시작하기"/"Get started" → "내 템포 찾기"/"Find My Tempo")
4. `onboarding.tsx` 상단 주석의 stale 문서(4장→5장, 시각 요소 목록 누락) 정정

## 설계

### 1. 새 컴포넌트 — `TempoStartingPoints`

`app/onboarding.tsx`의 `RecommendedTempoPreview`를 대체한다. 위치는 기존 함수와 같은 자리
(③.5 구역), import에 `SWING_SPEEDS`, `swingSecLabel`을 `features/tempo/swingSpeeds`에서
추가한다(`DEFAULT_SWING_SPEED`는 이미 import돼 있음).

**구조 (위→아래):**
- 작은 "3:1" 배지 — pill 모양, `primary` 색 텍스트, 옅은 배경. 슬라이드2의 큰 "3 : 1"
  숫자(`numeralScaling` + `text-h1`)보다 확실히 작은 크기(`text-caption` 수준)로 —
  이 슬라이드의 주인공은 아래 4개 숫자지 비율 자체가 아니다.
- 가로 눈금선(`View`, 1px, `c.line` 색) 위에 점 4개 + 각 점 아래 초 단위 캡션.

**데이터 소스:** `SWING_SPEEDS` 배열을 그대로 `.map()`한다. 숫자를 하드코딩하지 않는다 —
대화 중 "1.05초"로 잘못 옮겨 적을 뻔한 사례가 있었고, 이 배열이 이미 "느린 것→빠른 것"
순으로 정렬돼 있어(주석 근거) 추가 정렬 로직도 필요 없다. 라벨 포맷은 기존
`swingSecLabel(s.swingSec)` + `t('domain:units.seconds', { value })`(`"{{value}}초"`)를
그대로 재사용 — 다른 화면(연습·결과)과 숫자 표기가 이 화면만 다르게 보이는 걸 막는다.

**위계 없음:** 4개 점 모두 같은 크기·같은 색으로 그린다. 어느 점도 "추천 단계"로
강조하지 않는다 — `swingSpeeds.ts` 설계 원칙("어느 것도 상위 단계로 표시하지 않는다")을
그대로 따른다. `nearestPreset` 등 사용자 실측값과 비교하는 로직은 이 슬라이드엔 없다
(사용자가 아직 스윙을 등록하기 전 시점 — 슬라이드2보다 앞서는 화면이므로 비교 대상 자체가
없다).

**컨테이너 크기:** 형제 컴포넌트(`TempoBar`, `RecommendedTempoPreview`)와 맞춰
`max-w-[220px]` 안에 배치.

### 2. i18n 텍스트

`i18n/locales/ko/onboarding.json` `slides.4`:
```json
{
  "title": "템포를 추천해드려요",
  "body": "실제 스윙에서 반복되는 3:1 리듬을 담았어요.\n내게 맞는 템포를 찾는 시작점이에요."
}
```

`i18n/locales/en/onboarding.json` `slides.4`:
```json
{
  "title": "We recommend\na tempo",
  "body": "Built around the 3:1 rhythm that\nrepeats in real swings — your starting point."
}
```

### 3. CTA 라벨

`start` 키 하나(버튼 텍스트 + accessibilityLabel 공용, 사용처 1곳 — `onboarding.tsx`의
마지막 슬라이드 CTA):
- ko: `"시작하기"` → `"내 템포 찾기"`
- en: `"Get started"` → `"Find My Tempo"`

### 4. 문서 정정 (부수 작업)

`onboarding.tsx` 상단 주석:
- "온보딩 — 4장 스와이프" → "온보딩 — 5장 스와이프"
- 시각 요소 목록에 ④ 항목으로 이번에 만드는 "3:1 배지 + 속도 눈금" 추가, 기존 ④(테마
  미리보기)는 ⑤로 밀림. 본문 중 "④를 온보딩에 둔 이유" 단락의 번호도 ⑤로 갱신.

## 테스트

이 저장소에 스냅샷/렌더 테스트가 있는 화면이면 그에 맞춰 추가하되, 온보딩 화면 자체는
기존에도 별도 컴포넌트 테스트가 없어 보인다(코드 탐색 결과 `app/onboarding.tsx`에 대응하는
`__tests__` 없음) — 그 관례를 벗어나 새 테스트 하네스를 여기서 만들지는 않는다. 대신
`swingSecLabel`/`SWING_SPEEDS`를 참조하는 방식이므로 기존 `swingSpeeds.test.ts`가 이미
보장하는 값 검증(4개 정렬 순서·소수점 포맷)을 그대로 상속한다. 구현 후 `npx tsc --noEmit`
· `npx eslint` · `npx jest`로 회귀 확인.

## 범위 밖

- 슬라이드2/3 문구·시각 변경 (이번 대화에서 별도 논의 안 됨)
- 접근성 라벨 신설 — 형제 컴포넌트(`TempoBar`, `BallBadge`)도 별도 `accessibilityLabel` 없이
  자식 `Text`를 그대로 노출하는 패턴이라 동일하게 따른다. 이 패턴 자체를 개선하는 건 이
  작업의 범위가 아니다.
