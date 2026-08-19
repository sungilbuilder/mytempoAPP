/**
 * 악기 음색 — `scripts/generate-sound-packs.py`의 `wood()`/`piano()`/`mallet()`/`drum()`/
 * `_transient()`를 거의 그대로 TS로 옮긴 것.
 *
 * ⚠️ 이 파일은 "새로 설계"가 아니라 "이식"이다. 원본은 8일 넘는 실기기 청취
 * 튜닝을 거친 결과물이라(2026-08-01~08-19), 상수를 임의로 조정하지 말 것 —
 * 조정이 필요하면 파이썬 쪽과 함께 바꾸고 왜 바꿨는지 남길 것.
 */
import { SR, type SoundPackId } from './constants';
import type { Rng } from './rng';
import { bandpassNoise, envelope, modes } from './signal';

function addScaled(dst: Float32Array, src: Float32Array, scale = 1): void {
  const n = Math.min(dst.length, src.length);
  for (let i = 0; i < n; i++) dst[i] += src[i] * scale;
}

/** 타격 트랜지언트 — 재질을 말하는 부분. 길이는 dur에 비례하지 않는다(물리가 dur와 무관). */
export function transient(
  n: number,
  rng: Rng,
  lo: number,
  hi: number,
  gain: number,
  decay: number,
  modeFreqs: number[],
  modeDecays: number[],
  modeGains: number[],
  vel: number,
  sr = SR,
): Float32Array {
  const tn = Math.min(n, Math.floor(sr * 0.055));
  const g = gain * (0.62 + 0.38 * vel) * (1.0 + rng.uniform(-0.12, 0.12));
  const loJ = lo * (1.0 + rng.uniform(-0.08, 0.08));
  const hiJ = hi * (1.0 + rng.uniform(-0.08, 0.08));
  const decayJ = decay * (1.0 + rng.uniform(-0.15, 0.15));

  const burst = bandpassNoise(tn, loJ, hiJ, rng, sr);
  const ring = modes(
    tn,
    modeFreqs,
    modeDecays,
    modeGains.map((m) => m * (0.55 + 0.45 * vel)),
    rng,
    sr,
  );

  const out = new Float32Array(n);
  // burst엔 exp(-t*decay) 포락선을 아직 안 씌웠다 — 여기서 곱한다.
  for (let i = 0; i < tn; i++) {
    const t = i / sr;
    out[i] = burst[i] * Math.exp(-t * decayJ) * g + ring[i];
  }
  return out;
}

export function wood(dur: number, f: number, vel: number, rng: Rng, sr = SR): Float32Array {
  const n = Math.floor(sr * dur);
  const d = () => 1.0 + rng.uniform(-0.004, 0.004);
  const g = () => 1.0 + rng.uniform(-0.18, 0.18);
  const ak = 1.0 + rng.uniform(-0.15, 0.15);
  const dk = 1.0 + rng.uniform(-0.08, 0.08);

  const sig = new Float32Array(n);
  const e1 = envelope(n, sr, 0.002 * ak, dur * 0.3 * dk);
  const f1 = f * d();
  const g2 = (0.3 + 0.16 * vel) * g();
  const e2 = envelope(n, sr, 0.0012 * ak, dur * 0.22 * dk);
  const f2 = f * 3.9 * d();
  const g3 = (0.09 + 0.13 * vel) * g();
  const e3 = envelope(n, sr, 0.0008 * ak, dur * 0.11 * dk);
  const f3 = f * 9.2 * d();

  for (let i = 0; i < n; i++) {
    const t = i / sr;
    sig[i] =
      Math.sin(2 * Math.PI * f1 * t) * e1[i] +
      g2 * Math.sin(2 * Math.PI * f2 * t) * e2[i] +
      g3 * Math.sin(2 * Math.PI * f3 * t) * e3[i];
  }

  addScaled(
    sig,
    transient(
      n,
      rng,
      1500,
      7500,
      1.05,
      34,
      [2380, 4120, 6300],
      [0.02, 0.013, 0.008],
      [0.34, 0.22, 0.13],
      vel,
      sr,
    ),
  );
  return sig;
}

export function piano(dur: number, f: number, vel: number, rng: Rng, sr = SR): Float32Array {
  const n = Math.floor(sr * dur);
  const B = 0.0004;
  const ak = 1.0 + rng.uniform(-0.12, 0.12);
  const dk = 1.0 + rng.uniform(-0.1, 0.1);
  const d = () => 1.0 + rng.uniform(-0.0025, 0.0025);
  const g = () => 1.0 + rng.uniform(-0.12, 0.12);

  const partials: [number, number, number, number, number][] = [
    [1, 1.0, 0.42, 0.55, 0.45],
    [2, 0.58, 0.33, 0.35, 0.55],
    [3, 0.36, 0.26, 0.28, 0.62],
    [4, 0.22, 0.2, 0.2, 0.68],
    [5, 0.13, 0.15, 0.15, 0.72],
    [6, 0.08, 0.1, 0.1, 0.78],
  ];

  const sig = new Float32Array(n);
  for (const [k, amp, decFrac, base, boost] of partials) {
    const fk = f * k * Math.sqrt(1 + B * k * k) * d();
    const atk = (k === 1 ? 0.0022 : 0.001) * ak;
    const envK = envelope(n, sr, atk, dur * decFrac * dk);
    const gain = amp * (base + boost * vel) * g();

    for (let i = 0; i < n; i++) {
      const t = i / sr;
      sig[i] += gain * Math.sin(2 * Math.PI * fk * t) * envK[i];
    }

    if (k <= 2) {
      const sign = rng.uniform(-1, 1) > 0 ? 1 : -1;
      const detune = 1.0 + sign * rng.uniform(0.0006, 0.0014);
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        sig[i] += gain * 0.5 * Math.sin(2 * Math.PI * fk * detune * t) * envK[i];
      }
    }
  }

  addScaled(
    sig,
    transient(
      n,
      rng,
      1200,
      8000,
      1.55,
      40,
      [1900, 3600, 5600],
      [0.018, 0.012, 0.008],
      [0.36, 0.24, 0.14],
      vel,
      sr,
    ),
  );
  return sig;
}

export function mallet(dur: number, f: number, vel: number, rng: Rng, sr = SR): Float32Array {
  const n = Math.floor(sr * dur);
  const d = () => 1.0 + rng.uniform(-0.004, 0.004);
  const g = () => 1.0 + rng.uniform(-0.15, 0.15);
  const ak = 1.0 + rng.uniform(-0.15, 0.15);
  const dk = 1.0 + rng.uniform(-0.08, 0.08);

  const sig = new Float32Array(n);
  const e1 = envelope(n, sr, 0.006 * ak, dur * 0.46 * dk);
  const f1 = f * d();
  const g2 = (0.22 + 0.1 * vel) * g();
  const e2 = envelope(n, sr, 0.004 * ak, dur * 0.3 * dk);
  const f2 = f * 2.0 * d();
  const g3 = (0.08 + 0.08 * vel) * g();
  const e3 = envelope(n, sr, 0.003 * ak, dur * 0.18 * dk);
  const f3 = f * 3.9 * d();

  for (let i = 0; i < n; i++) {
    const t = i / sr;
    sig[i] =
      Math.sin(2 * Math.PI * f1 * t) * e1[i] +
      g2 * Math.sin(2 * Math.PI * f2 * t) * e2[i] +
      g3 * Math.sin(2 * Math.PI * f3 * t) * e3[i];
  }

  addScaled(
    sig,
    transient(
      n,
      rng,
      1400,
      6500,
      1.3,
      44,
      [1900, 3300, 5000],
      [0.022, 0.014, 0.009],
      [0.26, 0.17, 0.1],
      vel,
      sr,
    ),
  );
  return sig;
}

export function drum(dur: number, f: number, vel: number, rng: Rng, sr = SR): Float32Array {
  const n = Math.floor(sr * dur);
  const pk = 1.0 + rng.uniform(-0.03, 0.03);
  const decJ = 1.0 + rng.uniform(-0.07, 0.07);

  const sig = new Float32Array(n);
  let phaseAccum = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const instFreq = f * (2.6 * pk) * Math.exp(-t * 20) + f;
    phaseAccum += instFreq; // cumsum(freq)
    sig[i] = Math.sin((2 * Math.PI * phaseAccum) / sr) * Math.exp(-t * 24 * decJ);
  }

  addScaled(
    sig,
    transient(
      n,
      rng,
      1300,
      6000,
      0.85,
      85,
      [1750, 3050, 4600],
      [0.009, 0.005, 0.003],
      [0.13, 0.08, 0.05],
      vel,
      sr,
    ),
  );

  const atk = Math.min(n, Math.floor(sr * 0.0015));
  for (let i = 0; i < atk; i++) sig[i] *= i / atk;
  const fade = Math.min(n, Math.floor(sr * 0.01));
  for (let i = 0; i < fade; i++) sig[n - fade + i] *= 1 - i / fade;

  return sig;
}

export type VoiceFn = (dur: number, f: number, vel: number, rng: Rng) => Float32Array;

/**
 * 팩 id → 마커 소리 함수. Python `VOICES` 딕셔너리와 대응.
 * ⚠️ 'string' 키는 2026-08-08 이후 실제로는 piano() 음색을 쓴다(§4, 현 폐기).
 */
export const VOICES: Record<SoundPackId, VoiceFn> = {
  wood: (dur, f, vel, rng) => wood(dur, f, vel, rng),
  string: (dur, f, vel, rng) => piano(dur, f, vel, rng),
  mallet: (dur, f, vel, rng) => mallet(dur, f, vel, rng),
  rhythm: (dur, f, vel, rng) => piano(dur, f, vel, rng),
};
