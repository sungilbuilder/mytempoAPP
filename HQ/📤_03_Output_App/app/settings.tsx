import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useColorScheme, colorScheme as nwColorScheme } from 'nativewind';

/**
 * 설정 화면 (WBS 1.6) — 라이트/다크 테마 선택 + 오픈소스 라이선스 고지(WBS 1.8).
 *
 * 주의(다음 스프린트 후보): 선택값이 AsyncStorage에 영속되지 않아 앱 재시작 시 "시스템 설정
 * 따르기"로 초기화된다. 영속화하려면 @react-native-async-storage/async-storage 추가가 필요한데
 * (PLANNING.md 6절 WBS 3.1에 이미 예정된 작업), 이번 라운드는 범위 밖이라 새 패키지를 추가하지
 * 않았다 — 다음 스프린트에서 WBS 3.1과 함께 처리 권장.
 */
type ThemeOption = 'system' | 'light' | 'dark';

const OPTIONS: { key: ThemeOption; label: string }[] = [
  { key: 'system', label: '시스템 설정 따르기' },
  { key: 'light', label: '라이트' },
  { key: 'dark', label: '다크' },
];

export default function SettingsScreen() {
  const { colorScheme } = useColorScheme();
  const [selected, setSelected] = useState<ThemeOption>('system');

  const choose = (key: ThemeOption) => {
    setSelected(key);
    nwColorScheme.set(key);
  };

  return (
    <ScrollView className="flex-1 bg-bg dark:bg-bgDark">
      <Stack.Screen options={{ title: '설정', headerShown: true }} />
      <View className="p-6 gap-8">
        <View className="gap-3">
          <Text className="text-ink dark:text-inkDark font-nanum-bold text-base">테마</Text>
          <View className="bg-surface dark:bg-surfaceDark rounded-2xl overflow-hidden">
            {OPTIONS.map((opt, i) => (
              <Pressable
                key={opt.key}
                onPress={() => choose(opt.key)}
                className={`flex-row items-center justify-between px-4 py-4 ${
                  i > 0 ? 'border-t border-line dark:border-lineDark' : ''
                }`}
              >
                <Text className="text-ink dark:text-inkDark">{opt.label}</Text>
                {selected === opt.key && (
                  <Text className="text-green dark:text-green-neon font-nanum-bold">✓</Text>
                )}
              </Pressable>
            ))}
          </View>
          <Text className="text-muted dark:text-mutedDark text-xs">
            현재 적용된 화면: {colorScheme === 'dark' ? '다크' : '라이트'}
          </Text>
        </View>

        <View className="gap-3">
          <Text className="text-ink dark:text-inkDark font-nanum-bold text-base">오픈소스 라이선스</Text>
          <View className="bg-surface dark:bg-surfaceDark rounded-2xl p-4">
            <Text className="text-muted dark:text-mutedDark text-xs leading-5">
              본 앱은 네이버에서 제공한 나눔글꼴이 적용되어 있습니다. (SIL Open Font License 1.1)
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
