import {
  DEFAULT_SWING_SPEED,
  SWING_SPEEDS,
  getSwingSpeed,
  recommendSwingSpeed,
  swingBreakdown,
  swingSecLabel,
  type SwingSpeedId,
} from '../swingSpeeds';

describe('SWING_SPEEDS 목록', () => {
  it('느린 것 → 빠른 것 순으로 정렬돼 있다', () => {
    const secs = SWING_SPEEDS.map((s) => s.swingSec);
    expect([...secs].sort((a, b) => b - a)).toEqual(secs);
  });

  it('id 는 스윙 길이(센티초)와 일치한다 — s120 = 1.20초', () => {
    for (const s of SWING_SPEEDS) {
      const fromId = Number(s.id.slice(1)) / 100;
      expect(s.swingSec).toBeCloseTo(fromId, 2);
    }
  });

  it('swingSecLabel 은 소수 둘째자리로 표기한다', () => {
    expect(swingSecLabel(getSwingSpeed('s120').swingSec)).toBe('1.20');
    expect(swingSecLabel(getSwingSpeed('s093').swingSec)).toBe('0.93');
  });

  it('기본값은 목록 안에 있다', () => {
    expect(SWING_SPEEDS.map((s) => s.id)).toContain(DEFAULT_SWING_SPEED);
  });
});

describe('getSwingSpeed', () => {
  it('알 수 없는 id 는 조용히 기본값으로 떨어진다 (구버전 저장값 대비)', () => {
    expect(getSwingSpeed('s999' as SwingSpeedId)).toBe(SWING_SPEEDS[1]);
    expect(getSwingSpeed(undefined as unknown as SwingSpeedId)).toBe(SWING_SPEEDS[1]);
  });
});

describe('swingBreakdown — 속도·비율에서 구간 시간 계산', () => {
  it('두 구간의 합은 항상 전체 스윙 길이다', () => {
    for (const s of SWING_SPEEDS) {
      for (const ratio of [2.5, 3, 3.5]) {
        const { backswingSec, downswingSec } = swingBreakdown(s, ratio);
        expect(backswingSec + downswingSec).toBeCloseTo(s.swingSec, 10);
      }
    }
  });

  it('두 구간의 비가 곧 입력 비율이다', () => {
    for (const s of SWING_SPEEDS) {
      for (const ratio of [2.5, 3, 3.5]) {
        const { backswingSec, downswingSec } = swingBreakdown(s, ratio);
        expect(backswingSec / downswingSec).toBeCloseTo(ratio, 10);
      }
    }
  });

  /** 창업자가 공유한 훈련 트랙 실측값 — 파일 상단 주석의 근거 데이터 */
  it('3:1 에서 원본 트랙 수치를 재현한다', () => {
    const cases: [SwingSpeedId, number, number][] = [
      ['s093', 0.7, 0.233],
      ['s107', 0.8, 0.267],
      ['s120', 0.9, 0.3],
      ['s133', 1.0, 0.333],
    ];
    for (const [id, back, down] of cases) {
      const r = swingBreakdown(getSwingSpeed(id), 3);
      expect(r.backswingSec).toBeCloseTo(back, 2);
      expect(r.downswingSec).toBeCloseTo(down, 2);
    }
  });
});

describe('recommendSwingSpeed — 목표가 아니라 출발점을 고른다', () => {
  const sw = (total: number) => ({ backswingSec: total * 0.75, downswingSec: total * 0.25 });

  it('데이터가 없으면 null', () => {
    expect(recommendSwingSpeed([])).toBeNull();
  });

  it('전부 비현실적인 값이면 null (0.4초 미만 / 3초 초과는 마킹 실수)', () => {
    expect(recommendSwingSpeed([sw(0.2), sw(5)])).toBeNull();
  });

  it('가장 가까운 단계를 고른다', () => {
    expect(recommendSwingSpeed([sw(1.2)])?.speed.id).toBe('s120');
    expect(recommendSwingSpeed([sw(0.95)])?.speed.id).toBe('s093');
  });

  it('여러 개면 평균이 아니라 중앙값을 쓴다 (마킹 실수 1건에 끌려가지 않도록)', () => {
    // 1.2 가 셋, 2.9 하나. 평균은 1.625 로 튀지만 중앙값은 1.2 근처다.
    const rec = recommendSwingSpeed([sw(1.2), sw(1.2), sw(1.2), sw(2.9)]);
    expect(rec?.speed.id).toBe('s120');
    expect(rec?.measuredSec).toBeCloseTo(1.2, 5);
  });

  it('짝수 개면 가운데 두 값의 평균', () => {
    const rec = recommendSwingSpeed([sw(1.0), sw(1.2)]);
    expect(rec?.measuredSec).toBeCloseTo(1.1, 5);
  });

  it('범위 밖 값은 유효한 표본만 세고 outOfRange 로 표시한다', () => {
    const rec = recommendSwingSpeed([sw(0.1), sw(2.5), sw(2.6)]);
    expect(rec?.sampleCount).toBe(2); // 0.1 은 걸러진다
    expect(rec?.outOfRange).toBe(true);
    expect(rec?.speed.id).toBe('s133'); // 가장 느린 단계
  });

  it('4단계 범위 안이면 outOfRange 는 false', () => {
    expect(recommendSwingSpeed([sw(1.1)])?.outOfRange).toBe(false);
  });
});
