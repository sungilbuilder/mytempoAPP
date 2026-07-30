import { create } from 'zustand';

type OnboardingState = {
  hasSeenOnboarding: boolean;
  markOnboardingSeen: () => void;
};

/**
 * WBS 1.7 — 온보딩 완료 여부.
 *
 * 주의: 메모리(zustand)에만 저장 — 앱을 완전히 재시작하면 다시 false로 초기화되어
 * 온보딩이 매번 노출된다. 원래 기획(`landing-page-concept.md` 3절)은 AsyncStorage로
 * "최초 1회만" 영속시키는 것이지만, 이번 스프린트는 새 패키지 추가를 보류하기로 한
 * 방침(app/settings.tsx의 테마 선택과 동일한 이유)에 따라 범위 밖으로 뺐다.
 * @react-native-async-storage/async-storage 추가 시점(WBS 3.1)에 함께 영속화 예정.
 */
export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasSeenOnboarding: false,
  markOnboardingSeen: () => set({ hasSeenOnboarding: true }),
}));
