import { View, Text, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { TEMPO_PRESETS, ratioToBackswingPercent, TempoPreset } from '../../features/tempo/presets';
import { usePracticeStore } from '../../store/usePracticeStore';

/**
 * WBS 1.5 다크모드 → WBS 1.6 라이트/다크 토글: NativeWind `dark:` variant 병행 표기.
 * 접두어 없음=라이트(WBS1.4 팔레트 재사용), `dark:`=다크(WBS1.5 네온). tailwind.config.js 참고.
 */
function PresetCard({ preset }: { preset: TempoPreset }) {
  const router = useRouter();
  const setSelectedPreset = usePracticeStore((s) => s.setSelectedPreset);
  const backswingPercent = ratioToBackswingPercent(preset);

  const goPractice = () => {
    setSelectedPreset(preset.id);
    router.push('/practice');
  };

  return (
    <View className="bg-surface dark:bg-surfaceDark rounded-2xl p-6 gap-3">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-ink dark:text-inkDark text-base font-nanum-bold">{preset.name}</Text>
        <Text className="text-ink dark:text-inkDark text-3xl font-nanum-extrabold">
          {preset.ratioBackswing}:{preset.ratioDownswing}
        </Text>
      </View>
      <View className="flex-row h-4 rounded-full overflow-hidden bg-surface2 dark:bg-surface2Dark">
        <View className="bg-green dark:bg-green-neon" style={{ flex: backswingPercent }} />
        <View className="bg-gold dark:bg-gold-neon" style={{ flex: 100 - backswingPercent }} />
      </View>
      <View className="flex-row justify-end gap-3 mt-1">
        <Pressable className="border border-line dark:border-lineDark rounded-xl px-4 py-2">
          <Text className="text-muted dark:text-mutedDark font-nanum-bold">미리듣기</Text>
        </Pressable>
        <Pressable className="bg-green dark:bg-green-neon rounded-xl px-4 py-2" onPress={goPractice}>
          <Text className="text-onAccent dark:text-onAccentDark font-nanum-bold">이 템포로 연습하기</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function PresetsScreen() {
  return (
    <View className="flex-1 bg-bg dark:bg-bgDark">
      <FlatList
        data={TEMPO_PRESETS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PresetCard preset={item} />}
        contentContainerClassName="p-6 gap-4"
      />
    </View>
  );
}
