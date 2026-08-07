/**
 * "지금 연습 대상"을 화면이 쓸 수 있는 형태로 풀어준다.
 * 프리셋이든 내 스윙이든 화면 입장에선 {라벨, 비율, 오디오} 하나면 되기 때문에
 * 분기를 이 훅 한 곳에만 두고 홈·연습·기록 화면은 결과만 받아 쓴다.
 */
import { usePracticeStore } from '../../store/usePracticeStore';
import { useSwingStore, getSwingById } from '../../store/useSwingStore';
import { TEMPO_PRESETS, getPresetById, nearestPreset } from './presets';
import { loopAudio, type SoundPackId } from '../audio-engine/soundPacks';
import { type SwingSpeedId } from './swingSpeeds';

export type ActiveTempo = {
  label: string;
  /** 부제 — "내 스윙 · 7/24 등록" 같은 보조 문구 */
  sublabel: string;
  ratio: number;
  isOwnSwing: boolean;
  /**
   * 사용자가 실제로 무언가 고른 적이 있는가. (2026-08-06 신설, AOS 리뷰 P-4)
   *
   * false면 지금 값은 **기본값일 뿐 "이어서 할 것"이 아니다.** 홈이 처음 켠
   * 사용자에게도 "이어서 연습 / 프리셋 · 3:1"이라고 말하고 있었는데,
   * 이어갈 게 없는데 이어서 하라고 하는 셈이다. 홈이 첫인상을 만드는 화면이라
   * 여기서 나는 위화감이 특히 아깝다.
   */
  hasHistory: boolean;
  /**
   * 오디오를 고를 때 쓰는 프리셋 id (2026-08-01, 사운드 팩 도입).
   * 내 스윙은 비율이 임의라 가장 가까운 프리셋의 오디오를 빌려 쓴다.
   */
  presetIdForAudio: string;
  /**
   * 선택한 사운드 팩·스윙 속도에 맞는 오디오 파일을 돌려준다.
   *
   * ⚠️ 2026-08-07: 속도 인자가 늘었다. 배속 재생을 없애고 속도별로 파일을
   * 따로 렌더링했기 때문이다(`soundPacks.ts` 주석 참고). 호출부는 속도가
   * 바뀌면 반드시 다시 로드해야 한다.
   */
  audioFileFor: (pack: SoundPackId, speed: SwingSpeedId) => any;
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
        /* 2026-08-06 용어 통일: 스윙은 "등록"한다 (AOS 리뷰 B-2) */
        sublabel: `내 스윙 · ${d.getMonth() + 1}/${d.getDate()} 등록`,
        ratio: swing.ratio,
        isOwnSwing: true,
        hasHistory: true,
        presetIdForAudio: near.id,
        audioFileFor: (pack: SoundPackId, speed: SwingSpeedId) => loopAudio(near.id, pack, speed),
      };
    }
  }

  const chosen = source?.kind === 'preset' ? getPresetById(source.presetId) : undefined;
  const preset = chosen ?? TEMPO_PRESETS[0];

  return {
    label: preset.alias,
    sublabel: `프리셋 · ${preset.ratioLabel}`,
    ratio: preset.ratioBackswing / preset.ratioDownswing,
    isOwnSwing: false,
    /* 고른 적이 없으면 기본값을 돌려주되, 그 사실을 화면이 알 수 있게 한다 */
    hasHistory: chosen !== undefined,
    presetIdForAudio: preset.id,
    audioFileFor: (pack: SoundPackId, speed: SwingSpeedId) => loopAudio(preset.id, pack, speed),
  };
}
