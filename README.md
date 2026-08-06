<div align="center">

<img src="HQ/03_Output_App/assets/images/icon.png" width="120" alt="MYTEMPO 앱 아이콘" />

# 🏌️ MYTEMPO (마이템포)

**내 최고의 스윙이 가진 리듬을 숫자로 저장하고, 소리로 반복 훈련하여 몸에 새긴다.**

Tour Tempo 개념(백스윙 시작 → 탑 → 임팩트, 3구간 비율 템포)에서 영감을 받은
React Native(Expo) 기반 iOS/Android 크로스플랫폼 골프 스윙 템포 트레이닝 앱

[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](HQ/03_Output_App/package.json)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=black)](HQ/03_Output_App/package.json)
[![Status](https://img.shields.io/badge/Status-Design%20Renewal%20Complete-brightgreen)](#-진행-상황)
[![Platform](https://img.shields.io/badge/Platform-Android%20우선%20%7C%20iOS%20예정-lightgrey)](#)

</div>

---

## 📌 소개

라운드마다 들쭉날쭉한 스윙 리듬을 **숫자(비율)**로 확인하고, 그 리듬을 **오디오 메트로놈**으로 반복 연습하는 완전 오프라인 골프 훈련 앱입니다. 1인 창업자가 기획·조직 설계·개발을 직접 리드하며, 역할별 AI 에이전트 조직(기획/디자인/개발/QA/법무/재무/전략/보안/마케팅/기록)을 구성해 협업하는 방식으로 만들고 있습니다.

| 페르소나 | 니즈 |
|---|---|
| 템포 방황형 중급 골퍼 (핸디 10~20대) | 객관적 숫자로 자기 템포 확인 |
| 레슨 병행 입문자 | 단순한 리듬 신호를 따라 하는 낮은 진입장벽 |
| 슬럼프 탈출 상급 골퍼 | 잘 맞았던 시절 영상의 템포를 재현 목표로 삼기 |

## ✨ 핵심 기능 (MVP)

- **🎯 템포 프리셋** — 이름 붙은 비율 템포(3:1 / 2.5:1 / 3.5:1) 목록 중 선택
- **⭕ 템포 링** — 원형 SVG 링(TempoRing)으로 백스윙/다운스윙 구간 비율을 시각화하는 시그니처 컴포넌트
- **🔊 연습 화면** — 선택한 템포 비율대로 비프음이 반복 재생되는 오디오 메트로놈, 배속 조절 지원, 재생 중 다른 앱으로 전환 시 자동 정지
- **🎥 내 스윙 등록** — 갤러리에서 영상 선택 → **0.25배속 재생 + 프레임 단위 이동**으로 백스윙 시작/탑/임팩트 3지점 마킹 → 비율 자동 계산 → 이름 붙여 저장
- **📊 히스토리** — 연습 세션 기록, 스트릭(연속 일수) 계산
- **🌓 라이트/다크 모드** — 온보딩에서 직접 선택 가능, 이후 설정에서 변경
- **👋 온보딩** — 4장 스와이프(가치 소개 3장 + 테마 선택 1장), 로고 워드마크 헤더

## 🛠 기술 스택

- **프레임워크**: React Native + Expo (SDK 54), `expo-router` v6 파일 기반 라우팅
- **스타일링**: NativeWind v4 (Tailwind for RN), 2026-07-31 디자인 리뉴얼 기준 그린/골드 다크 네온 토큰 체계
- **애니메이션**: `react-native-reanimated` v4 (+ `react-native-worklets`), `react-native-svg`
- **상태관리**: Zustand + `persist` 미들웨어(AsyncStorage) — 테마/온보딩/연습설정/저장스윙/히스토리 영속화
- **오디오**: `expo-audio` — 사전 렌더링 비프 루프 (2026-07-31 `expo-av`에서 마이그레이션 완료, SDK55 대비)
- **영상**: `expo-video` + `expo-image-picker` — 프레임 단위 정확 탐색(`seekTolerance` exact), 배속 재생
- **폰트**: Noto Sans KR + Space Grotesk (SIL OFL 1.1) — 디자인 시안 실제 렌더링 폰트를 그대로 채택

## 📂 프로젝트 구조

```
.
├── HQ/                          # 프로젝트 운영 허브 (AI 에이전트 조직 기반)
│   ├── 🏢_01_Management/        # 조직 운영, 보고 프로토콜, company-memory(진행 히스토리 원장)
│   ├── 📑_02_Workspace/         # 부서별 산출물 (기획/디자인/엔지니어링/재무법무/전략)
│   └── 03_Output_App/        # ⭐ 실제 Expo 앱 소스 코드
│       ├── app/                 #   화면 (홈/프리셋/내스윙/히스토리/연습/마킹/결과/설정/온보딩)
│       ├── components/          #   TempoRing 등 공용 컴포넌트
│       ├── features/            #   템포 계산, 오디오 엔진
│       ├── store/                #   Zustand 전역 상태 + AsyncStorage 영속화
│       ├── scripts/               #   setup/go(QR 실행, --tunnel)/web 스크립트
│       └── 마이템포-체험판.html    #   공유용 단일 파일 인터랙티브 데모
├── .claude/agents/              # 14개 부서 서브에이전트 정의
├── PLANNING.md                  # 서비스 기획서 (페르소나 · MVP 범위 · 아키텍처 · 로드맵)
└── ORG_CHART.md                 # 프로젝트를 지원하는 Claude Code 서브에이전트 조직도
```

## 🚀 시작하기

```bash
cd "HQ/03_Output_App"
npm run setup
npm run go
```

Expo Go 앱으로 QR코드를 스캔해 실행합니다. 같은 Wi-Fi에 연결이 안 되는 환경(예: 셀룰러 데이터)이라면:

```bash
npm run go:tunnel
```

## 📈 진행 상황

**디자인 전면 리뉴얼 완료 (2026-07-31)** — 외부 디자인팀 시안을 기반으로 앱 전체를 재구현했습니다.

- ✅ 프리셋 + 오디오 메트로놈 + 연습/마킹/결과/히스토리 화면
- ✅ 디자인 시스템 전면 교체 (토큰/폰트/TempoRing 컴포넌트)
- ✅ AsyncStorage 영속화 (테마/온보딩/연습설정/스윙/히스토리 전부 재시작 후 유지)
- ✅ **브랜드 리뉴얼** — Tempo Arc Mark 로고 시스템, 아이콘/스플래시/스토어 자산 전면 교체
- ✅ **`expo-audio` 마이그레이션** (SDK55 대비)
- ✅ **영상 마킹** — 갤러리 연동, 배속 재생, 프레임 단위 이동, fps별 정밀도 표시
- ✅ **v1 출시 사양 확정** — Free + Lifetime ₩6,900, 역방향 체험, 광고 없음
- ⬜ 실기기 검증 (오디오 루프 정밀도 / 영상 프레임 탐색이 최우선)
- ⬜ 클로즈드 베타 (지인 10~20명, Android)
- ⬜ Premium 3종 개발 (사운드팩 / 어드레스 대기시간 / 히스토리 심화)
- ⬜ PostHog 분석 도구 + 인앱결제 연동
- ⬜ Google Play 제출 준비

자세한 진행 로그는 [`HQ/🏢_01_Management/company-memory.md`](<HQ/🏢_01_Management/company-memory.md>)와 [`HQ/📑_02_Workspace/strategy/WBS_and_daily_report.xlsx`](<HQ/📑_02_Workspace/strategy/WBS_and_daily_report.xlsx>) 참고.

## 🏗 만들면서 내린 주요 기술적 의사결정

- **Expo SDK 51→54 강제 업그레이드**: Expo Go가 최신 SDK만 지원한다는 걸 실기기 무한로딩 증상으로 발견 → React 18→19, RN 0.74→0.81, reanimated v3→v4 등 연쇄 업그레이드와 babel 설정 4건을 함께 수정.
- **웹 프리뷰 경로 포기**: `react-native-web` 백스크린 문제를 4차례 다른 가설로 진단했으나 모두 실패 → 이 앱의 타깃이 웹이 아니라는 점을 근거로 웹 디버깅을 중단하고 실기기 터널 접속으로 전환. 원인 불명 상태에서 계속 시간을 쓰는 대신 검증된 경로로 방향을 바꾼 판단.
- **AsyncStorage 도입 시 하이드레이션 경쟁 상태 대응**: 복원 완료 전 첫 프레임에서 잘못된 화면으로 분기하는 문제를 `useHydrated()` 훅 + 1500ms 타임아웃 세이프티밸브로 구조적으로 차단.
- **폰트 대체 시 사실 확인 우선**: 창업자가 요청한 Pretendard가 샌드박스에서 조회 불가했는데, 임의로 대체하는 대신 디자인 시안 파일들을 직접 열어 실제 렌더링 폰트(Noto Sans KR + Space Grotesk)를 확인한 뒤 그대로 채택하고 이 사실을 명시적으로 보고.

## 📚 문서

| 문서 | 내용 |
|---|---|
| [`PLANNING.md`](PLANNING.md) | 서비스 기획서 — 페르소나, MVP 범위, 유저플로우, 기술 아키텍처, 수익화 |
| [`ORG_CHART.md`](ORG_CHART.md) | 이 프로젝트를 지원하는 Claude Code 서브에이전트 조직도 |
| [`HQ/🏢_01_Management/company-memory.md`](<HQ/🏢_01_Management/company-memory.md>) | 프로젝트 전체 히스토리·결정사항 원장 |
| [`HQ/📑_02_Workspace/`](<HQ/📑_02_Workspace>) | 부서별 산출물 원본 (디자인 스펙, 수익화 시나리오, 개인정보처리방침, 엣지케이스/스토어심사 대응 등) |

## 🧑‍🤝‍🧑 AI 에이전트 조직

`.claude/agents/`에 등록된 14개 부서가 각자 역할 경계를 가지고 협업합니다: 경영전략·HR·제품기획·UI/UX·재무·법무·개발아키텍처·개발구현·QA·UI벤치마킹·마케팅그로스에 더해, 2026-07-31 확장으로 골프전문가(golf-coach)·비즈니스전략(golf-business-strategist)·정보보호(golf-security)·기록/포트폴리오(golf-career-archivist)가 추가됐습니다. 모든 조직 설계와 최종 의사결정은 창업자(조성일) 본인이 직접 수행하며, 각 에이전트는 실행 단위로만 동작합니다.

---

<div align="center">

*이 프로젝트는 Claude Code 기반 AI 에이전트 조직(기획·디자인·개발·QA·법무·재무·전략·보안·마케팅·기록)이 협업하여 만들고 있습니다.*

</div>
