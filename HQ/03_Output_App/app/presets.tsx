import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { palette } from '../constants/theme';
import { Button, Caption, IconCheck, IconChevronLeft } from '../components/ui';
import { TEMPO_PRESETS, ratioToBackswingPercent } from '../features/tempo/presets';
import { usePracticeStore } from '../store/usePracticeStore';

/**
 * 프리셋 — "템포 고르기"
 *
 * 시안 근거: Premium "프리셋"
 *   왜: 선택된 카드에만 테두리+그림자를 줘 다른 카드와 위계를 분리 →
 *   선택 실수로 인한 이탈을 줄인다. 선택엔 체크 마이크로 인터랙션.
 *
 * 탭이 아니라 홈에서 "템포 바꾸기"로 들어오는 화면이다 —
 * 매번 고르는 화면이 아니라 한 번 고르고 마는 화면이라서.
 */
export default function PresetsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = palette(colorScheme);
  const source = usePracticeStore((s) => s.source);
  const selectPreset = usePracticeStore((s) => s.selectPreset);

  const selectedId = source?.kind === 'preset' ? source.presetId : null;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bgDark" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-s3 pt-s1 pb-s2">
        <Pressable onPress={() => router.back()} hitSlop={14}>
          <IconChevronLeft color={c.ink} size={22} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}>
        <Text className="font-kr-bold text-h1 text-ink dark:text-inkDark">템포 고르기</Text>
        <Caption className="pt-[6px]">먼저 고르고, 나중에 내 스윙으로 바꿀 수 있어요</Caption>

        <View className="gap-[12px] pt-s3">
          {TEMPO_PRESETS.map((preset) => {
            const active = preset.id === selectedId;
            const backPct = ratioToBackswingPercent(preset);

            return (
              <Pressable
                key={preset.id}
                onPress={() => selectPreset(preset.id)}
                className={`rounded-lg p-s2 active:opacity-85 ${
                  active
                    ? 'bg-surface dark:bg-surfaceDark border-2 border-primary dark:border-primary-neon'
                    : 'bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-s2">
                    <View className="flex-row items-center gap-[8px]">
                      <Text className="font-kr-bold text-h2 text-ink dark:text-inkDark">
                        {preset.alias}
                      </Text>
                      {active && (
                        <View className="w-[20px] h-[20px] rounded-pill items-center justify-center bg-primary dark:bg-primary-neon">
                          <IconCheck color={colorScheme === 'dark' ? c.onPrimary : '#FFFFFF'} size={13} />
                        </View>
                      )}
                    </View>
                    <Caption className="pt-[4px]">{preset.description}</Caption>
                  </View>
                  <Text className="font-display-bold text-[26px] text-ink dark:text-inkDark">
                    {preset.ratioLabel}
                  </Text>
                </View>

                {/* 비율 미니 바 — 그린(백스윙) : 골드(다운스윙) */}
                <View className="flex-row h-[8px] rounded-pill overflow-hidden mt-s2 bg-track dark:bg-trackDark">
                  <View
                    style={{ width: `${backPct}%`, backgroundColor: c.primary }}
                    className="h-full"
                  />
                  <View style={{ flex: 1, backgroundColor: c.accent }} className="h-full" />
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View className="px-s3 pb-s2">
        <Button
          label="이 템포로 연습"
          onPress={() => router.replace('/practice')}
        />
      </View>
    </SafeAreaView>
  );
}
