/**
 * 시드 난수원 — `scripts/generate-sound-packs.py`의 `rng_for()`를 JS로 옮긴 것.
 *
 * ⚠️ Python 쪽은 `zlib.crc32(key) → np.random.default_rng(seed)`를 쓴다. 여기서는
 * 같은 난수 "값"을 재현할 필요는 없다 — 목적은 (pack, ratio, duration, tag) 조합마다
 * **빌드마다 같고 타격마다 다른** 시드를 결정론적으로 만드는 것뿐이다(라운드로빈).
 * 그래서 CRC32 대신 FNV-1a(더 짧고 의존성 없음)로 문자열을 해시하고, mulberry32로
 * [0,1) 균일분포를 뽑는다. 두 언어의 숫자가 다르게 나오는 건 문제가 아니다 —
 * 문제였던 건 "모든 타격이 완전히 같은 파형"이었지, 특정 난수값이 아니었다.
 */

export type Rng = {
  /** [lo, hi) 균일분포 */
  uniform(lo: number, hi: number): number;
  /** 표준정규분포(Box-Muller) */
  standardNormal(): number;
};

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — 빠르고 시드 가능한 32비트 PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFromSeed(seed: number): Rng {
  const next = mulberry32(seed);
  return {
    uniform(lo, hi) {
      return lo + (hi - lo) * next();
    },
    standardNormal() {
      // Box-Muller — 표준정규분포 샘플 하나를 아끼지 않고 매번 새로 뽑는다
      // (여기서 쓰는 만큼은 캐싱 이득보다 코드 단순함이 낫다).
      let u = 0;
      let v = 0;
      while (u === 0) u = next();
      while (v === 0) v = next();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    },
  };
}

/**
 * `rng_for(*parts)` — (팩, 비율/스윙키, 태그) 등을 이어붙여 시드를 만든다.
 * Python 쪽과 인자 순서·개수를 맞출 필요는 없다. 이 프로젝트 내부에서만
 * 일관되면 된다.
 */
export function rngFor(...parts: (string | number)[]): Rng {
  const key = parts.join('|');
  return rngFromSeed(fnv1a(key));
}

/** 잔향 시드 등 rng 객체가 아니라 정수 시드 자체가 필요한 곳에서 쓴다. */
export function hashString(s: string): number {
  return fnv1a(s);
}
