import { rngFor } from '../rng';

describe('rngFor — 시드 결정성·라운드로빈', () => {
  it('같은 키는 항상 같은 시퀀스를 낸다 (빌드마다 재현 가능해야 함)', () => {
    const a = rngFor('wood', '0.90', '0.30', 'impact');
    const b = rngFor('wood', '0.90', '0.30', 'impact');
    const seqA = Array.from({ length: 5 }, () => a.uniform(-1, 1));
    const seqB = Array.from({ length: 5 }, () => b.uniform(-1, 1));
    expect(seqA).toEqual(seqB);
  });

  it('태그가 다르면 다른 시퀀스를 낸다 (라운드로빈 — 타격마다 파형이 달라야 함)', () => {
    const start = rngFor('wood', '0.90', '0.30', 'start');
    const top = rngFor('wood', '0.90', '0.30', 'top');
    const impact = rngFor('wood', '0.90', '0.30', 'impact');
    const s = start.uniform(-1, 1);
    const t = top.uniform(-1, 1);
    const i = impact.uniform(-1, 1);
    expect(new Set([s, t, i]).size).toBe(3);
  });

  it('실측값이 다르면(팩·타이밍 조합이 다르면) 다른 시퀀스를 낸다', () => {
    const a = rngFor('wood', '0.90', '0.30', 'impact');
    const b = rngFor('wood', '0.91', '0.30', 'impact');
    expect(a.uniform(-1, 1)).not.toBe(b.uniform(-1, 1));
  });

  it('uniform(lo, hi)의 결과가 항상 범위 안이다', () => {
    const rng = rngFor('test', 'range');
    for (let i = 0; i < 200; i++) {
      const v = rng.uniform(-3, 7);
      expect(v).toBeGreaterThanOrEqual(-3);
      expect(v).toBeLessThan(7);
    }
  });

  it('standardNormal()이 finite한 값을 낸다', () => {
    const rng = rngFor('test', 'normal');
    for (let i = 0; i < 50; i++) {
      expect(Number.isFinite(rng.standardNormal())).toBe(true);
    }
  });
});
