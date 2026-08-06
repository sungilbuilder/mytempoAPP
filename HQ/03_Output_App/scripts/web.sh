#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  마이템포 — 브라우저에서 실제 앱 보기
#
#  실행:  npm run web
#
#  폰이나 Wi-Fi 없이, 맥의 크롬에서 진짜 앱 코드를 그대로 렌더링합니다.
#  (react-native-web을 통해 app/ 폴더의 실제 화면이 돕니다 — 손으로 그린 목업이 아닙니다)
#
#  웹에서 안 되는 것: 진동(expo-haptics), 화면 항상 켜기, 오디오 일부.
#  이 세 가지는 폰에서 확인해야 합니다. 나머지 UI/UX/네비게이션/저장은 전부 동일합니다.
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
  echo ""
  echo "  ✗ node_modules가 없습니다. 먼저  npm run setup  을 실행해주세요."
  exit 1
fi

# 웹 실행에 필요한 패키지가 없으면 한 번만 설치한다.
if [ ! -d node_modules/react-native-web ] || [ ! -d node_modules/@expo/metro-runtime ]; then
  echo ""
  echo "  웹 실행용 패키지를 설치합니다 (최초 1회, 인터넷 필요)…"
  echo ""
  npx expo install react-native-web react-dom @expo/metro-runtime
fi

echo ""
echo "  ┌──────────────────────────────────────────────┐"
echo "  │  마이템포 — 브라우저에서 실제 앱             │"
echo "  ├──────────────────────────────────────────────┤"
echo "  │  잠시 후 크롬이 자동으로 열립니다.           │"
echo "  │  안 열리면 터미널에 뜨는 localhost 주소를    │"
echo "  │  직접 복사해 브라우저에 붙여넣으세요.        │"
echo "  │                                              │"
echo "  │  폰 화면처럼 보려면 크롬에서 F12 →           │"
echo "  │  좌측 상단 폰 아이콘(기기 툴바 전환) 클릭    │"
echo "  └──────────────────────────────────────────────┘"
echo ""

exec npx expo start --web --clear
