#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  마이템포 — 폰으로 보기 (QR코드)
#
#  실행:  npm run go            (같은 Wi-Fi일 때, 가장 빠름)
#         npm run go:tunnel     (Wi-Fi가 다르거나 안 될 때)
#
#  폰에서 Expo Go 앱을 열고 QR을 스캔하면 됩니다.
#  ⚠ Expo Go는 최신 SDK 하나만 지원합니다. "Something went wrong"이 뜨면
#    Wi-Fi 문제가 아니라 SDK 버전 불일치일 가능성이 높습니다 (2026-07-30에 하루 날린 원인).
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="${1:-}"

if [ ! -d node_modules ]; then
  echo ""
  echo "  ✗ node_modules가 없습니다. 먼저  npm run setup  을 실행해주세요."
  exit 1
fi

# 캐시 때문에 옛날 화면이 뜨는 걸 막는다 — 디자인을 갈아엎은 직후엔 특히 자주 생긴다.
CLEAR_FLAG="--clear"

echo ""
echo "  ┌────────────────────────────────────────┐"
echo "  │   마이템포 — 폰에서 열기               │"
echo "  ├────────────────────────────────────────┤"
echo "  │  1. 폰에서 Expo Go 앱을 켭니다         │"
echo "  │  2. 아래 QR코드를 스캔합니다           │"
echo "  │  3. 안 되면 Ctrl+C 후                  │"
echo "  │       npm run go:tunnel                │"
echo "  └────────────────────────────────────────┘"
echo ""

# expo-dev-client가 설치돼 있으면 expo CLI가 기본 타깃을 "개발 빌드"로 자동
# 전환한다 (아직 만든 적 없음, T-12 진행 중). 폰에는 여전히 일반 Expo Go 앱을
# 쓰므로 --go로 명시해서 강제로 Expo Go 타깃을 유지한다.
# (실제 개발 빌드를 만들고 나면 이 플래그를 빼고 --dev-client로 바꿀 것.)
GO_FLAG="--go"

if [ "$MODE" = "--tunnel" ]; then
  echo "  터널 모드로 시작합니다 (Wi-Fi가 달라도 됩니다. 조금 느립니다)"
  echo ""
  exec npx expo start --tunnel $CLEAR_FLAG $GO_FLAG
else
  # 맥과 폰이 같은 Wi-Fi에 있는지 힌트를 준다
  IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
  if [ -n "$IP" ]; then
    echo "  이 맥의 주소: $IP  — 폰이 같은 Wi-Fi에 있어야 합니다"
    echo ""
  fi
  exec npx expo start $CLEAR_FLAG $GO_FLAG
fi
