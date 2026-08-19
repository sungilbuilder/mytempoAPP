/**
 * 사운드 아이덴티티 재생 — 시그니처 + UI 피드백 (2026-08-06 신설, T-24)
 *
 * ## 왜 소리로도 피드백을 주나
 *
 * 이 제품은 **소리가 본체**다. 화면을 안 보고 쓰는 시간이 길고(연습 중에는 공을
 * 보지 폰을 보지 않는다), 야외·실내 연습장은 시야 조건이 나쁘다. 그런데 지금까지
 * 앱이 내는 소리는 메트로놈뿐이었고, "됐다"는 확인은 전부 화면과 진동으로만 갔다.
 *
 * 소리로 확인을 주면 두 가지가 생긴다.
 *   ① 화면을 안 봐도 등록이 끝난 걸 안다
 *   ② 같은 음(E3) 위에서 나기 때문에 **들을 때마다 브랜드가 강화된다**
 *
 * ## 무엇을 쓰지 않았나 — 축하하지 않는다
 *
 * [[브랜드-가이드]] Tone&Manner가 "짧고 단정하게 / 과장 금지"다. 그래서 팡파르,
 * 상승 아르페지오, 반짝이는 벨 소리를 전부 배제했다. 확인음은 **사실을 알릴 뿐**이다.
 * 특히 `complete`는 연습 도중에 울리므로 가장 조용하고, 리듬을 만들지 않는다
 * (박자처럼 들리면 사용자가 그 소리에 스윙을 맞추려 든다).
 *
 * 음 설계와 생성 근거는 `scripts/generate-sound-packs.py` §2-③④ 참고.
 *
 * ## 구현 메모
 *
 * - ⚠️ 2026-08-07 실기기 검증(T-06): 예전엔 재생할 때마다 플레이어를 새로 만들고
 *   끝나면 해제했다. "확인음 켜고 끌 때 소리가 바로 안 들린다"는 제보의 원인이
 *   이거였다 — `createAudioPlayer()`로 만든 플레이어는 로드가 끝나야 들리는데,
 *   그 로드 자체를 재생을 요청한 시점에야 시작했다. 이제 앱에서 이 모듈을 처음
 *   불러올 때(모듈 로드 시점) 4개를 한 번에 만들어 두고 계속 재사용한다 —
 *   실제 탭 시점에는 `seekTo(0)+play()`만 남는다.
 * - **실패해도 조용히 넘어간다.** 확인음이 안 나는 것보다 확인음 때문에 저장이
 *   막히는 게 훨씬 나쁘다. 여기서 예외를 던지지 않는다.
 * - 메트로놈과 별개의 플레이어라 연습 중에 겹쳐 울려도 서로를 끊지 않는다.
 */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

export type CueId = 'mark' | 'saved' | 'complete' | 'signature';

const FILES: Record<CueId, unknown> = {
  mark: require('../../assets/audio/cue_mark.wav'),
  saved: require('../../assets/audio/cue_saved.wav'),
  complete: require('../../assets/audio/cue_complete.wav'),
  signature: require('../../assets/audio/signature.wav'),
};

/**
 * 확인음은 **메트로놈보다 조용해야 한다.**
 *
 * 파일 자체를 -30 LUFS로 만들었지만(루프는 -25), 사용자가 설정한 소리 크기까지
 * 그대로 곱하면 볼륨 100%에서는 여전히 존재감이 커진다. 여기서 한 번 더 낮춘다.
 * 확인음이 메트로놈보다 크면 "무슨 일이 났나" 싶어져 연습이 끊긴다.
 */
const CUE_GAIN = 0.7;

/**
 * `complete`(20스윙 NSM 완료) 추가 감쇠 (2026-08-09).
 *
 * 연습 도중 루프 소리 위에 겹쳐 울리는 유일한 큐라 나머지 셋보다 훨씬 더
 * 조용해야 한다 — 사용자가 또렷이 듣고 스윙을 거기 맞추게 만들 필요가 없다.
 * "완료됐다"는 표식만 은은하게 남기면 된다.
 */
const CUE_EXTRA_GAIN: Partial<Record<CueId, number>> = {
  complete: 0.25,
};

const players: Partial<Record<CueId, AudioPlayer>> = {};

function getPlayer(id: CueId): AudioPlayer {
  let p = players[id];
  if (!p) {
    p = createAudioPlayer(FILES[id] as never);
    players[id] = p;
  }
  return p;
}

// 모듈이 처음 임포트될 때(앱 시작 시점) 미리 만들어 둔다 — 실패해도 무시.
(Object.keys(FILES) as CueId[]).forEach((id) => {
  try {
    getPlayer(id);
  } catch {
    /* 다음 playCue 호출에서 다시 시도된다 */
  }
});

export function playCue(id: CueId, volume = 1) {
  try {
    const p = getPlayer(id);
    const extraGain = CUE_EXTRA_GAIN[id] ?? 1;
    p.volume = Math.min(1, Math.max(0, volume * CUE_GAIN * extraGain));
    p.seekTo(0);
    p.play();
  } catch {
    // 확인음 재생 실패는 무시한다 — 이 소리 때문에 본 동작이 막히면 안 된다.
  }
}
