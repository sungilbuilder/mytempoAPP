/**
 * 테마 동기화 — React 렌더 사이클 **밖에서** 처리한다 (2026-08-01).
 *
 * ## 왜 이렇게까지 하는가
 *
 * 설정의 themeMode를 NativeWind에 반영하는 걸 원래는 `_layout.tsx`의 `useEffect`로
 * 했는데, 여기서 "Maximum update depth exceeded"가 반복해서 났다. 두 번 고쳤지만
 * (의존성 축소 → partialize 크래시 수정) 증상이 남았다.
 *
 * NativeWind의 `useColorScheme()` 구현을 열어보니 구조적으로 위험했다:
 *
 *   const [effect, setEffect] = useState(() => ({
 *     run: () => setEffect((s) => ({ ...s })),   // 알림 시 항상 새 객체 → 무조건 리렌더
 *     dependencies: new Set(),
 *   }));
 *   cleanupEffect(effect);                       // 렌더 중에 구독 해제
 *   return { colorScheme: colorScheme.get(effect) };  // 렌더 중에 재구독
 *
 * 즉 **렌더 도중에 구독을 해제하고 다시 등록**하며, 알림이 오면 새 객체로 setState해
 * 무조건 리렌더된다. 이 훅을 구독한 컴포넌트 안에서 `setColorScheme`을 호출하면
 * `렌더 → 구독 → 알림 → 리렌더` 고리가 만들어지기 쉽다.
 *
 * ## 해법
 *
 * 테마 변경은 **파생 상태가 아니라 사건(event)**이다. 렌더 결과로부터 계산할 게 아니라,
 * "사용자가 테마를 바꿨다"는 사건에 반응하면 된다. 그래서 zustand의 `subscribe`로
 * React 바깥에서 한 번만 연결한다. 렌더 사이클에 아예 참여하지 않으므로 루프가
 * 생길 수 없다.
 */
import { colorScheme } from 'nativewind';
import { useSettingsStore, type ThemeMode } from './useSettingsStore';

function apply(mode: ThemeMode) {
  // 'auto'는 NativeWind에서 'system'이라는 이름을 쓴다.
  colorScheme.set(mode === 'auto' ? 'system' : mode);
}

let started = false;

/**
 * 앱 시작 시 한 번만 호출한다. 두 번 이상 불러도 안전하다.
 *
 * - 현재 저장된 값을 즉시 반영
 * - 이후 themeMode가 **실제로 바뀔 때만** 반영 (같은 값이면 아무것도 하지 않음)
 * - AsyncStorage 복원이 끝난 시점에도 한 번 더 반영 (복원 전엔 기본값이므로)
 */
export function startThemeSync() {
  if (started) return;
  started = true;

  apply(useSettingsStore.getState().themeMode);

  useSettingsStore.subscribe((state, prev) => {
    if (state.themeMode !== prev.themeMode) {
      apply(state.themeMode);
    }
  });

  // 저장값 복원이 끝나면 그 값으로 다시 맞춘다.
  // (복원 전 첫 프레임엔 기본값 'auto'가 적용돼 있을 수 있다)
  const persist = (
    useSettingsStore as unknown as {
      persist?: { onFinishHydration: (fn: () => void) => () => void; hasHydrated: () => boolean };
    }
  ).persist;

  if (persist) {
    if (persist.hasHydrated()) {
      apply(useSettingsStore.getState().themeMode);
    } else {
      persist.onFinishHydration(() => apply(useSettingsStore.getState().themeMode));
    }
  }
}
