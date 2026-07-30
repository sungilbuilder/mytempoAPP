import { View, Text } from 'react-native';

/**
 * 내 스윙 등록 기능 (Feature B, PLANNING.md).
 * 이번 프로토타입 단계(WBS 1.1~1.6)에서는 범위 밖 — Phase 2(WBS 2.x)에서 구현 예정:
 * 카메라롤 영상 로드 → 3점 마킹 → 비율 계산 → 저장.
 * 비주얼은 WBS 1.6 라이트/다크 토글 반영, 마킹 화면 목업은
 * 📑_02_Workspace/product_design/mytempo-ui-wireframes.html 참고.
 */
export default function MySwingsScreen() {
  return (
    <View className="flex-1 bg-bg dark:bg-bgDark p-6 gap-4">
      <View className="flex-row justify-end">
        <View className="bg-gold dark:bg-gold-neon rounded-full px-4 py-2">
          {/* 골드 배경은 라이트/다크 모두 밝은 편이라 텍스트는 항상 진한 톤 고정(onAccentDark) */}
          <Text className="text-onAccentDark font-nanum-bold text-xs">+ 새 영상 마킹</Text>
        </View>
      </View>
      <View className="flex-1 items-center justify-center gap-3">
        <Text className="text-ink dark:text-inkDark text-lg font-nanum-bold">
          아직 저장된 스윙이 없어요
        </Text>
        <Text className="text-muted dark:text-mutedDark text-center px-6">
          카메라롤에서 영상을 불러와 백스윙 시작/탑/임팩트를 마킹하는 기능은 다음 단계(Phase 2)에서 구현됩니다.
        </Text>
      </View>
    </View>
  );
}
