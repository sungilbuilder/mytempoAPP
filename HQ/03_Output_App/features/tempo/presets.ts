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
 * 프리셋 라벨링 방법론 (WBS 0.9, [[프리셋-라벨링-방법론]]):
 * - 비율(3:1 등)은 객관적 수치라 그대로 사용
 * - Tour Tempo 고유의 프레임 카운트 표기(21/7, 24/8 등)는 쓰지 않음 — 방법론 네이밍 유사성 회피
 *
 * ⚠️ 2026-08-06 별칭 교체 (AOS 리뷰 B-3 · 창업자 확정)
 *   안정형 → 여유롭게 · 균형형 → 고르게 · 파워형 → 길게
 *
 * 이전 별칭은 우열이 있는 것처럼 읽혔다("파워형"이 좋아 보이고 "안정형"이
 * 무난해 보인다). 하지만 이 셋을 가르는 건 **비율일 뿐 실력이 아니다.**
 * 새 별칭은 동작을 그대로 서술하기만 한다. 자세한 근거는 `character.ts` 주석 참고.
 *
 * ⚠️ `character.ts`의 라벨과 **반드시 같아야 한다.** 프리셋 화면과 결과 화면에서
 * 같은 비율이 다른 이름으로 불리면 사용자는 두 개념이라고 생각한다.
 *   2.5:1 → 고르게 · 3:1 → 여유롭게 · 3.5:1 → 길게
 */
export const TEMPO_PRESETS: TempoPreset[] = [
  {
    id: 'preset-3-1',
    alias: '여유롭게',
    ratioLabel: '3:1',
    // 2026-07-31: character.ts의 같은 라벨 설명과 표현을 맞췄다.
    // (두 곳에 다른 문장이 있어 프리셋 화면과 결과 화면에서 설명이 달라 보였다)
    description: '천천히 올렸다가 정확하게 내려놓는 리듬',
    ratioBackswing: 3,
    ratioDownswing: 1,
  },
  {
    id: 'preset-2-5-1',
    alias: '고르게',
    ratioLabel: '2.5:1',
    description: '올리고 내리는 시간 차가 크지 않은 리듬',
    ratioBackswing: 2.5,
    ratioDownswing: 1,
  },
  {
    id: 'preset-3-5-1',
    alias: '길게',
    ratioLabel: '3.5:1',
    description: '길게 끌어 올렸다가 짧게 내려오는 리듬',
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
