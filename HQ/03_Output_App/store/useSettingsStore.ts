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
    // 2026-08-01 신설 — 사운드 팩 / 어드레스 대기 (WBS 2.8)
    soundPack: 'wood',
    shotIntervalSec: 25,
    setThemeMode: (themeMode) => set({ themeMode }),
    setBeepVolume: (v) => set({ beepVolume: Math.min(1, Math.max(0, v)) }),
    toggleHaptic: () => set((s) => ({ hapticOnImpact: !s.hapticOnImpact })),
    toggleKeepAwake: () => set((s) => ({ keepAwake: !s.keepAwake })),
    setFontScale: (fontScale) => set({ fontScale }),
    setSoundPack: (soundPack) => set({ soundPack }),
    setShotInterval: (shotIntervalSec) => set({ shotIntervalSec }),
  }))
);

/** 글자 크기 배율 — Text의 크기를 직접 곱할 때 쓴다. */
export function fontScaleValue(scale: FontScale): number {
  return scale === 'large' ? 1.15 : 1;
}
