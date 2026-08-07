/**
 * 설정 — 화면 모드 / 소리·진동 / 접근성. 전부 AsyncStorage에 영속된다.
 * 시안 근거: Premium.dc.html "설정" 화면 (화면 · 소리·진동 · 접근성 3개 그룹)
 */
import { create } from 'zustand';
import { persisted } from './persist';
import type { ShotIntervalSec, SoundPackId } from '../features/audio-engine/soundPacks';

export type ThemeMode = 'light' | 'dark' | 'auto';
/** 접근성 — 5060 사용자 이탈 방지용 글자 크기 배율 */
export type FontScale = 'normal' | 'large';

type SettingsState = {
  themeMode: ThemeMode;
  /** 0 ~ 1 */
  beepVolume: number;
  /** 임팩트 비프에 맞춰 햅틱 진동 */
  hapticOnImpact: boolean;
  /** 연습 중 화면 자동 잠금 방지 */
  keepAwake: boolean;
  fontScale: FontScale;
  /**
   * 확인음 (2026-08-06 신설, T-24)
   *
   * 마킹 확정·스윙 등록·20스윙 달성에서 나는 짧은 확인음.
   * 기본값 true — 이 제품은 소리가 본체이고, 확인음은 화면을 안 보고도
   * "됐다"를 알게 해준다. 다만 도서관·회의실처럼 소리를 낼 수 없는 곳에서는
   * 끌 수 있어야 하므로 토글을 둔다(메트로놈 볼륨과는 별개 축이다).
   */
  uiSounds: boolean;
  /** 메트로놈 음색 (2026-08-01) */
  soundPack: SoundPackId;
  /** 재생을 눌러도 이만큼 카운트인 후 시작한다 (2026-08-01) */
  /**
   * 샷 간격 (2026-08-01 — 기존 addressDelaySec을 대체)
   * 0이면 연속(빈 스윙), 그 외는 한 샷에서 다음 샷까지의 전체 시간(초).
   */
  shotIntervalSec: ShotIntervalSec;
  setThemeMode: (mode: ThemeMode) => void;
  setBeepVolume: (v: number) => void;
  toggleHaptic: () => void;
  toggleKeepAwake: () => void;
  setFontScale: (s: FontScale) => void;
  toggleUiSounds: () => void;
  setSoundPack: (p: SoundPackId) => void;
  setShotInterval: (s: ShotIntervalSec) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persisted<SettingsState>('settings', (set) => ({
    themeMode: 'auto',
    beepVolume: 0.8,
    hapticOnImpact: true,
    keepAwake: true,
    fontScale: 'normal',
    // 2026-08-06 신설 — 확인음 (T-24)
    uiSounds: true,
    // 2026-08-01 신설 — 사운드 팩 / 어드레스 대기 (WBS 2.8)
    soundPack: 'wood',
    shotIntervalSec: 25,
    setThemeMode: (themeMode) => set({ themeMode }),
    setBeepVolume: (v) => set({ beepVolume: Math.min(1, Math.max(0, v)) }),
    toggleHaptic: () => set((s) => ({ hapticOnImpact: !s.hapticOnImpact })),
    toggleKeepAwake: () => set((s) => ({ keepAwake: !s.keepAwake })),
    setFontScale: (fontScale) => set({ fontScale }),
    toggleUiSounds: () => set((s) => ({ uiSounds: !s.uiSounds })),
    setSoundPack: (soundPack) => set({ soundPack }),
    setShotInterval: (shotIntervalSec) => set({ shotIntervalSec }),
  })),
);

/** 글자 크기 배율 — Text의 크기를 직접 곱할 때 쓴다. */
export function fontScaleValue(scale: FontScale): number {
  return scale === 'large' ? 1.15 : 1;
}
