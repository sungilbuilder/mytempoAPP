/**
 * 아주 짧은 방 임펄스 응답 — `audio_tools._ir()` 대응.
 * 목표는 실제 홀 흉내가 아니라 "디지털 진공 없애기"(§3 파이썬 주석 참고).
 */
import { SR } from './constants';
import { rngFromSeed } from './rng';

function movingAverageSame(x: Float32Array, k: number): Float32Array {
  const n = x.length;
  const out = new Float32Array(n);
  const half = Math.floor(k / 2);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let cnt = 0;
    for (let j = -half; j < k - half; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < n) {
        sum += x[idx];
        cnt++;
      }
    }
    out[i] = sum / cnt;
  }
  return out;
}

export function buildReverbIR(rt60: number, seed: number, damp = 0.55, sr = SR): Float32Array {
  const rng = rngFromSeed(seed);
  const n = Math.floor(sr * rt60 * 1.4);
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    raw[i] = rng.standardNormal() * Math.exp((-t * 6.908) / Math.max(rt60, 1e-3));
  }
  const k = Math.max(2, Math.floor((sr * damp) / 10000));
  const dark = movingAverageSame(raw, k);

  const tLast = (n - 1) / sr || 1e-9;
  const shaped = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const frac = t / tLast;
    shaped[i] = raw[i] * (1 - frac) + dark[i] * frac;
  }

  const pre = Math.floor(sr * 0.006);
  const ir = new Float32Array(pre + n);
  ir.set(shaped, pre);

  let energy = 0;
  for (let i = 0; i < ir.length; i++) energy += ir[i] * ir[i];
  const norm = 1 / (Math.sqrt(energy) + 1e-12);
  for (let i = 0; i < ir.length; i++) ir[i] *= norm;
  return ir;
}
