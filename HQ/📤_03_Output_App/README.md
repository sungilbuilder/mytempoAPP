# 마이템포 (mytempo-golf) — 프로토타입 (Phase 1)

`[@golf-benchmarker] [@golf-ux-designer] [@golf-mobile-architect] [@golf-mobile-developer] [@golf-legal-privacy] [@golf-qa-tester]` · WBS 1.1~1.8 완료분

## 지금까지 구현된 것 (PLANNING.md 빌드 순서 ①번)
- 프리셋 데이터 3종(3:1 / 2.5:1 / 3.5:1) 하드코딩 — `features/tempo/presets.ts`
- 사전 렌더링된 3단 비프 루프 오디오(백스윙 시작=저음/탑=중음/임팩트=강조음) — `assets/audio/*.wav` (직접 합성 생성)
- 메트로놈 오디오 엔진(expo-av, loop 재생 + 배속 조절) — `features/audio-engine/metronome.ts`
- 프리셋 목록 화면 + 연습 화면(재생/정지, 배속 ±0.1x) — `app/(tabs)/`
- Zustand 전역 상태(선택된 프리셋, 배속, 재생 여부) — `store/usePracticeStore.ts`
- **(WBS 1.4) 브랜드 디자인 시스템 적용**: 앱 이름 "마이템포"(`app.json`), 최종 앱 아이콘(`assets/images/icon.png`, `adaptive-icon.png`) 반영.
- **(WBS 1.5) 다크모드 리뉴얼**: NativeWind(Tailwind for RN) 도입, 그린/골드를 다크 배경에서 도드라지는 네온 톤으로 재정의(`greenNeon #5FC639`, `goldNeon #EFC94D`). 템포 바는 `react-native-reanimated` 애니메이션, 중앙 카드는 `expo-blur` BlurView 글래스모피즘.
- **(WBS 1.6 신규) 라이트/다크 토글**: `tailwind.config.js`가 라이트(기본, WBS1.4 팔레트)/`*Dark`(다크, WBS1.5 네온) 이중 토큰 구조로 전면 개편. 프리셋/연습/내 스윙 3개 화면 전부 `dark:` variant 병행 표기로 재작성. 신규 `app/settings.tsx`에서 시스템 설정 따르기/라이트/다크 3버튼 선택(NativeWind `colorScheme.set()`). `app/(tabs)/_layout.tsx`에 설정 진입 톱니바퀴 버튼 추가.
- **(WBS 1.7 신규) 랜딩/온보딩**: 최초 실행 시 `app/index.tsx`(진입 가드) → `app/onboarding.tsx`(3장 스와이프: 히어로/저장/반복연습, 상단 진행바+하단 도트+건너뛰기, 미니 템포바 루프+펄스링 reanimated 애니메이션, 마지막 CTA "무료로 시작하기"). `store/useOnboardingStore.ts` 신규.
- **(WBS 1.8 신규) 나눔고딕 폰트**: `@expo-google-fonts/nanum-gothic` 연동(`app/_layout.tsx`), 굵기별 실제 폰트패밀리를 tailwind `font-nanum-bold`/`font-nanum-extrabold` 토큰으로 등록. SIL OFL 1.1 라이선스 독립 검증 완료(`📑_02_Workspace/finance_legal/oss-font-license-notice.md`), 설정 화면에 오픈소스 라이선스 고지 문구 반영.

## 아직 없는 것 (다음 단계, WBS Phase 2~3)
- 카메라롤 영상 로드/마킹(내 스윙 등록) — "내 스윙" 탭은 현재 빈 상태(empty state) 화면만 표시. 실제 마킹 UI는 `mytempo-ui-wireframes.html` ③번 화면 기준, `design-guideline-v2-dark.md` 톤으로 다시 그려 구현 예정
- **AsyncStorage 미도입 (WBS 3.1)**: 테마 선택값과 온보딩-완료 플래그가 모두 zustand 메모리에만 저장돼 있어 앱을 완전히 재시작하면 초기화됩니다(테마는 "시스템 설정 따르기"로, 온보딩은 다시 노출). 의도적으로 이번 스프린트 범위 밖으로 뺐습니다 — 영속화하려면 `@react-native-async-storage/async-storage` 추가 승인이 필요합니다.
- 연습 히스토리, 접근성(진동) 세부 구현
- 연습 화면의 원형 진행 링(그린/골드 호 분할) — 현재는 막대 그래프로 대체 구현. `react-native-svg` 추가 여부는 여전히 검토 대상

## 로컬에서 실행하는 방법
창업자 확인: Node/expo 로컬 세팅 및 `npx expo install nativewind react-native-reanimated expo-blur` 설치를 이미 완료하셨습니다. 이번 라운드에 폰트 패키지(`expo-font`, `@expo-google-fonts/nanum-gothic`)를 `package.json`에 추가했으니, 아래 순서로 한 번 더 설치·실행해 주세요.

```bash
cd "HQ/📤_03_Output_App"
npm install
npx expo start
```

Expo Go 앱을 갤럭시 S25에 설치한 뒤 QR코드를 스캔하면 확인 가능합니다. 이번 라운드에서 확인해 주실 부분:
1. 앱을 처음 켰을 때(또는 캐시 삭제 후) 온보딩 3장 스와이프가 뜨는지, 스와이프/탭/도트 이동/건너뛰기가 모두 동작하는지, 마지막 "무료로 시작하기"를 누르면 프리셋 탭으로 넘어가는지
2. 프리셋 탭 우상단 톱니바퀴 → 설정 화면 진입 → 라이트/다크/시스템 3개를 눌러 전체 화면 색이 실제로 바뀌는지(특히 연습 화면의 글래스모피즘 카드 톤도 함께 바뀌는지)
3. 폰트가 나눔고딕으로 보이는지(제목이 조금 두꺼운 나눔고딕 볼드/엑스트라볼드로 보여야 함 — 기본 시스템 폰트처럼 보이면 폰트 로드 실패 가능성)
4. 앱을 완전히 종료 후 재실행하면 테마 선택과 온보딩이 초기화되는 게 정상입니다(위 "알려진 리스크" 참고, 다음 스프린트 AsyncStorage 도입 시 해결 예정)

## 진행 상황 (2026-07-30 저녁 기준)
`npm install` + `npx expo start` 로컬 실행 **성공** — Metro 정상 기동, QR 정상 출력. 새 패키지(nativewind/reanimated/expo-blur/나눔고딕 폰트) 설치 자체는 문제없이 끝난 것으로 확인됨.

다만 Expo Go에서 QR 스캔 시 **"Something went wrong" + 무한 로딩** 발생. 코드 오류라면 보통 빨간 에러 화면이 뜨는데 그게 아니라 연결이 아예 안 되는 패턴이라, **맥과 폰이 같은 Wi-Fi가 아니어서 생기는 네트워크 문제**로 진단했음. 다음 시도:

```bash
npx expo start --tunnel
```

(최초 실행 시 `@expo/ngrok` 설치 여부를 물으면 y로 진행. tunnel 모드는 LAN 대신 외부 터널을 거치므로 Wi-Fi가 달라도 연결됨 — 다만 로컬 모드보다 느릴 수 있음.) QR 재스캔 후에도 같은 에러가 나면 에러 문구/스크린샷을 그대로 공유해서 코드 레벨 문제인지 재확인 필요.

## 알려진 리스크 / 확인 필요
- `expo-av`는 최신 Expo SDK에서 `expo-audio`로 대체되는 추세입니다. `npm install` 시 버전 경고가 뜨면 `expo-audio`로 교체를 검토하세요.
- 오디오 배속(`setRateAsync`) 변경 시 루프 경계에서 미세한 끊김이 있을 수 있습니다 — 실기기 테스트 후 QA 단계(WBS 4.1)에서 확인 필요.
- **NativeWind/Reanimated 설정**: `babel.config.js`의 `react-native-reanimated/plugin`은 반드시 `plugins` 배열 마지막 항목이어야 합니다. BlurView/Animated.View의 `cssInterop` 등록과 FlatList의 `contentContainerClassName` remap은 `nativewind-setup.ts` 한 곳에 모아뒀습니다(중복 등록 방지, `app/_layout.tsx`에서 1회 import).
- **샌드박스 제약(계속됨)**: 이 세션에서는 `registry.npmjs.org` 접근이 차단돼 있어 `npm install`/`expo start`를 직접 실행해 검증할 수 없습니다. 모든 코드는 정적 리뷰(문법/임포트/타입/API 사용법 확인)로만 검증했고, 실제 컴파일/실행 확인은 창업자의 로컬 환경에 의존합니다.
- **(Founder_Review) 포인트 컬러**: 채팅으로 주신 팔레트(Deep Slate Charcoal `#0F172A` + Cyber Lime `#84CC16`) 대신 기존 확정 브랜드(그린 `#436437`/골드 `#D4AF37`)의 네온 버전(`#5FC639`/`#EFC94D`)을 유지 중입니다. 슬레이트+라임을 정말 원하시면 알려주세요.
