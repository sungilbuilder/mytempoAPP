import { SR } from './constants';
import type { Rng } from './rng';

/** 어택-감쇠 포락선. `audio_tools`의 `env()`와 동일한 형태. */
export function envelope(n: number, sr: number, atk: number, dec: number): Float32Array {
  const out = new Float32Array(n);
  const atkN = Math.max(atk, 1e-5);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const a = Math.min(1, Math.max(0, t / atkN));
    out[i] = a * Math.exp(-t / dec);
  }
  return out;
}

/** RBJ cookbook 대역통과 바이쿼드 계수. */
function bandpassCoeffs(f0: number, q: number, sr: number) {
  const w0 = (2 * Math.PI * f0) / sr;
  const alpha = Math.sin(w0) / (2 * q);
  const cw = Math.cos(w0);
  const a0 = 1 + alpha;
  return {
    b0: alpha / a0,
    b1: 0,
    b2: -alpha / a0,
    a1: (-2 * cw) / a0,
    a2: (1 - alpha) / a0,
  };
}

/** 직접형 II 전치 바이쿼드 — in place. */
function applyBiquad(x: Float32Array, c: ReturnType<typeof bandpassCoeffs>): void {
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xn = x[i];
    const yn = c.b0 * xn + z1;
    z1 = c.b1 * xn - c.a1 * yn + z2;
    z2 = c.b2 * xn - c.a2 * yn;
    x[i] = yn;
  }
}

/**
 * 대역 제한 잡음 — 타격 트랜지언트의 재료 (`audio_tools.band_noise()` 대응).
 *
 * ⚠️ 파이썬 원본은 FFT로 스펙트럼을 코사인 경사로 깎는다. 여기서는 같은 결과를
 * 시간영역 바이쿼드 대역통과 2단 캐스케이드로 근사한다 — 트랜지언트 버퍼가
 * 짧아(최대 55ms ≈ 2400샘플) FFT 없이도 충분히 빠르고, 청감상 차이는
 * "정확히 같은 대역"이 아니라 "그 근처 대역"이면 충분한 용도다(재질감 신호).
 */
export function bandpassNoise(n: number, lo: number, hi: number, rng: Rng, sr = SR): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rng.uniform(-1, 1);

  const f0 = Math.sqrt(Math.max(lo, 20) * hi);
  const q = f0 / Math.max(hi - lo, 1);
  const c = bandpassCoeffs(f0, q, sr);
  applyBiquad(out, c);
  applyBiquad(out, c); // 2단 캐스케이드로 롤오프를 가파르게

  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 1e-9) {
    const g = 1 / peak;
    for (let i = 0; i < n; i++) out[i] *= g;
  }
  return out;
}

/**
 * 짧은 모달 공진 몇 개를 겹친다 — 트랜지언트에 재질을 입힌다 (`audio_tools.modes()` 대응).
 * 감쇠는 20ms 안쪽으로 둬야 귀가 '음정'이 아니라 '타격'으로 듣는다.
 */
export function modes(
  n: number,
  freqs: number[],
  decays: number[],
  gains: number[],
  rng: Rng,
  sr = SR,
): Float32Array {
  const out = new Float32Array(n);
  for (let k = 0; k < freqs.length; k++) {
    const f = freqs[k] * (1.0 + rng.uniform(-0.015, 0.015));
    const d = Math.max(decays[k] * (1.0 + rng.uniform(-0.12, 0.12)), 1e-5);
    const g = gains[k];
    const phase = rng.uniform(0, 2 * Math.PI);
    for (let i = 0; i < n; i++) {
      const t = i / sr;
      out[i] += g * Math.sin(2 * Math.PI * f * t + phase) * Math.exp(-t / d);
    }
  }
  return out;
}

/** 루프 버퍼에 얹는다. 끝을 넘으면 앞으로 감아 붙여 루프가 끊기지 않게 한다(`place()` 대응). */
export function addInPlace(
  dst: Float32Array,
  src: Float32Array,
  offsetSamples: number,
  gain = 1,
): void {
  const len = dst.length;
  for (let i = 0; i < src.length; i++) {
    const idx = (offsetSamples + i) % len;
    dst[idx] += src[i] * gain;
  }
}
