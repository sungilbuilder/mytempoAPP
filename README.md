<div align="center">

<img src="HQ/📤_03_Output_App/assets/images/icon.png" width="120" alt="마이템포 앱 아이콘" />

# 🏌️ 마이템포 (mytempo-golf)

**내 최고의 스윙이 가진 리듬을 숫자로 저장하고, 소리로 반복 훈련하여 몸에 새긴다.**

Tour Tempo 개념(백스윙 시작 → 탑 → 임팩트, 3구간 비율 템포)에서 영감을 받은
React Native(Expo) 기반 iOS/Android 크로스플랫폼 골프 스윙 템포 트레이닝 앱

[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](HQ/📤_03_Output_App/package.json)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=black)](HQ/📤_03_Output_App/package.json)
[![Status](https://img.shields.io/badge/Status-Phase%201%20Prototype-orange)](#-진행-상황)
[![Platform](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-lightgrey)](#)

</div>

---

## 📌 소개

라운드마다 들쭉날쭉한 스윙 리듬을 **숫자(비율)**로 확인하고, 그 리듬을 **오디오 메트로놈**으로 반복 연습하는 완전 오프라인 골프 훈련 앱입니다.

| 페르소나 | 니즈 |
|---|---|
| 템포 방황형 중급 골퍼 (핸디 10~20대) | 객관적 숫자로 자기 템포 확인 |
| 레슨 병행 입문자 | 단순한 리듬 신호를 따라 하는 낮은 진입장벽 |
| 슬럼프 탈출 상급 골퍼 | 잘 맞았던 시절 영상의 템포를 재현 목표로 삼기 |

## ✨ 핵심 기능 (MVP)

- **🎯 템포 프리셋** — 이름 붙은 비율 템포(3:1 / 2.5:1 / 3.5:1) 목록 중 선택
- **🎥 내 스윙 등록** — 카메라롤 영상에서 백스윙 시작/탑/임팩트 3지점을 마킹 → 비율 자동 계산 → 저장 *(다음 단계)*
- **🔊 연습 화면** — 선택한 템포 비율대로 3단 비프음(저음/중음/강조음)이 반복 재생되는 오디오 메트로놈, 배속(BPM) 조절 지원
- **🌓 라이트/다크 모드** — 시스템 설정 따르기 포함 3단 테마 전환
- **👋 온보딩** — 최초 실행 시 3장 스와이프로 핵심 가치를 15초 안에 전달

## 🛠 기술 스택

- **프레임워크**: React Native + Expo (SDK 54), `expo-router` 파일 기반 라우팅
- **스타일링**: NativeWind (Tailwind for RN), 다크모드 네온 팔레트 + `expo-blur` 글래스모피즘
- **애니메이션**: `react-native-reanimated`
- **상태관리**: Zustand
- **오디오**: `expo-av` — 사전 렌더링된 3단 비프 루프 파일을 배속 조절하여 재생 (JS 타이머 대신 네이티브 loop로 정밀도 확보)
- **폰트**: 나눔고딕 (`@expo-google-fonts/nanum-gothic`, SIL OFL 1.1)

## 📂 프로젝트 구조

```
.
├── HQ/                          # 프로젝트 운영 허브 (AI 에이전트 조직 기반)
│   ├── 🏢_01_Management/        # 조직 운영, 보고 프로토콜
│   ├── 📑_02_Workspace/         # 부서별 산출물 (기획/디자인/엔지니어링/재무법무/전략)
│   └── 📤_03_Output_App/        # ⭐ 실제 Expo 앱 소스 코드
│       ├── app/                 #   화면 (프리셋 / 내 스윙 / 연습 / 설정 / 온보딩)
│       ├── features/            #   템포 계산, 오디오 엔진
│       ├── store/                #   Zustand 전역 상태
│       └── assets/               #   아이콘, 비프 오디오
├── PLANNING.md                  # 서비스 기획서 (페르소나 · MVP 범위 · 아키텍처 · 로드맵)
└── ORG_CHART.md                 # 프로젝트를 지원하는 Claude Code 서브에이전트 조직도
```

## 🚀 시작하기

```bash
cd "HQ/📤_03_Output_App"
npm install
npx expo start
```

Expo Go 앱으로 QR코드를 스캔해 실행합니다. 같은 Wi-Fi에 연결이 안 되는 환경이라면:

```bash
npx expo start --tunnel
```

## 📈 진행 상황

**Phase 1 프로토타입 — WBS 1.1~1.8 완료**

- ✅ 프리셋 3종 + 오디오 메트로놈 엔진 + 연습 화면
- ✅ 브랜드 디자인 시스템 · 다크모드 네온 리뉴얼
- ✅ 라이트/다크 토글, 랜딩/온보딩 3장 스와이프
- ✅ 나눔고딕 폰트 적용 (라이선스 검증 완료)
- ⬜ 카메라롤 영상 마킹(내 스윙 등록) — 다음 단계
- ⬜ AsyncStorage 영속화 (현재 테마/온보딩 상태는 앱 재시작 시 초기화됨)
- ⬜ 연습 히스토리, 접근성(진동) 세부 구현

자세한 진행 로그는 [`HQ/📤_03_Output_App/README.md`](HQ/📤_03_Output_App/README.md) 참고.

## 📚 문서

| 문서 | 내용 |
|---|---|
| [`PLANNING.md`](PLANNING.md) | 서비스 기획서 — 페르소나, MVP 범위, 유저플로우, 기술 아키텍처, 수익화 |
| [`ORG_CHART.md`](ORG_CHART.md) | 이 프로젝트를 지원하는 Claude Code 서브에이전트 조직도 |
| [`HQ/📑_02_Workspace/`](<HQ/📑_02_Workspace>) | 부서별 산출물 원본 (디자인 스펙, 와이어프레임, 수익화 시나리오, 개인정보처리방침 등) |

---

<div align="center">

*이 프로젝트는 Claude Code 기반 AI 에이전트 조직(기획·디자인·개발·QA·법무·재무)이 협업하여 만들고 있습니다.*

</div>
