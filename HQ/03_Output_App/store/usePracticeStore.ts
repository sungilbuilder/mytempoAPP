/**
 * 지금 무엇을, 어떤 속도로 연습 중인가.
 *
 * "마지막에 뭘 연습했는지"는 홈 화면의 [이어서 연습] 한 버튼을 만들기 위해
 * 영속시킨다(시안 근거: Premium "홈" — 앱을 켜자마자 누를 것이 하나만 보이게).
 * 재생 중 여부(isPlaying)는 세션마다 초기화되어야 하므로 영속 대상이 아니다.
 */
import { create } from 'zustand';
import { persisted } from './persist';
import { DEFAULT_SWING_SPEED, type SwingSpeedId } from '../features/tempo/swingSpeeds';

/** 연습 소스: 프리셋 3종 중 하나이거나, 저장해둔 내 스윙 */
export type PracticeSource =
  | { kind: 'preset'; presetId: string }
  | { kind: 'swing'; swingId: string };

type PracticeState = {
  source: PracticeSource | null;
  /**
   * 스윙 속도 (2026-08-01 신설, WBS 2.11)
   *
   * 비율과는 다른 축이다. 비율이 "백스윙:다운스윙이 몇 대 몇인가"라면
   * 이건 "스윙 하나가 몇 초에 끝나는가"다. 느린 속도로 리듬을 익힌 뒤
   * 점점 올리는 훈련 진행을 만들려면 이 축이 필요하다.
   *
   * ⚠️ 별도 `rate` 필드를 두지 않는다. 예전엔 rate와 속도를 둘 다 상태로
   * 들고 있었는데, 속도만 영속되고 rate는 안 되니 앱을 재시작하면
   * "빠르게로 표시되는데 소리는 보통"인 어긋남이 생겼다.
   * 진실의 출처를 하나로 줄여 그 버그 자체를 없앤다.
   *
   * ⚠️ 2026-08-07: 재생 배속이라는 개념 자체가 사라졌다. 이제 이 값은
   * **어느 오디오 파일을 로드하는가**를 정한다 — `soundPacks.loopAudio()`.
   * 길이가 필요하면 `cycleSec(swingSpeed)` / `impactAtMs(swingSpeed)`.
   */
  swingSpeed: SwingSpeedId;
  isPlaying: boolean;
  selectPreset: (presetId: string) => void;
  selectSwing: (swingId: string) => void;
  setSwingSpeed: (id: SwingSpeedId) => void;
  setIsPlaying: (playing: boolean) => void;
};

export const usePracticeStore = create<PracticeState>()(
  persisted<PracticeState>(
    'practice',
    (set) => ({
      source: null,
      swingSpeed: DEFAULT_SWING_SPEED,
      isPlaying: false,
      selectPreset: (presetId) =>
        set({ source: { kind: 'preset', presetId }, isPlaying: false }),
      selectSwing: (swingId) =>
        set({ source: { kind: 'swing', swingId }, isPlaying: false }),
      setSwingSpeed: (id) => set({ swingSpeed: id }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
    }),
    /*
      재생 상태는 저장하지 않는다 — 앱을 껐다 켜면 항상 정지 상태에서 시작.
      반면 **스윙 속도는 저장한다**(2026-08-01). 이건 순간적인 조작이 아니라
      "지금 내 훈련 단계가 어디인가"에 대한 선택이라, 켤 때마다 초기화되면
      느린 속도로 시작해 점점 올리는 훈련 진행 자체가 성립하지 않는다.

      ⚠️ version은 1로 둔다 (올리지 않는다). 기존 저장본은 `{source}`뿐이고
      새로 추가된 `swingSpeed`는 없을 뿐인데, zustand persist의 기본 병합이
      "저장값을 초기 상태 위에 얕게 덮어쓰기"라서 없는 키는 초기값('normal')이
      그대로 살아남는다. 즉 마이그레이션이 필요 없다. 오히려 version만 올리고
      migrate를 주지 않으면 zustand가 복원을 통째로 포기해 기존 사용자의
      "마지막 연습" 기록이 날아간다.
    */
    { partialize: (s) => ({ source: s.source, swingSpeed: s.swingSpeed }) }
  )
);
