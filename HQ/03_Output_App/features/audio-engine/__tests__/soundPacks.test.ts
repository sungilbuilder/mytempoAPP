import { BASE_SWING_SEC, type SwingSpeedId } from '../../tempo/swingSpeeds';
import { BASE_CYCLE_SEC, cycleMs, cycleSec, impactAtMs, swingSec } from '../soundPacks';

const SPEEDS: SwingSpeedId[] = ['s093', 's107', 's120', 's133'];

describe('cycleSec — generate-sound-packs.py 의 cycle_for() 와 반드시 같은 공식', () => {
  it('공식: BASE_CYCLE_SEC * swingSec(speed) / BASE_SWING_SEC', () => {
    for (const id of SPEEDS) {
      const expected = (BASE_CYCLE_SEC * swingSec(id)) / BASE_SWING_SEC;
      expect(cycleSec(id)).toBeCloseTo(expected, 10);
    }
  });

  it('스윙이 빠를수록(swingSec 이 작을수록) 사이클도 짧다', () => {
    const secs = SPEEDS.map((id) => cycleSec(id));
    const swings = SPEEDS.map((id) => swingSec(id));
    // 둘 다 swingSec 순서를 그대로 따라야 한다 (같은 선형식이므로)
    const bySwing = swings.map((_, i) => i).sort((a, b) => swings[a] - swings[b]);
    const byCycle = secs.map((_, i) => i).sort((a, b) => secs[a] - secs[b]);
    expect(byCycle).toEqual(bySwing);
  });
});

describe('cycleMs / impactAtMs — ms 변환과 임팩트 타이밍', () => {
  it('cycleMs 는 cycleSec 의 1000배', () => {
    for (const id of SPEEDS) {
      expect(cycleMs(id)).toBeCloseTo(cycleSec(id) * 1000, 6);
    }
  });

  it('impactAtMs 는 swingSec 의 1000배 (백스윙 시작~임팩트)', () => {
    for (const id of SPEEDS) {
      expect(impactAtMs(id)).toBeCloseTo(swingSec(id) * 1000, 6);
    }
  });

  it('임팩트는 항상 사이클 경계보다 먼저 온다 (다음 루프가 시작되기 전에 임팩트가 나야 한다)', () => {
    for (const id of SPEEDS) {
      expect(impactAtMs(id)).toBeLessThan(cycleMs(id));
    }
  });
});
