/**
 * 언어 동기화 — themeSync.ts와 같은 이유로 React 렌더 사이클 **밖에서** 처리한다.
 * i18next의 `changeLanguage()`는 그 자체로 리스너들에게 알림을 보내므로,
 * React 컴포넌트 안에서 구독 + setState를 얽으면 themeSync.ts가 겪었던 것과
 * 같은 종류의 리렌더 루프 위험이 생긴다. 이벤트(언어가 바뀌었다)에 반응하는
 * 구조로 통일한다.
 */
import i18n, { detectDeviceLanguage } from '../i18n';
import { useLanguageStore, type LanguagePref } from './useLanguageStore';

function resolve(pref: LanguagePref) {
  return pref === 'auto' ? detectDeviceLanguage() : pref;
}

let started = false;

/** 앱 시작 시 한 번만 호출한다. 두 번 이상 불러도 안전하다. */
export function startLanguageSync() {
  if (started) return;
  started = true;

  applyIfChanged(useLanguageStore.getState().language);

  useLanguageStore.subscribe((state, prev) => {
    if (state.language !== prev.language) {
      applyIfChanged(state.language);
    }
  });

  const persist = (
    useLanguageStore as unknown as {
      persist?: { onFinishHydration: (fn: () => void) => () => void; hasHydrated: () => boolean };
    }
  ).persist;

  if (persist) {
    if (persist.hasHydrated()) {
      applyIfChanged(useLanguageStore.getState().language);
    } else {
      persist.onFinishHydration(() => applyIfChanged(useLanguageStore.getState().language));
    }
  }
}

function applyIfChanged(pref: LanguagePref) {
  const next = resolve(pref);
  if (i18n.language !== next) {
    i18n.changeLanguage(next);
  }
}
