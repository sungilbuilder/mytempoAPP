# PM 라운드테이블 #2 — SDK 54 업그레이드 이후 기술부채 및 다음 스프린트

`[@golf-strategy-lead] [@golf-product-planner] [@golf-ux-designer] [@golf-mobile-architect] [@golf-mobile-developer] [@golf-qa-tester] [@golf-finance-analyst] [@golf-legal-privacy] [@golf-benchmarker]`
· 2026-07-30 (심야) · 소집: PM(창업자) · 계기: **실기기(갤럭시 S25) 최초 구동 성공**

---

## 0. 이 미팅의 배경 — 한 줄 요약

프로젝트 착수 이래 처음으로 **실기기에서 앱이 실제로 돌아갔다.** 동시에, 그 과정에서 "정적 코드 리뷰만으로는 절대 못 잡는 문제"가 4건 연달아 터졌다. 이 미팅은 그 4건을 기록하고, SDK 54로 강제 이동한 대가로 새로 생긴 부채를 정리하고, 다음 스프린트 우선순위를 다시 세우는 자리다.

## 1. 오늘 실기기 구동까지의 실제 경로 (문제 → 원인 → 조치)

| # | 증상 | 진짜 원인 | 조치 | 교훈 |
|---|---|---|---|---|
| 1 | Expo Go 무한 로딩 / `Failed to download remote update` | 초기엔 네트워크(Wi-Fi 불일치)로 오진 → 실제로는 **Expo Go가 SDK 54만 지원**하는데 프로젝트가 SDK 51 | SDK 51 → 54 강제 업그레이드 | Expo Go는 최신 SDK 1개만 지원. SDK 선택은 "우리 선호"가 아니라 **Expo Go 버전에 종속**된 제약 조건 |
| 2 | `Cannot find module 'react-native-worklets/plugin'` | Reanimated v4부터 워크릿 처리가 `react-native-worklets` 별도 패키지로 분리 | babel 플러그인 교체 + 패키지 설치 | 메이저 버전 점프는 설정 파일까지 바꾼다 |
| 3 | 앱 아이콘(스플래시)만 뜨고 아무 동작 없음 | `_layout.tsx`가 `if (!fontsLoaded) return <빈 화면>` → **폰트 로드 실패 시 영구 정지** | 실패 시 시스템 폰트로 폴백해 앱을 띄우도록 수정 + 경고 로그 | 로딩 게이트에 실패 경로가 없으면 그대로 데드락이 된다 |
| 4 | `Cannot find module 'babel-preset-expo'` | 직접 의존성이 아니라 다른 패키지에 얹혀 우연히 해결되던 것이, 설치 트리 변경으로 깨짐 | `devDependencies`에 명시적 추가 | 암묵적(hoisted) 의존은 언제든 깨진다 |

추가로 NativeWind v4의 **babel 프리셋 설정(`jsxImportSource` + `nativewind/babel`)이 누락**돼 있었던 것도 이번에 발견해 수정했다. metro 설정만 있으면 `className`이 조용히 무시될 수 있는 구성이었다.

## 2. 부서별 의견

### `[@golf-qa-tester]` — 가장 중요한 프로세스 지적
지난 라운드에 내가 "정적 리뷰 완료, 발견된 추가 이슈 없음"으로 Daily_Report에 Done을 찍었다. 그런데 오늘 실기기에서 **4건이 연달아 터졌고**, 그중 3건(SDK 불일치, worklets 분리, babel-preset 누락)은 애초에 코드를 읽어서 잡을 수 있는 종류가 아니었다. 샌드박스에서 빌드를 못 돈다는 제약을 리포트에 계속 명시해왔지만, 그것과 별개로 **"Done" 판정 기준 자체가 잘못돼 있었다.**

제안 — WBS 상태값을 두 단계로 분리한다:
- `Code Complete`: 코드 작성 + 정적 리뷰 완료 (지금까지 우리가 Done이라 불렀던 것)
- `Verified`: 창업자 로컬 실기기에서 실제 구동 확인

앞으로 어떤 개발 태스크도 창업자 실기기 확인 없이는 `Verified`가 될 수 없다. 오늘 이전에 Done으로 찍혀 있던 WBS 1.5~1.8은 전부 `Verified`로 승격 가능하지만, 그건 오늘 실기기 확인이 있었기 때문이다.

### `[@golf-mobile-architect]` — 가장 시급한 리스크: expo-av
독립 확인 결과, **`expo-av`는 SDK 55에서 완전히 제거된다.** SDK 54가 마지막 동거 버전이고 이미 패치도 안 나온다. 문제는 이게 우리 앱의 **핵심 기능**이라는 점이다 — `features/audio-engine/metronome.ts` 전체가 `Audio.Sound`, `setRateAsync`, `setAudioModeAsync` 위에 올라가 있다. 즉 메트로놈 = 이 앱의 존재 이유가 곧 사라질 API에 묶여 있다.

그리고 오늘 배운 대로 **Expo Go가 최신 SDK만 지원하므로, SDK 55가 나오면 우리는 또 강제로 올라가야 한다.** 그때 expo-av는 없다. 이건 "나중에 하면 되는 개선"이 아니라 **시한부 폭탄**이다.

권고: `expo-audio`로의 마이그레이션을 Phase 2 최우선으로 올린다. 다만 API 형태가 클래스 → React 훅 기반으로 바뀌므로 `Metronome` 클래스 구조 자체를 재설계해야 하고, 무엇보다 **배속 조절(`setRateAsync` 대응 기능)과 loop 정밀도가 expo-audio에서 동일하게 되는지를 먼저 실기기에서 검증**해야 한다. 이게 안 되면 오디오 전략(사전 렌더링 루프 방식) 자체를 다시 봐야 하므로, 코드부터 쓰지 말고 **작은 검증 프로토타입 먼저**.

두 번째 부채: `npm install`이 `--legacy-peer-deps` 없이는 실패한다. 지금은 넘어가지만 EAS Build(WBS Phase 6) 환경에서 이게 문제가 될 수 있다. 스토어 제출 전에 의존성 트리를 한 번 정리해야 한다.

### `[@golf-mobile-developer]` — 확인 안 된 것들
실기기가 켜졌다는 건 "번들이 통과했다"는 뜻일 뿐, 아래는 아직 실제로 눈으로 확인되지 않았다:
- 나눔고딕이 **실제로 적용됐는지** (폴백 로직을 넣었기 때문에, 폰트 로드가 실패해도 앱은 정상적으로 뜬다 — 즉 지금 화면이 시스템 폰트일 가능성이 있다. `@expo-google-fonts/nanum-gothic@^0.2.3`은 구버전이라 SDK 54의 `expo-font@14`와 안 맞을 소지가 있음)
- SDK 51→54 점프(React 18→19, RN 0.74→0.81, expo-router 3→6)로 인한 **런타임 동작 변화**. 특히 expo-router v6의 라우팅 동작이 바뀌었을 수 있어 `app/index.tsx` 진입 가드 → `/onboarding` 리다이렉트가 의도대로 도는지 확인 필요
- reanimated v4에서 온보딩의 `withRepeat` 루프 애니메이션, 연습 화면 템포 바 전환이 정상인지
- expo-blur v15에서 글래스모피즘 카드가 깨지지 않는지

### `[@golf-product-planner]` — 우선순위 의견
기능 관점에서 지금 앱은 여전히 **MVP 3개 중 2개(프리셋 + 연습)만** 있고, 진짜 차별점인 **"내 스윙 등록"(Feature B)이 빈 화면**이다. 사용자가 얻는 가치는 아직 "프리셋 3개짜리 메트로놈"에 불과하다.

다만 아키텍트 의견에 동의한다 — 오디오가 무너지면 Feature B도 의미가 없다(마킹해서 얻은 비율을 재생할 수단이 사라지므로). **오디오 마이그레이션 → 그 다음 Feature B** 순서가 맞다.

### `[@golf-ux-designer]` — 디자인 관점
실기기 확인 시 체크해야 할 UX 항목을 정리해뒀다(README 체크리스트와 연동): 온보딩 3장 스와이프 동작, 설정에서 라이트/다크 실시간 전환, 나눔고딕 적용 여부, 골드 배경 위 텍스트 가독성(실제 화면 밝기에서 확인 필요 — 시뮬레이터/HTML 데모로는 판단 불가).

추가로, **앱 재시작 시 온보딩이 매번 다시 뜨는 현재 동작은 UX 결함**으로 봐야 한다. 지금은 "알려진 제약"으로 문서에만 적어뒀지만, 실사용자에겐 그냥 버그로 보인다. AsyncStorage 도입 우선순위를 올려야 한다.

### `[@golf-finance-analyst]` — 비용 영향
오늘 작업의 추가 비용은 **$0**(Homebrew/watchman/ngrok 전부 무료, SDK 업그레이드도 무료). 다만 일정 관점에서 **오늘 하루가 사실상 전부 환경 세팅/디버깅에 소모**됐다는 점을 로드맵에 반영해야 한다 — 이건 낭비가 아니라 원래 필요했던 비용이었고, 오히려 지금 치른 게 스토어 제출 직전에 치르는 것보다 훨씬 싸다.

수익화 시나리오(A/B/C) 선택은 여전히 창업자 미결 상태다. 다만 오늘 확인된 사실 하나가 판단에 도움이 된다: **SDK 강제 업그레이드가 주기적으로 발생한다**는 것. 즉 "출시 후 손 놓아도 되는 앱"이 아니라 매년 유지보수 공수가 든다. 이는 일회성 구매(시나리오 B)의 리스크를 조금 키우는 요인이다 — 평생 언락을 팔았는데 매년 유지비가 든다면 장기적으로 수익 구조가 불리해진다. **참고 정보이고 확정 추천은 아니다.**

### `[@golf-legal-privacy]` — 법무 관점
새로 추가된 패키지들(`react-native-worklets`, `babel-preset-expo`)은 모두 MIT/Expo 계열 오픈소스로 상업적 이용에 문제없다. 나눔고딕 OFL 고지는 이미 설정 화면에 반영돼 있다. 다만 **폰트가 실제로 적용되지 않은 상태라면 "본 앱은 나눔글꼴이 적용되어 있습니다"라는 고지 문구가 사실과 다르게 된다.** 폰트 실적용 확인 후 문구를 유지할지 결정해야 한다(적용 안 하기로 하면 문구도 제거).

### `[@golf-benchmarker]` — 참고
경쟁 앱들도 동일한 Expo/RN 업그레이드 부담을 지므로 이건 우리만의 약점은 아니다. 다만 오디오 정밀도가 핵심인 앱(메트로놈류)들은 대체로 네이티브 오디오 계층을 직접 다루는 경향이 있어, expo-audio의 정밀도 검증 결과가 나쁘면 그때는 개발 빌드(development build) 전환까지 검토 대상이 될 수 있다. 지금 결정할 사안은 아니다.

---

## 3. 합의된 결론

1. **WBS 상태값을 `Code Complete` / `Verified` 2단계로 분리한다.** 창업자 실기기 확인 없이 `Verified` 불가. (QA 제안 채택)
2. **다음 스프린트 최우선은 `expo-av` → `expo-audio` 마이그레이션.** SDK 55에서 expo-av가 제거되고, Expo Go는 최신 SDK만 지원하므로 시한부 문제다. 단 **코드 전면 수정 전에 배속·loop 정밀도 검증 프로토타입 먼저.**
3. **그 다음 AsyncStorage 도입** — 온보딩 재노출/테마 초기화는 문서상 "제약"이 아니라 실사용자에겐 버그. UX 팀 의견 채택해 우선순위 상향.
4. **그 다음 Feature B(내 스윙 등록)** 착수. 오디오 기반이 안정된 후.
5. **의존성 트리 정리(`--legacy-peer-deps` 제거)는 스토어 제출 전(Phase 6)까지 해결.** 지금 급하진 않음.
6. 오늘 밤 창업자가 실기기에서 확인해야 할 것: **나눔고딕 실제 적용 여부**(폴백 때문에 실패해도 앱은 뜸), 온보딩 동작, 테마 전환, 애니메이션. 폰트가 안 되면 폰트 패키지 버전 문제로 별도 처리.

## 4. 창업자(PM) 결정 필요 사항

| # | 항목 | 왜 창업자 결정인가 |
|---|---|---|
| 1 | **수익화 시나리오 A/B/C 선택** (기존 미결) | 매년 SDK 유지보수 공수가 확인됐으므로 일회성(B)의 장기 리스크가 조금 커짐 — 재무 참고의견 반영해 재검토 |
| 2 | **expo-audio 마이그레이션을 Phase 2 최상단에 놓는 것 승인** | 기능 추가가 아닌 부채 상환이라 눈에 보이는 진전이 없는 스프린트가 됨. "Feature B를 먼저 보고 싶다"는 선택도 가능하나 SDK 55 시점에 오디오가 깨질 리스크를 안게 됨 |
| 3 | **AsyncStorage 패키지 추가 승인** (`@react-native-async-storage/async-storage`, 비용 $0) | 새 의존성 추가는 창업자 승인 대상 |
| 4 | **나눔고딕 실적용 확인 결과 공유** | 미적용이면 폰트 유지/포기 결정 + 법무 고지 문구 처리 방향이 갈림 |

---
*작성: PM 라운드테이블 · 2026-07-30 · 다음 미팅: expo-audio 검증 프로토타입 결과 공유 시점*

## 참고 출처
- expo-av 지원 종료 및 expo-audio 이행 안내: [AV - Expo Documentation](https://docs.expo.dev/versions/v54.0.0/sdk/av/), [Audio (expo-av) - Expo Documentation](https://docs.expo.dev/versions/v54.0.0/sdk/audio-av/)
- SDK 54 / React Native 0.81 개요: [Expo SDK 54 beta launches with React Native 0.81](https://alternativeto.net/news/2025/8/expo-sdk-54-beta-launches-with-react-native-0-81-and-faster-ios-builds)
