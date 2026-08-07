import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persisted } from '../persist';

/**
 * 2026-08-01 치명적 버그의 회귀 테스트.
 *
 * `partialize: undefined` 를 zustand persist 에 넘기면 기본 구현이 덮어써져
 * 저장 시점에 "options.partialize is not a function" 으로 터진다. 실제로
 * useSettingsStore 만 저장이 깨지면서 온보딩 테마 선택 → 크래시 →
 * 스토어 재초기화 → 무한 렌더 루프로 번졌다.
 *
 * 원래 이 동작은 `verify-tmp.js` 라는 임시 스크립트로 손으로 확인하고 있었다.
 * 그 스크립트를 지우고 여기로 옮긴다 — 손으로 돌려봐야 아는 검증은
 * 다음 사람이 돌리지 않는다.
 */
type Counter = { n: number; bump: () => void; label: string };

const makeStore = (name: string, options?: Parameters<typeof persisted<Counter>>[2]) =>
  create<Counter>()(
    persisted<Counter>(
      name,
      (set) => ({
        n: 0,
        label: 'init',
        bump: () => set((s) => ({ n: s.n + 1 })),
      }),
      options,
    ),
  );

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('persisted() — partialize 옵션 처리', () => {
  it('옵션 없이 만들어도 set 이 터지지 않는다 (기본 partialize 보존)', () => {
    const useStore = makeStore('t-no-options');
    expect(() => useStore.getState().bump()).not.toThrow();
    expect(useStore.getState().n).toBe(1);
  });

  it('빈 옵션 객체를 넘겨도 터지지 않는다', () => {
    const useStore = makeStore('t-empty-options', {});
    expect(() => useStore.getState().bump()).not.toThrow();
  });

  it('partialize 를 명시적으로 undefined 로 넘겨도 터지지 않는다', () => {
    const useStore = makeStore('t-undefined-partialize', { partialize: undefined });
    expect(() => useStore.getState().bump()).not.toThrow();
    expect(useStore.getState().n).toBe(1);
  });

  it('partialize 를 지정하면 그 형태로만 저장된다', async () => {
    const useStore = makeStore('t-partialized', {
      partialize: (s) => ({ n: s.n }),
    });
    useStore.getState().bump();
    await useStore.persist.rehydrate();

    const rawList = await AsyncStorage.getItem('mytempo:t-partialized');
    expect(rawList).not.toBeNull();
    const saved = JSON.parse(rawList as string);
    expect(saved.state).toHaveProperty('n');
    expect(saved.state).not.toHaveProperty('label');
    expect(saved.state).not.toHaveProperty('bump');
  });
});

describe('persisted() — 저장 키와 버전', () => {
  it('키에 mytempo: 네임스페이스를 붙인다', async () => {
    const useStore = makeStore('t-key');
    useStore.getState().bump();
    await useStore.persist.rehydrate();
    expect(await AsyncStorage.getItem('mytempo:t-key')).not.toBeNull();
  });

  it('버전 기본값은 1 이고 지정하면 그 값이 저장된다', async () => {
    const useStore = makeStore('t-version', { version: 3 });
    useStore.getState().bump();
    await useStore.persist.rehydrate();
    const saved = JSON.parse((await AsyncStorage.getItem('mytempo:t-version')) as string);
    expect(saved.version).toBe(3);
  });
});
