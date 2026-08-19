#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  마이템포 — 폰으로 보기 (QR코드)
#
#  실행:  npm run go            (같은 Wi-Fi일 때, 가장 빠름)
#         npm run go:tunnel     (Wi-Fi가 다르거나 안 될 때)
#
#  폰에 dev-client(npm run android 로 빌드·설치)가 깔려 있어야 합니다.
#  일반 Expo Go 앱으로는 안 됩니다 — react-native-audio-api 등 서드파티
#  네이티브 모듈은 Expo Go 바이너리에 들어있지 않습니다 (T-38).
#  dev-client를 열고 QR을 스캔하면 됩니다.
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
echo "  │  1. 폰에서 dev-client 앱을 켭니다      │"
echo "  │  2. 아래 QR코드를 스캔합니다           │"
echo "  │  3. 안 되면 Ctrl+C 후                  │"
echo "  │       npm run go:tunnel                │"
echo "  └────────────────────────────────────────┘"
echo ""

# react-native-audio-api(리버브, T-38) 네이티브 모듈이 들어오면서 Expo Go로는
# 더 이상 실행이 안 된다 — Expo Go는 서드파티 네이티브 코드를 담을 수 없고,
# app.json의 config plugin도 prebuild를 거치는 dev-client에서만 적용된다.
# 폰에 dev-client APK(npm run android 또는 eas build --profile development)를
# 설치해뒀다는 전제로 --dev-client 타깃을 강제한다.
GO_FLAG="--dev-client"

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
