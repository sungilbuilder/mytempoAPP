/**
 * "지금 연습 대상"을 화면이 쓸 수 있는 형태로 풀어준다.
 * 프리셋이든 내 스윙이든 화면 입장에선 {라벨, 비율, 오디오} 하나면 되기 때문에
 * 분기를 이 훅 한 곳에만 두고 홈·연습·기록 화면은 결과만 받아 쓴다.
 */
import { usePracticeStore } from '../../store/usePracticeStore';
import { useSwingStore, getSwingById } from '../../store/useSwingStore';
import { TEMPO_PRESETS, getPresetById, nearestPreset } from './presets';
import { loopAudio, type SoundPackId } from '../audio-engine/soundPacks';

export type ActiveTempo = {
  label: string;
  /** 부제 — "내 스윙 · 7/24 저장" 같은 보조 문구 */
  sublabel: string;
  ratio: number;
  isOwnSwing: boolean;
  /**
   * 오디오를 고를 때 쓰는 프리셋 id (2026-08-01, 사운드 팩 도입).
   * 내 스윙은 비율이 임의라 가장 가까운 프리셋의 오디오를 빌려 쓴다.
   */
  presetIdForAudio: string;
  /** 선택한 사운드 팩에 맞는 오디오 파일을 돌려준다. */
  audioFileFor: (pack: SoundPackId) => any;
};

/** 아무것도 고른 적 없으면 첫 프리셋(3:1 안정형)을 기본으로 준다. */
export function useActiveTempo(): ActiveTempo {
  const source = usePracticeStore((s) => s.source);
  const swings = useSwingStore((s) => s.swings);

  if (source?.kind === 'swing') {
    const swing = getSwingById(swings, source.swingId);
    if (swing) {
      const d = new Date(swing.createdAt);
      // 내 스윙 비율에 가장 가까운 프리셋 오디오를 빌려 쓴다.
      // 임의 비율의 비프 루프를 실시간 생성하는 건 Phase 2 과제(WBS 2.0)다.
      const near = nearestPreset(swing.ratio);
      return {
        label: swing.name,
        sublabel: `내 스윙 · ${d.getMonth() + 1}/${d.getDate()} 저장`,
        ratio: swing.ratio,
        isOwnSwing: true,
        presetIdForAudio: near.id,
        audioFileFor: (pack: SoundPackId) => loopAudio(near.id, pack),
      };
    }
  }

  const preset =
    (source?.kind === 'preset' ? getPresetById(source.presetId) : undefined) ?? TEMPO_PRESETS[0];

  return {
    label: preset.alias,
    sublabel: `프리셋 · ${preset.ratioLabel}`,
    ratio: preset.ratioBackswing / preset.ratioDownswing,
    isOwnSwing: false,
    presetIdForAudio: preset.id,
    audioFileFor: (pack: SoundPackId) => loopAudio(preset.id, pack),
  };
}
