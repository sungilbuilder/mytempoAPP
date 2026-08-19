/**
 * 러프니스 계측·정규화 — `scripts/audit_tools.py`(K-weighting LUFS, 소프트 리미터)를
 * TS로 옮긴 것. 목적은 두 가지:
 *   1) 런타임 합성 결과를 목표 라우드니스(`LOOP_LUFS_TARGET`)로 맞춘다.
 *   2) 파이썬으로 만든 기존 wav와 회귀 비교할 때 같은 지표로 잴 수 있게 한다.
 *
 * ⚠️ `truePeakApprox`는 파이썬의 4배 오버샘플 FFT 트루피크와 다르다 — 여기서는
 * 간단한 안전 마진(+0.3dB)으로 근사한다. "정확한 dBTP 스펙 값"이 목적이 아니라
 * "클리핑 방지"가 목적이라 이 근사로 충분하다. 방송 스펙 검증이 필요해지면
 * (예: 스토어 심사 등) 그때 정확한 구현으로 교체할 것.
 */
import type { Rng } from './rng';
import { SR } from './constants';

function biquad(
  x: Float32Array,
  b0: number,
  b1: number,
  b2: number,
  a1: number,
  a2: number,
): Float32Array {
  const y = new Float32Array(x.length);
  let z1 = 0;
  let z2 = 0;
  for (let i = 0; i < x.length; i++) {
    const xn = x[i];
    const yn = b0 * xn + z1;
    z1 = b1 * xn - a1 * yn + z2;
    z2 = b2 * xn - a2 * yn;
    y[i] = yn;
  }
  return y;
}

/** ITU-R BS.1770 K-weighting = 고역 쉘프 + 고역통과. */
export function kWeight(x: Float32Array, sr = SR): Float32Array {
  // 1단: 고역 쉘프 (+4dB @ ~1682Hz, Q=0.7071752369554196)
  {
    const f0 = 1681.974450955533;
    const gDb = 3.999843853973347;
    const q = 0.7071752369554196;
    const a = 10 ** (gDb / 40);
    const w0 = (2 * Math.PI * f0) / sr;
    const alpha = Math.sin(w0) / (2 * q);
    const cw = Math.cos(w0);
    const sq = 2 * Math.sqrt(a) * alpha;
    const b0 = a * (a + 1 + (a - 1) * cw + sq);
    const b1 = -2 * a * (a - 1 + (a + 1) * cw);
    const b2 = a * (a + 1 + (a - 1) * cw - sq);
    const a0 = a + 1 - (a - 1) * cw + sq;
    const a1 = 2 * (a - 1 - (a + 1) * cw);
    const a2 = a + 1 - (a - 1) * cw - sq;
    x = biquad(x, b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0);
  }
  // 2단: 고역통과 (~38Hz, Q=0.5)
  {
    const f0 = 38.13547087602444;
    const q = 0.5003270373238773;
    const w0 = (2 * Math.PI * f0) / sr;
    const alpha = Math.sin(w0) / (2 * q);
    const cw = Math.cos(w0);
    const b0 = (1 + cw) / 2;
    const b1 = -(1 + cw);
    const b2 = (1 + cw) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cw;
    const a2 = 1 - alpha;
    x = biquad(x, b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0);
  }
  return x;
}

/** 게이팅 적용 통합 라우드니스 (근사 LUFS). */
export function lufs(x: Float32Array, sr = SR): number {
  const y = kWeight(x, sr);
  const block = Math.floor(0.4 * sr);
  const hop = Math.floor(block / 4);
  const padded = y.length < block ? padTo(y, block) : y;

  const powers: number[] = [];
  for (let s = 0; s + block <= padded.length; s += hop) {
    let sum = 0;
    for (let i = s; i < s + block; i++) sum += padded[i] * padded[i];
    powers.push(Math.max(sum / block, 1e-20));
  }
  if (powers.length === 0) return -70;

  const loud = powers.map((p) => -0.691 + 10 * Math.log10(p));
  const keep = loud.map((l) => l > -70.0);
  if (!keep.some(Boolean)) return -70.0;

  const meanKept = mean(powers.filter((_, i) => keep[i]));
  const rel = -0.691 + 10 * Math.log10(meanKept) - 10.0;
  const keep2 = keep.map((k, i) => k && loud[i] > rel);
  const finalKeep = keep2.some(Boolean) ? keep2 : keep;
  const finalMean = mean(powers.filter((_, i) => finalKeep[i]));
  return -0.691 + 10 * Math.log10(finalMean);
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function padTo(x: Float32Array, len: number): Float32Array {
  const out = new Float32Array(len);
  out.set(x);
  return out;
}

export function dcRemove(x: Float32Array): Float32Array {
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += x[i];
  const m = sum / x.length;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] - m;
  return out;
}

/** 근사 트루피크(dBTP) — 안전 마진 방식, 위 파일 주석 참고. */
export function truePeakApprox(x: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
  const dB = 20 * Math.log10(Math.max(peak, 1e-12));
  return dB + 0.3; // 인터샘플 피크 안전 마진
}

/** tanh 니 리미터 — 하드 클리핑 대신 부드럽게 누른다. */
export function softLimit(x: Float32Array, ceiling = 0.89): Float32Array {
  const knee = ceiling * 0.7;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    const av = Math.abs(v);
    if (av <= knee) {
      out[i] = v;
    } else {
      const sign = Math.sign(v);
      const excess = (av - knee) / Math.max(ceiling - knee, 1e-9);
      out[i] = sign * (knee + (ceiling - knee) * Math.tanh(excess));
    }
  }
  return out;
}

/** 목표 LUFS에 실제로 도달하는 정규화 — `audio_tools.normalize_lufs_limited()` 대응. */
export function normalizeLufsLimited(
  input: Float32Array,
  target: number,
  ceilingDbtp = -1.0,
  sr = SR,
  iters = 6,
): Float32Array {
  const x = dcRemove(input);
  const cur = lufs(x, sr);
  if (cur <= -70.0) return x;

  const ceilingLin = 10 ** (ceilingDbtp / 20);
  let y = scale(x, 10 ** ((target - cur) / 20));

  for (let i = 0; i < iters; i++) {
    const tp = truePeakApprox(y);
    if (tp <= ceilingDbtp + 0.05) break;
    y = softLimit(y, ceilingLin * 0.97);
    const gap = target - lufs(y, sr);
    if (Math.abs(gap) < 0.05) break;
    y = scale(y, 10 ** (gap / 20));
  }

  const tp = truePeakApprox(y);
  if (tp > ceilingDbtp) y = scale(y, 10 ** ((ceilingDbtp - tp) / 20));
  return y;
}

function scale(x: Float32Array, g: number): Float32Array {
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) out[i] = x[i] * g;
  return out;
}

/** 들리지 않을 만큼 낮은 룸톤 — 진폭이 정확히 0인 구간을 없애는 용도. */
export function roomTone(n: number, levelDb: number, rng: Rng, sr = SR): Float32Array {
  const raw = new Float32Array(n);
  for (let i = 0; i < n; i++) raw[i] = rng.standardNormal();
  const k = Math.max(2, Math.floor(sr / 1500));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    let cnt = 0;
    for (let j = -Math.floor(k / 2); j < k - Math.floor(k / 2); j++) {
      const idx = i + j;
      if (idx >= 0 && idx < n) {
        sum += raw[idx];
        cnt++;
      }
    }
    out[i] = sum / cnt;
  }
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(out[i]));
  const gain = (peak > 1e-12 ? 1 / peak : 1) * 10 ** (levelDb / 20);
  for (let i = 0; i < n; i++) out[i] *= gain;
  return out;
}
