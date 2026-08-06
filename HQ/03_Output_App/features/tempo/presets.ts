export type TempoPreset = {
  id: string;
  /** 별칭 — "안정형" */
  alias: string;
  /** 비율 표기 — "3:1" */
  ratioLabel: string;
  /** 한 줄 설명 (시안의 프리셋 카드 문구) */
  description: string;
  /** 백스윙 구간 비율 (예: 3:1의 3) */
  ratioBackswing: number;
  /** 다운스윙 구간 비율 (예: 3:1의 1) */
  ratioDownswing: number;
};

/**
 * 프리셋 라벨링 방법론 (WBS 0.9, `preset-naming-methodology-proposal.md`):
 * - 비율(3:1 등)은 객관적 수치라 그대로 사용
 * - Tour Tempo 고유의 프레임 카운트 표기(21/7, 24/8 등)는 쓰지 않음 — 방법론 네이밍 유사성 회피
 * - 감성 별칭(안정형/균형형/파워형)은 PM 확정 전까지 잠정값
 *
 * 설명 문구는 2026-07-31 시안(Premium "프리셋" 화면)에서 가져왔다.
 */
export const TEMPO_PRESETS: TempoPreset[] = [
  {
    id: 'preset-3-1',
    alias: '안정형',
    ratioLabel: '3:1',
    // 2026-07-31: character.ts의 같은 라벨 설명과 표현을 맞췄다.
    // (두 곳에 다른 문장이 있어 프리셋 화면과 결과 화면에서 설명이 달라 보였다)
    description: '천천히 올렸다가 정확하게 내려놓는 리듬',
    ratioBackswing: 3,
    ratioDownswing: 1,
  },
  {
    id: 'preset-2-5-1',
    alias: '균형형',
    ratioLabel: '2.5:1',
    description: '올리고 내리는 속도가 고르게 이어지는 리듬',
    ratioBackswing: 2.5,
    ratioDownswing: 1,
  },
  {
    id: 'preset-3-5-1',
    alias: '파워형',
    ratioLabel: '3.5:1',
    description: '길게 끌어 올렸다가 빠르게 내려치는 리듬',
    ratioBackswing: 3.5,
    ratioDownswing: 1,
  },
];

export function getPresetById(id: string | null | undefined): TempoPreset | undefined {
  if (!id) return undefined;
  return TEMPO_PRESETS.find((p) => p.id === id);
}

/**
 * 임의 비율에 가장 가까운 프리셋. (2026-08-01 분리)
 * 사운드 팩 도입으로 "오디오 파일"이 아니라 "어느 프리셋인지"가 필요해졌다 —
 * 팩마다 파일이 다르므로 id를 알아야 조합을 고를 수 있다.
 */
export function nearestPreset(ratio: number): TempoPreset {
  return TEMPO_PRESETS.reduce((best, p) => {
    const r = p.ratioBackswing / p.ratioDownswing;
    const bestR = best.ratioBackswing / best.ratioDownswing;
    return Math.abs(r - ratio) < Math.abs(bestR - ratio) ? p : best;
  }, TEMPO_PRESETS[0]);
}

/** 비율을 미니 시각화 막대용 백분율(백스윙 비중)로 변환 */
export function ratioToBackswingPercent(preset: TempoPreset): number {
  return (preset.ratioBackswing / (preset.ratioBackswing + preset.ratioDownswing)) * 100;
}
