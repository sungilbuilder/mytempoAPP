#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  마이템포 — 최초 1회 세팅 (2026-07-31 최종)
#
#  새로 추가된 패키지를 설치한다.
#    react-native-svg   → 템포 링(시그니처 컴포넌트)
#    AsyncStorage       → 설정·온보딩·내 스윙·기록 영속
#    expo-haptics       → 임팩트 진동
#    expo-keep-awake    → 연습 중 화면 항상 켜기
#    expo-audio         → 메트로놈 (expo-av에서 마이그레이션, SDK55 대비)
#    expo-splash-screen → 스플래시에 로고 표시
#    expo-image-picker  → 갤러리에서 스윙 영상 선택
#    expo-video         → 영상 재생·프레임 탐색
#    Noto Sans KR / Space Grotesk → 시안 폰트
#
#  ⚠ package.json에 적힌 버전은 샌드박스에서 npm 조회가 막혀 추정값으로 넣은 것이다.
#    아래 [2/3]의 `npx expo install`이 SDK54에 맞는 정확한 버전으로 덮어쓴다.
#    이 단계를 건너뛰면 버전 불일치로 실행이 실패할 수 있다.
#
#  실행:  npm run setup
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

echo ""
echo "  마이템포 세팅을 시작합니다"
echo "  ────────────────────────────────────────"
echo ""

if ! command -v npx >/dev/null 2>&1; then
  echo "  ✗ Node.js가 필요합니다. https://nodejs.org 에서 설치 후 다시 실행해주세요."
  exit 1
fi

echo "  [1/3] 기존 의존성 설치…"
# react-dom을 devDependencies에 추가해 peer 충돌을 해소했으므로
# 이제 --legacy-peer-deps 없이 설치되어야 한다. 실패하면 폴백한다.
if ! npm install; then
  echo ""
  echo "  ⚠ 기본 설치가 실패했습니다. --legacy-peer-deps로 재시도합니다."
  echo "    (이 경우 의존성 트리 부채가 아직 남아있다는 뜻이니 알려주세요)"
  npm install --legacy-peer-deps
fi

echo ""
echo "  [2/3] 새 패키지를 SDK에 맞는 버전으로 정렬…"
echo "        (package.json의 추정 버전을 정확한 값으로 덮어씁니다)"
npx expo install \
  react-native-svg \
  @react-native-async-storage/async-storage \
  expo-haptics \
  expo-keep-awake \
  expo-audio \
  expo-splash-screen \
  expo-image-picker \
  expo-video \
  @expo-google-fonts/noto-sans-kr \
  @expo-google-fonts/space-grotesk

echo ""
echo "  [3/3] 타입 검사…"
npm run typecheck || echo "  ⚠ 타입 경고가 있지만 실행에는 지장 없을 수 있습니다."

echo ""
echo "  ✓ 세팅 완료"
echo ""
echo "    이제  npm run go  를 실행하면 QR코드가 나옵니다."
echo ""
