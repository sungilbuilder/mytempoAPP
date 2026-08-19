/**
 * 실측 스윙 하나(팩 하나)의 연습 루프 한 바퀴를 합성한다.
 * `scripts/generate-sound-packs.py`의 `build()` + `space()`를 옮긴 것 —
 * 다른 점은 `ratio`로 되짚는 대신 **실측 backswingSec/downswingSec을 그대로** 쓴다는 것뿐이다.
 *
 * ⚠️ `cycleSec` 공식은 `soundPacks.ts`의 `cycleSec()` / `generate-sound-packs.py`의
 * `cycle_for()`와 반드시 같아야 한다(AOS 리뷰 V-4 사고 재발 방지) — 그래서 상수를
 * 새로 정의하지 않고 두 파일에서 그대로 가져온다.
 */
import { BASE_SWING_SEC } from '../../tempo/swingSpeeds';
import {
  BASE_CYCLE_SEC,
  DRUM_E1,
  MARKER_FREQS,
  PACK_HAS_PULSE,
  PICKUP_BEATS,
  REVERB_RT60,
  REVERB_WET,
  ROOM_TONE_DB,
  LOOP_LUFS_TARGET,
  SR,
  type SoundPackId,
} from './constants';
import { hashString, rngFor, rngFromSeed } from './rng';
import { addInPlace } from './signal';
import { VOICES, drum } from './voices';
import { buildReverbIR } from './reverbIR';
import { foldCircular, renderLinearConvolution } from './nativeReverb';
import { normalizeLufsLimited, roomTone } from './loudness';

export type SwingLoopParams = {
  pack: SoundPackId;
  backswingSec: number;
  downswingSec: number;
};

export type SwingLoopResult = {
  pcm: Float32Array;
  sampleRate: number;
  cycleSec: number;
  /** 백스윙 시작~임팩트까지(초) — 임팩트 진동 예약 등에 쓴다. */
  swingSec: number;
};

function maxAbs(x: Float32Array): number {
  let m = 0;
  for (let i = 0; i < x.length; i++) m = Math.max(m, Math.abs(x[i]));
  return m;
}

export function cycleSecForSwing(swingSec: number): number {
  return (BASE_CYCLE_SEC * swingSec) / BASE_SWING_SEC;
}

export async function buildSwingLoop({
  pack,
  backswingSec,
  downswingSec,
}: SwingLoopParams): Promise<SwingLoopResult> {
  const swing = backswingSec + downswingSec;
  const cycleSec = cycleSecForSwing(swing);
  const k = swing / BASE_SWING_SEC;
  const totalSamples = Math.floor(cycleSec * SR);

  const buf = new Float32Array(totalSamples);
  const back = backswingSec;
  const [fStart, fTop, fImpact] = MARKER_FREQS[pack];
  const voice = VOICES[pack];

  // 캐시·재현성 키 — 부동소수점 지터가 시드를 흔들지 않도록 소수 4자리로 반올림.
  const keyBase = `${pack}|${backswingSec.toFixed(4)}|${downswingSec.toFixed(4)}`;
  const r = (tag: string) => rngFor(keyBase, tag);

  addInPlace(buf, voice(0.5 * k, fStart, 0.55, r('start')), 0, 0.7);
  addInPlace(buf, voice(0.42 * k, fTop, 0.72, r('top')), Math.round(back * SR), 0.8);
  addInPlace(buf, voice(0.72 * k, fImpact, 1.0, r('impact')), Math.round(swing * SR), 1.0);

  if (PACK_HAS_PULSE[pack]) {
    const p = back / 3.0;
    for (let j = 0; j < 3; j++) {
      addInPlace(buf, drum(0.18, DRUM_E1, 0.5, r(`pulse${j}`)), Math.round(j * p * SR), 0.48);
    }
    for (let j = PICKUP_BEATS; j >= 1; j--) {
      const at = cycleSec - j * p;
      if (at > swing + 0.05) {
        addInPlace(buf, drum(0.18, DRUM_E1, 0.4, r(`pickup${j}`)), Math.round(at * SR), 0.38);
      }
    }
  }

  // ── 공간(잔향+룸톤) — 루프 전용 원형 처리 ─────────────────────────────
  const reverbSeed = hashString(keyBase) % 9973;
  const ir = buildReverbIR(REVERB_RT60, reverbSeed);
  const wetLinear = await renderLinearConvolution(buf, ir, SR);
  const wetCircular = foldCircular(wetLinear, buf.length);

  const dryPeak = maxAbs(buf);
  const wetPeak = maxAbs(wetCircular);
  const wetScale = REVERB_WET * (dryPeak / (wetPeak + 1e-12));

  const withSpace = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    withSpace[i] = buf[i] + wetCircular[i] * wetScale;
  }
  const tone = roomTone(totalSamples, ROOM_TONE_DB, rngFromSeed(reverbSeed + 1), SR);
  for (let i = 0; i < totalSamples; i++) withSpace[i] += tone[i];

  const pcm = normalizeLufsLimited(withSpace, LOOP_LUFS_TARGET, -1.0, SR);

  return { pcm, sampleRate: SR, cycleSec, swingSec: swing };
}
