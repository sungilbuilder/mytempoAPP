/**
 * AsyncStorage 영속화 공용 설정 (2026-07-31, WBS 3.1a).
 *
 * 배경: 이전까지 zustand 스토어가 전부 메모리에만 있어서 앱을 재시작하면
 * 온보딩이 다시 뜨고 테마 선택이 초기화됐다. UX팀이 "알려진 제약이 아니라
 * 실사용자에겐 버그"로 판정해 우선순위를 올렸고, 이번 라운드에 도입한다.
 *
 * 주의: persist는 비동기라 첫 렌더 시점엔 아직 복원 전이다.
 * "복원됐는지"를 봐야 하는 화면(app/index.tsx 진입 가드)은 반드시
 * `useHydrated(store)`로 복원 완료를 기다린 뒤 분기해야 한다.
 * 안 그러면 저장된 값이 있어도 한 프레임 동안 기본값으로 잘못 분기한다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { StateCreator } from 'zustand';

export const storage = createJSONStorage(() => AsyncStorage);

/**
 * persist 옵션 보일러플레이트를 한 곳에 모아 키 오타/설정 누락을 막는다.
 *
 * ⚠️ 2026-08-01 치명적 버그 수정 — `partialize: undefined`를 넘기면 안 된다.
 *
 * zustand의 persist는 내부적으로 기본 옵션과 전달 옵션을 `{...기본값, ...전달값}`으로
 * 병합한다. 이때 **키가 존재하기만 하면 값이 undefined여도 기본값을 덮어쓴다.**
 * 그래서 `partialize: undefined`를 넘기면 zustand의 기본 구현
 * (`(state) => state`)이 사라지고, 저장 시점에 `options.partialize(...)`를 호출하다
 * "options.partialize is not a function"으로 터진다.
 *
 * 실제 증상: `partialize`를 안 넘긴 `useSettingsStore`만 저장이 터졌다.
 * 온보딩에서 테마를 고르거나 설정을 바꾸는 순간 크래시 → 그 여파로 스토어가
 * 반복 재초기화되면서 무한 렌더 루프까지 유발했다.
 *
 * → 값이 실제로 있을 때만 키를 넣는다.
 */
export function persisted<T>(
  name: string,
  initializer: StateCreator<T>,
  options?: { partialize?: (state: T) => Partial<T>; version?: number }
) {
  const persistOptions: Record<string, unknown> = {
    name: `mytempo:${name}`,
    storage,
    version: options?.version ?? 1,
  };

  // partialize를 지정한 스토어만 키를 추가한다. 지정하지 않으면
  // zustand 기본 동작(상태 전체 저장)이 그대로 살아있어야 한다.
  if (options?.partialize) {
    persistOptions.partialize = options.partialize;
  }

  return persist(initializer, persistOptions as never);
}

type HasPersist = {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (fn: () => void) => () => void;
  };
};

/**
 * 해당 스토어의 AsyncStorage 복원이 끝났는지 알려준다.
 * 이미 복원이 끝난 뒤 마운트되는 경우(hasHydrated()가 이미 true)도 처리한다.
 *
 * ⚠️ 안전장치: 복원 콜백이 끝내 안 오면 1.5초 뒤 그냥 진행한다.
 * 2026-07-30에 폰트 로딩이 실패했을 때 `fontsLoaded`가 영원히 false여서
 * 앱이 빈 화면에 갇혔던 적이 있다. "기다리는 조건"에는 반드시 탈출구를 둔다.
 * 최악의 경우 저장값 대신 기본값으로 시작할 뿐, 앱이 멈추지는 않는다.
 */
const HYDRATION_TIMEOUT_MS = 1500;

export function useHydrated(store: HasPersist): boolean {
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated());

  useEffect(() => {
    if (store.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    const unsub = store.persist.onFinishHydration(() => setHydrated(true));
    const timer = setTimeout(() => {
      console.warn('[마이템포] 저장값 복원이 지연됩니다 — 기본값으로 진행합니다.');
      setHydrated(true);
    }, HYDRATION_TIMEOUT_MS);

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [store]);

  return hydrated;
}
