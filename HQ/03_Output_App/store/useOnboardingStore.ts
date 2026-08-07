/**
 * 온보딩 완료 여부. (2026-07-31) AsyncStorage 영속으로 전환.
 *
 * 이전에는 메모리에만 있어서 앱을 재시작할 때마다 온보딩이 다시 떴다.
 * UX팀이 "알려진 제약이 아니라 실사용자에겐 버그"로 판정 → WBS 3.1a로 승격되어 수정됨.
 *
 * ⚠️ 복원이 비동기라, 진입 가드(app/index.tsx)는 반드시 `useHydrated`로
 * 복원 완료를 기다린 뒤 분기해야 한다. 안 그러면 이미 온보딩을 본 사용자에게도
 * 첫 프레임에 온보딩이 스쳐 보인다.
 */
import { create } from 'zustand';
import { persisted } from './persist';

type OnboardingState = {
  hasSeenOnboarding: boolean;
  markOnboardingSeen: () => void;
  resetOnboarding: () => void;
};

export const useOnboardingStore = create<OnboardingState>()(
  persisted<OnboardingState>(
    'onboarding',
    (set) => ({
      hasSeenOnboarding: false,
      markOnboardingSeen: () => set({ hasSeenOnboarding: true }),
      resetOnboarding: () => set({ hasSeenOnboarding: false }),
    }),
    { partialize: (s) => ({ hasSeenOnboarding: s.hasSeenOnboarding }) },
  ),
);
