# 회사 메모리 — 진행 상황 및 부서 간 히스토리

부서/에이전트가 작업을 시작하기 전 현재 상황을 파악하는 용도. 최신 상태로 계속 갱신할 것.

## 프로젝트 개요

**골프 템포 앱** — Tour Tempo 개념(백스윙 시작 → 탑 → 임팩트, 3구간 비율 템포)에서 영감을 받은 React Native(Expo) 기반 iOS/Android 크로스플랫폼 골프 스윙 템포 트레이닝 앱.

핵심 가치 제안: 내 최고의 스윙이 가진 리듬을 숫자로 저장하고, 그 리듬을 소리로 반복 훈련하여 몸에 새긴다.

## 현재 단계

- **기획 완료**: 제품/UX/기술 3개 관점을 종합한 서비스 기획서 작성 완료 (`📑_02_Workspace/product_design/`에 원본 보관).
- **조직 설계 완료 + 서브에이전트 등록 완료(2026-07-30)**: `company-organization.md`에 정의된 9개 부서 에이전트를 `.claude/agents/`에 실제 파일로 등록함(golf-strategy-lead, golf-hr-scout, golf-product-planner, golf-ux-designer, golf-finance-analyst, golf-legal-privacy, golf-mobile-architect, golf-mobile-developer, golf-qa-tester). `golf-growth-marketer`는 V2 보류 방침대로 아직 미등록.
- **로드맵/WBS 수립 완료(2026-07-30)**: `📑_02_Workspace/strategy/roadmap-and-cost-estimate.md`(단계별 로드맵·비용 개요), `WBS_and_daily_report.xlsx`(30개 태스크 WBS + 데일리 리포트 로그) 작성. `📑_02_Workspace/finance_legal/cost_tracker.xlsx`(비용 추적표, WBS와 Cost_Ref로 연동) 작성.
- **개발 착수(2026-07-30)**: `📤_03_Output_App`에 Phase 1 프로토타입 소스 작성 완료 — 프리셋 목록, 메트로놈 오디오 엔진(사전 렌더링 비프 루프), 연습 화면. `npm install`/실기기 실행은 아직 미검증(창업자 로컬 액션 필요, README.md 참고).

## 확정된 결정사항 (2026-07-30, 창업자 확인)

1. **플랫폼 (2026-07-30 수정)**: ~~iOS/Android 동시 출시~~ → **Android(AOS) 우선 출시로 변경**. iOS는 2차 출시로 순연. Apple Developer 계정 개설(WBS 0.1)도 iOS 착수 시점으로 미룸, Google Play(WBS 0.2)가 최우선.
2. **스윙 영상 소스 (2026-07-30 재확정)**: ~~PGA 선수/Tour Tempo 유튜브 콘텐츠 차용~~ → ~~유튜브 "저작권 없어 보이는" 영상~~ → **로열티프리 스톡 영상 사이트(Pexels/Pixabay 등)로 최종 확정**. 리스크 하향(Confirmed - Low Risk). **핵심 명확화**: 이 영상 소스는 QA 테스트용/온보딩 데모용 참고 자료일 뿐, 앱의 메인 기능(Feature B: 사용자 본인의 가장 잘 친 스윙을 카메라롤에서 업로드 → 백스윙/탑/임팩트 마킹 → 템포 비율 분석·저장 → Feature C에서 그 템포를 오디오 신호(예: 24/8류 프레임비 표기)로 반복 재생)는 처음부터 사용자 본인 영상만 사용하므로 저작권 이슈 자체가 없음. 이 구조는 이미 `PLANNING.md`에 정의돼 있던 내용이며, 이번에 창업자가 우선순위로 재확인함.
   - **참고(경미)**: 프리셋 라벨을 Tour Tempo 책/앱의 구체적 프레임 표기(21/7, 24/8 등)와 동일하게 그대로 쓰면, 영상이 아닌 "방법론 네이밍" 차원에서 유사성 이슈가 생길 여지가 있음. 차단 사유는 아니지만 앱 이름/브랜드 확정(WBS 0.3, 0.4) 시 golf-product-planner가 참고할 것.
   - **프로세스 확정(2026-07-30)**: 이 네이밍 방법론은 `golf-product-planner`(서비스기획)가 초안을 설계해 **PM(창업자)에게 제안**하는 흐름으로 진행하기로 함(WBS 0.9 신설). golf-product-planner는 임의로 최종 확정하지 않음.
3. **1차 테스트 기기**: Galaxy S25(Android). 플랫폼을 AOS 우선으로 바꾸면서 이 기기가 1차 출시 QA의 유일하고 충분한 경로가 됨 — 더 이상 갭 아님. iOS 실기기 확보(WBS 4.2)는 2차 출시(iOS) 착수 시점으로 순연.
4. **앱 이름/브랜드 (2026-07-30 확정)**: **"마이템포(MyTempo)"**로 최종 확정. 앱스토어 중복/상표 예비 확인 완료(국내 골프 카테고리 중복 없음, 해외 동명 앱은 피트니스 카테고리라 충돌 낮음 — 정식 키프리스 검색은 제출 전 golf-legal-privacy가 별도 진행). 아이콘은 골프공+템포 바 결합 디자인으로 확정, 메인 컬러는 창업자 지정 `#436437`(그라데이션 없는 플랫 디자인). 상세는 `product_design/brand-positioning-and-naming.md` 참고.
5. **개인정보처리방침 게시**: 가장 저비용 방법(Notion 무료 공개 페이지)으로 진행, 비용 $0.
6. **Apple Developer 계정 명의**: 개인 명의로 진행.
7. **서브에이전트 등록**: 승인 및 등록 완료(위 참조).
8. **투입 시간(파트타임 vs 풀타임) 기준**: 아직 미확정. 로드맵 문서의 6~10주(파트타임)/3~5주(풀타임) 구분은 "창업자가 매주 에이전트 산출물 검토·실기기 테스트·의사결정에 쓸 수 있는 시간"이 기준이며, 코딩 자체보다 창업자의 리뷰/결정 속도가 병목.

## MVP 핵심 기능 3개 (확정)

1. **템포 프리셋** — 이름 붙은 비율 템포(3:1, 2.5:1, 3.5:1 등) 목록 중 선택
2. **내 스윙 등록** — 카메라롤 영상 → 백스윙 시작/탑/임팩트 3지점 수동 마킹 → 비율 자동 계산 → 저장
3. **연습 화면** — 선택된 템포 비율대로 비프음이 반복 재생되는 오디오 메트로놈

MVP 제외(V2 이후): 컴퓨터비전 자동 분석, 계정/로그인, 클라우드 동기화, 소셜, 웨어러블, 다국어.

## 기술 스택 요점

React Native + Expo, expo-router. 영상 재생은 expo-video, 카메라롤은 expo-image-picker. 오디오 메트로놈은 사전 렌더링 비프 루프 방식(JS 타이머 정밀도 문제 회피). 데이터 저장은 AsyncStorage로 시작(추후 expo-sqlite 이행 고려). 상태관리는 Zustand.

**리스크 Top 3**: 오디오 타이밍 정밀도, 프레임 정확 탐색의 플랫폼 차이, 대용량 비디오 로컬 저장.

## 다음 액션 후보 (2026-07-30 라운드테이블 #2 합의 순서)

우선순위 근거: `📑_02_Workspace/strategy/pm-roundtable-review-2026-07-30-sdk54.md`

1. **창업자: 실기기 육안 확인 4가지** — 앱은 이제 갤럭시 S25에서 구동됨. 확인할 것: ①나눔고딕 실제 적용 여부(중요 — 폰트 로드 실패 시 시스템 폰트로 폴백하게 만들었으므로 실패해도 앱은 정상 구동됨), ②온보딩 3장 스와이프 동작, ③설정에서 라이트/다크 실시간 전환, ④온보딩/연습화면 애니메이션
2. **창업자 승인 대기: expo-audio 마이그레이션 (WBS 2.0)** — Phase 2 최우선 권고. expo-av가 SDK55에서 제거되는데 Expo Go는 최신 SDK만 지원하므로 시한부. `metronome.ts` 전체가 expo-av 의존이라 핵심 기능 직결. **코드 전면수정 전에 배속/loop 정밀도 검증 프로토타입부터.**
3. **창업자 승인 대기: AsyncStorage 추가 (WBS 3.1a)** — 재시작 시 온보딩 재노출/테마 초기화는 실사용자에겐 버그. 비용 $0
4. @golf-mobile-developer: Feature B(내 스윙 등록, WBS 2.2~2.5) — 오디오 기반 안정화 후
5. @golf-mobile-architect: 의존성 트리 정리(`--legacy-peer-deps` 없이 설치되게) — Phase 6 스토어 제출 전까지
6. @golf-qa-tester: 로열티프리 스톡 사이트(Pexels/Pixabay 등)에서 QA/온보딩용 참고 스윙 영상 확보 (WBS 2.1)
7. @golf-mobile-architect: 연습 화면 원형 진행 링(그린/골드 호) 구현을 위한 `react-native-svg` 도입 여부 검토

## WBS 상태값 규칙 (2026-07-30 신설, QA 제안 채택)

- `Code Complete`: 코드 작성 + 정적 리뷰 완료
- `Verified`: **창업자 로컬 실기기에서 실제 구동 확인 완료**

배경: 지난 라운드에 정적 리뷰만으로 Done을 찍었으나 실기기에서 4건 연달아 터졌고 그중 3건은 코드 리뷰로 잡을 수 없는 종류(SDK 버전 불일치, reanimated v4 워크릿 분리, babel-preset 암묵적 의존 깨짐)였다. 앞으로 어떤 개발 태스크도 창업자 실기기 확인 없이 `Verified` 불가.

## 창업자(나) 직접 확인/실행 필요 (2026-07-30, Founder_Review=Y 항목)

1. ~~앱 이름 최종 확정~~ → **완료: "마이템포" 확정**
2. **프리셋 라벨링 방법론 승인** — 별칭 방향 동의 여부 (`📑_02_Workspace/product_design/preset-naming-methodology-proposal.md`)
3. **Phase 1 프로토타입 실기기 확인 (진행 중, WBS 1.5/1.6/1.7/1.8)** — 로컬 `npm install` + `npx expo start`는 성공(새 패키지/나눔고딕 폰트 설치 문제없음, Metro 정상 기동). 남은 건 Expo Go 연결뿐: QR 스캔 시 "Something went wrong"+무한로딩이 나서 맥-폰 동일 Wi-Fi 여부를 의심 중 — 내일 `npx expo start --tunnel`로 재시도 예정. 안 되면 에러 내용 그대로 공유 바람(`📤_03_Output_App/README.md` 체크리스트 참고)
4. **포인트 컬러 재확인 (신규, WBS 1.5)** — 채팅으로 주신 "Deep Slate Charcoal `#0F172A` + Cyber Lime `#84CC16`" 팔레트를 그대로 쓰지 않고, 기존 확정 브랜드(그린/골드)의 네온 버전(`greenNeon #5FC639`/`goldNeon #EFC94D`)으로 유지했습니다(이유: `design-guideline-v2-dark.md` 8-2절 — 앱 아이콘/이름과의 일관성). 슬레이트+라임을 정말 원하시면 알려주세요.
5. **개인정보처리방침 게시** — 초안(`finance_legal/privacy-policy-draft.md`)을 Notion 등에 게시 (WBS 0.6, 급하지 않음 — 스토어 제출 시점에 필요)
6. **수익화 방향 선택 (신규, WBS 0.10)** — A(구독 월$2.99/연$19.99) / B(일회성 평생 언락 $9.99~14.99) / C(하이브리드 $7.99) 중 선택. 서버비 없는 오프라인 구조상 B·C가 상대적으로 안전해 보인다는 재무 분석 있음(확정 추천 아님) — `📑_02_Workspace/finance_legal/monetization-plan.md` 참고
7. **라이트/다크 기본값 확인 (신규, WBS 1.6)** — "시스템 설정 따르기"를 기본값으로 제안(`light-dark-mode-guideline.md`), 동의 여부
8. **expo-haptics 추가 여부 (신규, WBS 1.7, 선택사항)** — 랜딩페이지 탭 인터랙션에 햅틱 피드백을 넣을지, 새 패키지 추가라 확인 필요(비용 $0)

## 후순위로 전환 (2026-07-30)

- **Google Play Console 계정 개설(WBS 0.2, cost_tracker COST-02)**: 창업자 지시로 후순위 전환. 기능 기획/개발/디자인이 먼저이고, 스토어 계정은 실제 제출 준비될 때 진행. Phase 6(베타 배포)/7(제출) 착수 시점에 재개.
- @golf-product-planner + @golf-strategy-lead: 브랜드 차별화 전략 수립 → 앱 이름/아이콘 후보 도출 (WBS 0.3, 0.4)
- 창업자: Google Play Console 계정 개설 착수 (WBS 0.2, 최우선). Apple Developer는 iOS 착수 시점으로 보류
- @golf-mobile-developer: PLANNING.md 빌드 순서 ①번(프리셋+메트로놈 프로토타입)부터 착수 가능, Android 우선 검증

## 부서 간 히스토리 로그

| 날짜 | 내용 |
|---|---|
| 2026-07-30 | 서비스 기획서(제품/UX/기술 종합) 및 조직도 초안 작성 완료 |
| 2026-07-30 | HQ 폴더 구조를 `🏢_01_Management` / `📑_02_Workspace` / `📤_03_Output_App` 체계로 재구성 |
| 2026-07-30 | 개발 로드맵/비용 개요 문서 작성 (`strategy/roadmap-and-cost-estimate.md`) |
| 2026-07-30 | 서브에이전트 9개(.claude/agents/) 등록 완료, WBS·데일리리포트·비용추적 엑셀 작성, 창업자 결정사항 8건 반영(플랫폼/영상소스/기기/브랜드프로세스/개인정보방침/계정명의 등). 영상 소스 저작권 리스크 및 iOS 기기 공백을 오픈 리스크로 기록 |
| 2026-07-30 | 결정사항 재검토: ①플랫폼을 iOS/Android 동시 → **AOS 우선 출시**로 변경(iOS 순연, Apple 계정 개설도 순연). ②스윙 영상 소스를 PGA/Tour Tempo 콘텐츠 → **유튜브 "저작권 없어 보이는" 영상**으로 변경했으나, 육안 판단은 근거가 안 되어 리스크는 여전히 미해결(CC 라이선스 필터 등 검증 절차 필요). iOS 실기기 갭은 AOS 우선 출시로 더 이상 1차 출시 블로커 아님 |
| 2026-07-30 | 영상 소스를 **로열티프리 스톡 사이트**로 최종 확정, 리스크 하향. 창업자가 메인 기능(본인 최고 스윙 업로드→템포 분석/저장→오디오 재생, Feature B/C)이 프로젝트의 핵심 우선순위임을 재확인 — 이 기능은 본인 영상만 쓰므로 스톡영상 리스크와 무관 |
| 2026-07-30 | 프리셋 네이밍 방법론(Tour Tempo 프레임 표기 유사성 이슈) 처리 프로세스 확정: golf-product-planner가 기획 → PM(창업자)에게 제안 흐름. WBS 0.9 신설, golf-product-planner 에이전트 정의에 반영 |
| 2026-07-30 | **보고 프로토콜 신설**: 모든 부서 에이전트가 소환 시 자기 태그(`[@에이전트이름]`) + 종료 시 `Daily_Report` 시트에 진행상황 브리핑(Date/Department_Tag/Summary/Status/Blockers/Next_Action/Founder_Review/Founder_Note) 남기도록 규칙화. `reporting-protocol.md` 작성, `Daily_Report` 시트 스키마 확장(Status/Founder_Review/Founder_Note 컬럼 추가), 9개 에이전트 정의 파일 전부에 규칙 반영, `company-organization.md`에도 명시 |
| 2026-07-30 | **사업 착수**: 브랜드 포지셔닝+이름 후보 5개, 프리셋 네이밍 방법론 제안, 개인정보처리방침 초안 작성 완료. `📤_03_Output_App`에 Phase 1 프로토타입(프리셋 목록+메트로놈+연습화면) 소스 작성 완료 — 단 로컬 `npm install`/실기기 실행은 미검증, 창업자 확인 필요. Founder_Review=Y 항목 5건을 "창업자 직접 확인/실행 필요" 섹션에 정리 |
| 2026-07-30 | **우선순위 재조정**: Google Play Console 계정 개설(WBS 0.2)을 후순위로 전환 — 기능 기획/개발/디자인이 우선이라는 창업자 판단. cost_tracker COST-02도 Deferred로 갱신 |
| 2026-07-30 | **브랜드 최종 확정 (WBS 0.4 Done)**: 앱 이름 "마이템포" 확정, 앱스토어 중복/상표 예비 확인 완료. 아이콘 디자인 반복(펄스 볼/템포 바/스윙 아크 3안 → A+B 결합 → 마스터즈 그린 시도 후 상표 리스크로 폐기 → 흰색 혼합 연두 시도 → 창업자 지정 `#436437` 단색 플랫 디자인으로 최종 확정) — `brand-icons/mytempo-icon-final.svg` |
| 2026-07-30 | **UI/UX 설계 + 브랜드 코드 반영 (WBS 1.4)**: golf-ux-designer가 4개 핵심 화면(프리셋/내 스윙/스윙 마킹/연습) 와이어프레임 제작, golf-mobile-developer가 `theme.ts` 디자인 시스템 도입 + 기존 화면(프리셋/연습/내 스윙) 브랜드 컬러 적용 + `app.json` 앱 이름 반영 |
| 2026-07-30 | **golf-benchmarker 신규 등록**: 창업자가 현재 UI가 부족하다고 판단, 최신 스포츠/피트니스 앱 UI 트렌드 벤치마킹 부서 신설 지시. `.claude/agents/golf-benchmarker.md` 등록, `company-organization.md`에 반영 |
| 2026-07-30 | **다크모드 리뉴얼 (WBS 1.5)**: golf-benchmarker가 WHOOP/Nike Run Club 등 벤치마킹(`benchmark-sports-fitness-ui-trends.md`) → golf-ux-designer가 다크모드+네온 가이드라인 작성(`design-guideline-v2-dark.md`, 그린/골드를 네온 톤으로 재해석해 브랜드 일관성 유지) → golf-mobile-architect가 NativeWind+reanimated+expo-blur 도입 검토/설정(`architecture-note-nativewind.md`) → golf-mobile-developer가 프리셋/연습/내 스윙/탭바 전면 리팩토링(StyleSheet→NativeWind, 템포 바 애니메이션, 글래스모피즘). npm install 미검증 + 포인트 컬러(슬레이트+라임 vs 그린/골드 네온) 재확인이 Founder_Review 항목으로 남음 |
| 2026-07-30 | **PM 라운드테이블 — 기획 단계 확장 (WBS 0.10, 1.6, 1.7)**: 창업자 요청으로 코드 구현 대신 기획에 집중. ①라이트/다크 토글: WBS1.4 라이트 팔레트 재사용 확인, NativeWind colorScheme API 활용안(`light-dark-mode-guideline.md`, `theme-toggle-and-landing-architecture-note.md`). ②랜딩/온보딩: 3장 스와이프 기획+인터랙티브 목업(`landing-page-concept.md`, `landing-page-demo.html`), app/index.tsx 진입가드 라우팅안. ③수익화: 구독/일회성/하이브리드 3개 시나리오 비교, 오프라인·무서버 구조상 일회성이 유리할 가능성 시사(`monetization-plan.md`, 확정 추천 아님). 전체 종합은 `📑_02_Workspace/strategy/pm-roundtable-review-2026-07-30.md`. 코드 구현은 창업자 확인 후 다음 라운드로 보류 |
| 2026-07-30 | **WBS 1.6/1.7/1.8 코드 구현 스프린트**: 창업자가 로컬 Node/expo 세팅 및 nativewind/reanimated/expo-blur 설치 완료 확인 → 코드 착수. (1) 나눔고딕 폰트: `@expo-google-fonts/nanum-gothic` 연동(`app/_layout.tsx` useFonts), 굵기별 실제 폰트패밀리 3종을 tailwind `fontFamily` 토큰(`font-nanum-bold`/`font-nanum-extrabold`)으로 등록, OFL 라이선스 사실관계 독립 검증 후 `oss-font-license-notice.md` 작성. (2) 라이트/다크 토글: `tailwind.config.js`를 라이트(기본)/`*Dark`(접두) 이중 토큰 구조로 재설계, `darkMode:'class'` 적용, `app.json` userInterfaceStyle을 `automatic`으로 원복, 설정 화면(`app/settings.tsx`) 신규 — 테마 선택 UI + 오픈소스 라이선스 고지, `app/(tabs)/_layout.tsx`에 설정 진입 버튼 추가. 기존 3개 화면(프리셋/연습/내 스윙) 전부 `dark:` variant 병행 표기로 재작성, 골드 배경 대비 텍스트 색 고정 처리, BlurView tint를 현재 스킴에 맞춰 동적 전환. (3) 랜딩/온보딩: `app/index.tsx`(진입 가드, Redirect) + `app/onboarding.tsx`(3장 스와이프, 진행바/도트/건너뛰기, 미니 템포바+펄스링 reanimated 루프 애니메이션) 신규 구현, `store/useOnboardingStore.ts`(zustand) 신설. **코드 리뷰 중 발견/수정한 버그**: FlatList `contentContainerClassName`이 NativeWind v4에서 `remapProps` 등록 없이는 무시되는 것을 사전 발견 → `nativewind-setup.ts`로 중앙화해 수정(실제 실행 전에 정적 리뷰로 잡음). **알려진 제약**: 테마 선택값과 온보딩-완료 플래그 모두 AsyncStorage 미도입으로 메모리에만 저장(앱 재시작 시 초기화) — 의도적으로 이번 라운드 범위 밖(WBS 3.1로 이연). 샌드박스 네트워크 제약으로 이번에도 실제 `expo start` 실행/컴파일 검증은 못 함 — 창업자의 로컬 실기기 확인이 여전히 필요 |
| 2026-07-30 (심야) | **★ 실기기 최초 구동 성공 + SDK 51→54 강제 업그레이드**: Expo Go 무한로딩을 처음엔 Wi-Fi 문제로 오진(tunnel/ngrok/watchman/Homebrew까지 설치하며 우회 시도) → 실제 원인은 **Expo Go가 최신 SDK 하나만 지원**하는데 프로젝트가 SDK51이었던 것. SDK54로 업그레이드(React 18→19, RN 0.74→0.81, reanimated v3→v4, expo-router v3→v6) 후 연쇄 오류 4건 수정: ①`react-native-worklets/plugin`으로 babel 플러그인 교체(reanimated v4에서 워크릿이 별도 패키지로 분리), ②NativeWind v4 babel 프리셋(`jsxImportSource`+`nativewind/babel`) 누락 보완 — 이게 없으면 className이 조용히 무시됨, ③`babel-preset-expo` 명시적 추가(암묵적 hoisted 의존이 설치 트리 변경으로 깨짐), ④`_layout.tsx` 폰트 로딩 데드락 수정 — 폰트 실패 시 `fontsLoaded`가 영원히 false여서 "아이콘만 뜨고 아무것도 안 되는" 증상의 진짜 원인이었음(이제 시스템 폰트로 폴백). **결과: 갤럭시 S25에서 앱 구동 확인.** 부채: `npm install`에 `--legacy-peer-deps` 필요, 나눔고딕 실적용 여부 미확인 |
| 2026-07-30 (심야) | **PM 라운드테이블 #2 (`pm-roundtable-review-2026-07-30-sdk54.md`)**: ①**WBS 상태값을 Code Complete / Verified 2단계로 분리** — 정적 리뷰만으로 Done을 찍었던 관행이 실기기 4건 오류로 반증됨(QA 제안 채택, 1.5~1.7은 Verified 승격, 1.8 폰트는 Code Complete 유지). ②**긴급 리스크 식별: expo-av가 SDK55에서 완전 제거**되고 Expo Go는 최신 SDK만 지원 → 메트로놈(핵심 기능) 전체가 시한부. WBS 2.0 신설, Phase 2 최우선 권고, 단 배속/loop 정밀도 검증 프로토타입 선행 조건. ③UX팀 의견으로 **AsyncStorage 우선순위 상향**(재시작 시 온보딩 재노출은 실사용자에겐 버그, WBS 3.1a 신설). ④재무: 매년 SDK 유지보수 공수 확인 → 일회성 평생언락(시나리오 B)의 장기 리스크가 다소 커짐(참고의견). ⑤법무: 폰트 미적용 시 설정화면 나눔글꼴 고지 문구가 사실과 불일치 → 확인 후 처리. 창업자 결정 필요 4건 정리 |
| 2026-07-30 (저녁) | **웹 통합 데모 제작 + 로컬 실기기 1차 시도**: 크롬에서 바로 열어볼 수 있는 `mytempo-full-demo.html`(온보딩+라이트/다크 토글+나눔고딕을 하나로 합친 인터랙티브 데모) 신규 제작. 창업자가 로컬에서 처음으로 `npm install` + `npx expo start` 실행 → **성공**(Metro 정상 기동, QR 출력, 새 패키지/폰트 설치 문제없이 완료 확인). 다만 Expo Go로 QR 스캔 시 "Something went wrong" + 무한 로딩 발생 → 진단 결과 코드/빌드 문제가 아니라 맥-폰이 같은 Wi-Fi가 아니라서 생기는 네트워크 연결 문제로 판단(에러 화면이 아닌 연결 실패 패턴). 내일 `--tunnel` 모드 재시도가 남은 유일한 액션 |

---
*최종 갱신: 2026-07-30*
