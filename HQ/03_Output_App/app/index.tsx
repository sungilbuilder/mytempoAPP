import { View, Text } from 'react-native';
import { useRenderTrace } from '../features/debug/useRenderTrace';
import { Redirect } from 'expo-router';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useHydrated } from '../store/persist';

/**
 * 진입 가드 — 온보딩을 본 적 있으면 홈으로, 아니면 온보딩으로.
 *
 * ⚠️ AsyncStorage 복원은 비동기다. hydrated를 기다리지 않고 분기하면
 * 이미 온보딩을 마친 사용자에게도 첫 프레임에 온보딩이 스쳐 보인다.
 */
export default function Index() {
  useRenderTrace('Index(진입가드)');
  const hydrated = useHydrated(useOnboardingStore);
  const hasSeenOnboarding = useOnboardingStore((s) => s.hasSeenOnboarding);

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-bg dark:bg-bgDark">
        <Text className="text-body text-muted dark:text-mutedDark">불러오는 중…</Text>
      </View>
    );
  }

  return <Redirect href={hasSeenOnboarding ? '/(tabs)' : '/onboarding'} />;
}
