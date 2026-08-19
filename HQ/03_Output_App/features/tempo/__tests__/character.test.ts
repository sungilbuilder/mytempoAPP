import {
  characterForRatio,
  formatRatio,
  formatRatioWithPrecision,
  formatSeconds,
  precisionForFps,
} from '../character';

describe('characterForRatio — 비율 → 성향', () => {
  it('2.75 미만은 "고르게"', () => {
    expect(characterForRatio(2.0)).toBe('balanced');
    expect(characterForRatio(2.5)).toBe('balanced');
    expect(characterForRatio(2.749)).toBe('balanced');
  });

  it('2.75~3.25 는 "여유롭게"', () => {
    expect(characterForRatio(2.75)).toBe('stable');
    expect(characterForRatio(3.0)).toBe('stable');
    expect(characterForRatio(3.25)).toBe('stable');
  });

  it('3.25 초과는 "길게"', () => {
    expect(characterForRatio(3.26)).toBe('power');
    expect(characterForRatio(3.5)).toBe('power');
    expect(characterForRatio(10)).toBe('power');
  });

  /**
   * 경계값을 고정한다. 임계값이 프리셋(2.5/3.0/3.5)의 중간지점이라는 근거로
   * 정해졌으므로, 프리셋이 바뀌지 않는 한 이 경계도 움직이면 안 된다.
   */
  it('경계는 [<2.75) / [2.75, 3.25] / (3.25>] 로 닫힌다', () => {
    expect(characterForRatio(2.75)).not.toBe(characterForRatio(2.749));
    expect(characterForRatio(3.25)).not.toBe(characterForRatio(3.251));
  });
});

describe('formatRatio', () => {
  it('소수 첫째자리로 반올림한다', () => {
    expect(formatRatio(3.15)).toBe('3.2:1');
    expect(formatRatio(3.0)).toBe('3:1');
    expect(formatRatio(2.44)).toBe('2.4:1');
  });
});

describe('precisionForFps — fps 에 따른 표시 정밀도', () => {
  it('fps 를 모르면 가장 보수적으로 coarse', () => {
    expect(precisionForFps(undefined)).toBe('coarse');
  });

  it('120 이상은 exact, 60 이상은 approximate, 그 미만은 coarse', () => {
    expect(precisionForFps(240)).toBe('exact');
    expect(precisionForFps(120)).toBe('exact');
    expect(precisionForFps(119)).toBe('approximate');
    expect(precisionForFps(60)).toBe('approximate');
    expect(precisionForFps(59)).toBe('coarse');
    expect(precisionForFps(30)).toBe('coarse');
  });
});

describe('formatRatioWithPrecision — 근거 없는 정밀도를 보여주지 않는다', () => {
  it('coarse 는 정수로만 말하고 개선 여지를 알린다', () => {
    const r = formatRatioWithPrecision(3.24, 'coarse');
    expect(r.text).toBe('약 3:1');
    expect(r.tolerance).toBeUndefined();
    expect(r.canImprove).toBe(true);
  });

  it('approximate 는 소수 첫째자리 + 오차 표기', () => {
    const r = formatRatioWithPrecision(3.24, 'approximate');
    expect(r.text).toBe('3.2:1');
    expect(r.tolerance).toBe('±0.1');
    expect(r.canImprove).toBe(true);
  });

  it('exact 는 오차 표기가 없고 더 개선할 것이 없다', () => {
    const r = formatRatioWithPrecision(3.24, 'exact');
    expect(r.text).toBe('3.2:1');
    expect(r.tolerance).toBeUndefined();
    expect(r.canImprove).toBe(false);
  });

  /** 30fps 영상에 "3.2:1"이 절대 나오면 안 된다 — 이 앱의 정직성 원칙 */
  it('30fps 영상에는 소수점 비율을 표시하지 않는다', () => {
    const r = formatRatioWithPrecision(3.24, precisionForFps(30));
    expect(r.text).not.toContain('.');
  });
});

describe('formatSeconds', () => {
  it('소수 둘째자리까지 고정 표기', () => {
    expect(formatSeconds(0.5)).toBe('0.50s');
    expect(formatSeconds(1.234)).toBe('1.23s');
  });
});
