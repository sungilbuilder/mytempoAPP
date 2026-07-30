import { create } from 'zustand';

type PracticeState = {
  selectedPresetId: string | null;
  /** 배속(BPM 대응) — 비율은 유지, 절대 속도만 변경. 0.5 ~ 1.5 */
  bpmRate: number;
  isPlaying: boolean;
  setSelectedPreset: (id: string) => void;
  setBpmRate: (rate: number) => void;
  setIsPlaying: (playing: boolean) => void;
};

export const usePracticeStore = create<PracticeState>((set) => ({
  selectedPresetId: null,
  bpmRate: 1.0,
  isPlaying: false,
  setSelectedPreset: (id) => set({ selectedPresetId: id, isPlaying: false }),
  setBpmRate: (rate) => set({ bpmRate: Math.min(1.5, Math.max(0.5, rate)) }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
}));
