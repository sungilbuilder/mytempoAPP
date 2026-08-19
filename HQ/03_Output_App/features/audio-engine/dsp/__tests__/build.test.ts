import { SWING_SPEEDS } from '../../../tempo/swingSpeeds';
import { cycleSec as presetCycleSec, swingSec as presetSwingSec } from '../../soundPacks';
import { buildSwingLoop, cycleSecForSwing } from '../build';
import { SR } from '../constants';

describe('cycleSecForSwing — soundPacks.cycleSec() 와 같은 공식이어야 한다', () => {
  it.each(SWING_SPEEDS.map((s) => s.id))('%s 속도에서 두 공식이 일치한다', (id) => {
    const swing = presetSwingSec(id);
    expect(cycleSecForSwing(swing)).toBeCloseTo(presetCycleSec(id), 10);
  });
});

describe('buildSwingLoop — 실측 스윙 하나의 루프 합성', () => {
  it('길이가 cycleSecForSwing과 정확히 일치하고, 유한한 값만 담는다', async () => {
    const backswingSec = 0.9;
    const downswingSec = 0.3;
    const result = await buildSwingLoop({ pack: 'wood', backswingSec, downswingSec });

    const expectedLen = Math.floor(cycleSecForSwing(backswingSec + downswingSec) * SR);
    expect(result.pcm.length).toBe(expectedLen);
    expect(result.sampleRate).toBe(SR);
    expect(result.swingSec).toBeCloseTo(1.2, 10);

    let hasEnergy = false;
    for (let i = 0; i < result.pcm.length; i++) {
      const v = result.pcm[i];
      expect(Number.isFinite(v)).toBe(true);
      expect(Math.abs(v)).toBeLessThanOrEqual(1.0001); // 정규화·리미터 이후엔 ±1을 넘지 않아야 함
      if (Math.abs(v) > 1e-4) hasEnergy = true;
    }
    expect(hasEnergy).toBe(true); // 완전 무음 버퍼가 나오면 합성이 뭔가 빠진 것
  });

  it('4팩 전부(펄스 레이어 포함) 예외 없이 합성된다', async () => {
    const packs = ['wood', 'string', 'mallet', 'rhythm'] as const;
    for (const pack of packs) {
      const result = await buildSwingLoop({ pack, backswingSec: 0.8, downswingSec: 0.27 });
      expect(result.pcm.length).toBeGreaterThan(0);
      expect(result.pcm.every((v) => Number.isFinite(v))).toBe(true);
    }
  });

  it('극단적으로 짧은 스윙(빠른 실측)에서도 인덱스 오류 없이 합성된다', async () => {
    const result = await buildSwingLoop({ pack: 'rhythm', backswingSec: 0.3, downswingSec: 0.1 });
    expect(result.pcm.every((v) => Number.isFinite(v))).toBe(true);
  });

  it('같은 입력이면 항상 같은 결과 — 재생성해도 사용자가 못 느껴야 한다(캐시 무효화 불필요 근거)', async () => {
    const a = await buildSwingLoop({ pack: 'wood', backswingSec: 1.0, downswingSec: 0.33 });
    const b = await buildSwingLoop({ pack: 'wood', backswingSec: 1.0, downswingSec: 0.33 });
    expect(Array.from(a.pcm)).toEqual(Array.from(b.pcm));
  });
});
