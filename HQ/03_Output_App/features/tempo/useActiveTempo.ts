/**
 * "지금 연습 대상"을 화면이 쓸 수 있는 형태로 풀어준다.
 * 프리셋이든 내 스윙이든 화면 입장에선 {라벨, 비율, 오디오} 하나면 되기 때문에
 * 분기를 이 훅 한 곳에만 두고 홈·연습·기록 화면은 결과만 받아 쓴다.
 */
import type { AudioSource } from 'expo-audio';
import { useTranslation } from 'react-i18next';
import { usePracticeStore } from '../../store/usePracticeStore';
import { useSwingStore, getSwingById } from '../../store/useSwingStore';
import { TEMPO_PRESETS, getPresetById, nearestPreset } from './presets';
import {
  cycleSec as presetCycleSec,
  loopAudio,
  type SoundPackId,
} from '../audio-engine/soundPacks';
import { getOrRenderSwingLoop } from '../audio-engine/dsp/cache';
import { getSwingSpeed, type SwingSpeedId } from './swingSpeeds';

/** `audioFileFor()`가 돌려주는 오디오 + 그 오디오의 실제 타이밍. */
export type ResolvedAudio = {
  source: AudioSource;
  /** 루프 한 바퀴 길이(초) — 샷 사이클 안전 대기시간 등에 쓴다. */
  cycleSec: number;
  /** 백스윙 시작~임팩트까지(초) — 링 애니메이션·임팩트 진동 타이밍에 쓴다. */
  swingSec: number;
};

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
   *
   * ⚠️ 2026-08-19 이후 내 스윙 오디오는 더 이상 이 프리셋을 빌려 쓰지 않는다
   * (아래 `audioFileFor` 참고) — 이 필드는 표시·통계용으로만 남아 있고,
   * "지금 로드된 오디오가 무엇인가"의 진실은 `audioKey`다.
   */
  presetIdForAudio: string;
  /**
   * 지금 로드해야 할 오디오를 유일하게 식별하는 키. 재로드 effect의
   * 의존성으로 `presetIdForAudio` 대신 이걸 써야 한다 — 내 스윙은 같은
   * `presetIdForAudio`(가장 가까운 프리셋 구간)를 공유해도 실측값이
   * 다르면 다른 오디오이기 때문이다.
   */
  audioKey: string;
  /**
   * 선택한 사운드 팩·스윙 속도에 맞는 오디오를 비동기로 만들어(또는 캐시에서
   * 찾아) 돌려준다.
   *
   * ⚠️ 2026-08-19 — **내 스윙(own swing)은 `speed` 인자를 무시한다.**
   * 이전에는 "가장 가까운 프리셋 오디오를 빌려 쓰고, 4단계 중 하나로만
   * 안내"했다(`useActiveTempo.ts` L54-55의 낡은 주석 "임의 비율의 비프 루프를
   * 실시간 생성하는 건 Phase 2 과제(WBS 2.0)다"가 이 판단의 흔적이었다).
   * 창업자가 2026-08-19에 이 방식을 폐기하고 **실측 backswingSec/downswingSec을
   * 그대로 온디바이스에서 합성**하기로 확정했다(T-38). 그래서 내 스윙은 항상
   * 자기 실측 타이밍으로만 재생되고, 스윙 속도 4단계 선택지는 프리셋 연습에만
   * 의미가 있다 — 화면에서 그 차이를 어떻게 보여줄지는 별도 화면 재설계 과제.
   *
   * 반환값에 `cycleSec`/`swingSec`도 함께 담는다 — 내 스윙은 이 값이 4단계
   * enum(`swingSpeeds.ts`)으로 계산될 수 없는 임의값이라, 호출부(링 애니메이션·
   * 임팩트 진동·샷 사이클 안전 대기시간)가 항상 이 반환값을 진실의 출처로 써야 한다.
   */
  audioFileFor: (pack: SoundPackId, speed: SwingSpeedId) => Promise<ResolvedAudio>;
};

/** 아무것도 고른 적 없으면 첫 프리셋(3:1 안정형)을 기본으로 준다. */
export function useActiveTempo(): ActiveTempo {
  const { t } = useTranslation('domain');
  const source = usePracticeStore((s) => s.source);
  const swings = useSwingStore((s) => s.swings);

  if (source?.kind === 'swing') {
    const swing = getSwingById(swings, source.swingId);
    if (swing) {
      const d = new Date(swing.createdAt);
      // 표시용으로만 쓴다 — 오디오는 더 이상 이 프리셋을 빌려 쓰지 않는다(위 주석 참고).
      const near = nearestPreset(swing.ratio);
      return {
        label: swing.name,
        /* 2026-08-06 용어 통일: 스윙은 "등록"한다 (AOS 리뷰 B-2) */
        sublabel: t('activeTempo.mySwingSublabel', { month: d.getMonth() + 1, day: d.getDate() }),
        ratio: swing.ratio,
        isOwnSwing: true,
        hasHistory: true,
        presetIdForAudio: near.id,
        audioKey: `swing:${swing.id}`,
        audioFileFor: async (pack: SoundPackId) => {
          const rendered = await getOrRenderSwingLoop(pack, swing.backswingSec, swing.downswingSec);
          return {
            source: { uri: rendered.uri },
            cycleSec: rendered.cycleSec,
            swingSec: rendered.swingSec,
          };
        },
      };
    }
  }

  const chosen = source?.kind === 'preset' ? getPresetById(source.presetId) : undefined;
  const preset = chosen ?? TEMPO_PRESETS[0];

  return {
    label: t(`character.${preset.characterId}.label`),
    sublabel: t('activeTempo.presetSublabel', { ratio: preset.ratioLabel }),
    ratio: preset.ratioBackswing / preset.ratioDownswing,
    isOwnSwing: false,
    /* 고른 적이 없으면 기본값을 돌려주되, 그 사실을 화면이 알 수 있게 한다 */
    hasHistory: chosen !== undefined,
    presetIdForAudio: preset.id,
    audioKey: `preset:${preset.id}`,
    audioFileFor: async (pack: SoundPackId, speed: SwingSpeedId) => ({
      source: loopAudio(preset.id, pack, speed),
      cycleSec: presetCycleSec(speed),
      swingSec: getSwingSpeed(speed).swingSec,
    }),
  };
}
