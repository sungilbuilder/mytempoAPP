# 마이템포 (MYTEMPO) — 앱 소스

골프 스윙 템포 트레이닝 앱. React Native + Expo (SDK 54).

---

## 가장 빠른 확인 — 브라우저에서 실제 앱 보기

폰도 Wi-Fi도 필요 없습니다. `app/` 폴더의 **실제 화면 코드**가 크롬에서 그대로 돕니다.

```bash
cd "/Users/josungil/Desktop/claude projects/golf-tempo-app/HQ/03_Output_App"
```

```bash
npm run web
```

크롬에서 **F12 → 좌측 상단 폰 아이콘**(기기 툴바 전환)을 누르면 폰 크기로 볼 수 있습니다.

> 웹에서 **안 되는 것**: 진동, 화면 항상 켜기, 오디오 일부. 이 셋은 폰에서만 확인 가능합니다.
> 나머지 UI·네비게이션·저장·애니메이션은 폰과 동일합니다.

---

## 폰에서 보기

터미널에 **한 줄씩** 붙여넣으세요. (주석까지 같이 붙여넣으면 npm이 에러를 냅니다)

**1. 앱 폴더로 이동** — 절대경로라 어디서 실행해도 됩니다.

```bash
cd "/Users/josungil/Desktop/claude projects/golf-tempo-app/HQ/03_Output_App"
```

이모지 때문에 붙여넣기가 깨지면 이걸 쓰세요. 같은 곳으로 갑니다.

```bash
cd ~/Desktop/claude\ projects/golf-tempo-app/HQ/*Output_App
```

**2. 패키지 설치** — 최초 1회만.

```bash
npm run setup
```

**3. QR 띄우기** — 폰에서 Expo Go로 스캔.

```bash
npm run go
```

Wi-Fi가 다르거나 QR이 안 잡히면:

```bash
npm run go:tunnel
```

> **"Something went wrong" + 무한 로딩이 뜨면** Wi-Fi 문제가 아닐 가능성이 높습니다.
> Expo Go는 최신 SDK **하나만** 지원하므로, 폰의 Expo Go가 업데이트되면
> 프로젝트 SDK도 같이 올려야 합니다. (2026-07-30에 이걸 Wi-Fi 문제로 오진해 하루를 썼습니다)

---

## 고치기 전에 — `npm run audit`

```bash
npm run audit
```

대비(WCAG) · NativeWind 클래스 오타 · 접근성 라벨 · 오디오(루프 이음매·LUFS·트루피크) ·
`app.json` 스토어 필수값 · TypeScript를 한 번에 검사합니다. **실패 0건이 기본 상태입니다.**

2026-08-06 통합 리뷰의 결론이 *"만든 것을 확인하는 루프가 없었다"*였습니다.
P0 8건 중 절반이 "한 번 계산해봤으면 / 한 번 눌러봤으면" 나왔을 것들이라,
고치는 것과 함께 이 스크립트를 심었습니다. 사람이 기억해서 하는 검사는 언젠가 빠집니다.

소리를 바꿨다면:

```bash
npm run sounds    # 전 사운드 재생성 (seed 고정 — 결과가 항상 같습니다)
```

> ⚠️ audit이 통과해도 **Verified가 아닙니다.** 실기기 확인 항목은 볼트의 `T-06`에 있습니다.

### 문서는 이 저장소에 없습니다

기획·브랜드·법무 문서는 전부 옵시디언 볼트(`~/Documents/Obsidian Vault/MYTEMPO/`)에 있습니다.
자주 찾게 되는 것만:

| 궁금한 것 | 문서 |
|---|---|
| 소리를 왜 이렇게 만들었나 | `03_브랜드/사운드-아이덴티티.md` |
| **`app.json` 권한을 왜 이렇게 잡았나** (JSON이라 주석을 못 답니다) | `10_TODO/T-05-...권한.md` |
| 최근에 무엇을 왜 고쳤나 | `02_제품/_근거/AOS리뷰-반영-2026-08-06.md` |
| 무료/유료 경계 | `02_제품/v1.0-출시사양.md` · `10_TODO/T-09-...확정.md` |

---

## 2026-07-31 디자인 리뉴얼로 바뀐 것

- **탭 구조**: `프리셋 · 내 스윙 · 연습` → **`홈 · 내 스윙 · 기록`**
  - 프리셋 = 홈의 "템포 바꾸기"로 이동 (매번 고르는 화면이 아니라서)
  - 연습 = 전체화면으로 이동 (재생 중엔 탭바가 보일 이유가 없어서)
- **템포 링** — 백스윙(그린) : 다운스윙(골드) 비율을 링 하나로 보여주는 시그니처 컴포넌트
- **폰트** — 나눔고딕 → Noto Sans KR + Space Grotesk
- **저장이 실제로 남습니다** — 설정·온보딩·내 스윙·기록 전부 AsyncStorage 영속

브라우저에서 먼저 훑어보려면:
`HQ/📑_02_Workspace/product_design/mytempo-implemented-preview.html` (더블클릭)

---

## 실기기에서 확인할 것

- [ ] 템포 링이 그려지고, 재생 중 점이 링을 따라 도는지
- [ ] 라이트 ↔ 다크 전환 (설정 → 테마)
- [ ] **앱을 완전히 껐다 켠 뒤에도** 설정·등록한 스윙·기록이 남아있는지
- [ ] 임팩트에 진동이 오는지 (설정에서 끌 수 있음)
- [ ] 마킹 → 결과 → 등록 → 연습 → 기록 이 끝까지 이어지는지
- [ ] 연습 10초 이상 후 나가면 기록 탭에 남는지
- [ ] **시스템 뒤로가기로 나가도** 기록에 남는지 ← 2026-08-06 최우선

전체 검증 목록은 볼트의 `10_TODO/T-06-실기기-핵심검증-GalaxyS25.md`에 있습니다.

---

## 아직 안 된 것 (의도적)

| 항목 | 이유 |
|---|---|
| 카메라롤 영상 로딩 | 프레임 정확 탐색이 리스크 Top 3 — 아키텍처 설계 선행 필요. 마킹 화면은 타임라인 스크러버로만 동작 |
| expo-audio 마이그레이션 | expo-av가 SDK55에서 제거됨. 배속/loop 정밀도 검증 프로토타입이 선행 조건 (WBS 2.0, 승인 대기) |
| 내 스윙 비율 전용 오디오 | 지금은 가장 가까운 프리셋 루프를 빌려 씀. 임의 비율 생성은 오디오 엔진 재설계 과제 |

---

## 구조

```
app/
  index.tsx          진입 가드 (온보딩 여부로 분기)
  onboarding.tsx     3장 스와이프
  (tabs)/
    index.tsx        홈 — 오늘의 연습
    my-swings.tsx    내 스윙 목록
    history.tsx      기록 (스트릭·주간집계)
  presets.tsx        템포 고르기
  practice.tsx       연습 (전체화면 메트로놈)
  marking.tsx        스윙 3지점 마킹
  result.tsx         결과 — 성향 판정·저장
  settings.tsx       설정

components/
  TempoRing.tsx      시그니처 컴포넌트
  ui.tsx             버튼·카드·스위치·아이콘

components/
  Toast.tsx          화면을 막지 않는 한 줄 알림

features/
  tempo/             프리셋·성향판정·활성템포 훅
  audio-engine/      메트로놈 · 사운드팩 · 확인음 (expo-audio)
  premium/           저장된 설정을 "지금 쓸 수 있는 값"으로 좁히는 훅

store/               zustand + AsyncStorage 영속
  useEntitlementStore.ts   역방향 체험 7일 · 유료 경계
constants/theme.ts   raw hex (className 못 쓰는 곳용)
tailwind.config.js   디자인 토큰 원본

scripts/
  generate-sound-packs.py  전 사운드 생성 (npm run sounds)
  audio_tools.py           LUFS·트루피크·루프 진단
  audit.py                 자동 검증 (npm run audit)
```

## 고칠 때 지켜야 하는 것

- **색을 바꿀 땐 `tailwind.config.js`와 `constants/theme.ts`를 반드시 같이 고치세요.**
  한쪽만 고치면 라이트/다크가 어긋납니다. 고친 뒤 `npm run audit`으로 대비를 확인하세요.
- **골드(accent) 배경 위 텍스트는 `onAccent` 토큰만 씁니다.** 화면에서
  `colorScheme === 'dark' ? ... : '#FFFFFF'`로 조합하지 마세요 — 그게 주 CTA 대비가
  1.93:1이 됐던 이유입니다.
- **`subtle`은 장식 전용입니다.** 설명 텍스트에는 `muted`를 쓰세요.
- **루프 길이(2.0초)는 바꾸지 마세요.** 스윙 카운트와 링 애니메이션이 여기 묶여 있습니다.
  값은 `features/audio-engine/soundPacks.ts`의 `CYCLE_SEC` 하나뿐입니다.
- **아이콘만 있는 버튼은 `IconButton`을 쓰세요.** 라벨이 필수 prop이라 빼먹으면 타입 에러가 납니다.
