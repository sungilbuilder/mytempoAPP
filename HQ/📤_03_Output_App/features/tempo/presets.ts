export type TempoPreset = {
  id: string;
  name: string;
  /** 백스윙 구간 비율 (예: 3:1의 3) */
  ratioBackswing: number;
  /** 다운스윙 구간 비율 (예: 3:1의 1) */
  ratioDownswing: number;
  /** 사전 렌더링된 3단 비프 루프 오디오 (require된 모듈) */
  audioFile: any;
};

/**
 * 프리셋 라벨링 방법론 (WBS 0.9, PM 제안 승인 대기 중):
 * - 비율(3:1 등)은 객관적 수치라 그대로 사용
 * - Tour Tempo 고유의 프레임 카운트 표기(21/7, 24/8 등)는 쓰지 않음
 * - 감성적 별칭은 PM 확정 전까지 임시값
 */
export const TEMPO_PRESETS: TempoPreset[] = [
  {
    id: 'preset-3-1',
    name: '3:1 템포 · 안정형',
    ratioBackswing: 3,
    ratioDownswing: 1,
    audioFile: require('../../assets/audio/tempo_3_1.wav'),
  },
  {
    id: 'preset-2-5-1',
    name: '2.5:1 템포 · 균형형',
    ratioBackswing: 2.5,
    ratioDownswing: 1,
    audioFile: require('../../assets/audio/tempo_2_5_1.wav'),
  },
  {
    id: 'preset-3-5-1',
    name: '3.5:1 템포 · 파워형',
    ratioBackswing: 3.5,
    ratioDownswing: 1,
    audioFile: require('../../assets/audio/tempo_3_5_1.wav'),
  },
];

export function getPresetById(id: string | null): TempoPreset | undefined {
  if (!id) return undefined;
  return TEMPO_PRESETS.find((p) => p.id === id);
}

/** 비율을 미니 시각화 막대용 백분율(백스윙 비중)로 변환 */
export function ratioToBackswingPercent(preset: TempoPreset): number {
  return (preset.ratioBackswing / (preset.ratioBackswing + preset.ratioDownswing)) * 100;
}
