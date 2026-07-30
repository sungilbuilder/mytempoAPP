import { Redirect } from 'expo-router';
import { useOnboardingStore } from '../store/useOnboardingStore';

/**
 * 진입 가드 (WBS 1.7). 온보딩을 아직 안 봤으면 /onboarding, 봤으면 (tabs)로 즉시 리다이렉트.
 * hasSeenOnboarding은 현재 메모리 저장이라 완전 재시작 시 항상 false — useOnboardingStore.ts 주석 참고.
 */
export default function Index() {
  const hasSeenOnboarding = useOnboardingStore((s) => s.hasSeenOnboarding);
  return <Redirect href={hasSeenOnboarding ? '/(tabs)' : '/onboarding'} />;
}
