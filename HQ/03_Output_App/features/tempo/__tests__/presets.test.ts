import { characterForRatio } from '../character';
import { TEMPO_PRESETS, getPresetById, nearestPreset, ratioToBackswingPercent } from '../presets';

describe('getPresetById', () => {
  it('없는 id·null·undefined 는 undefined', () => {
    expect(getPresetById(null)).toBeUndefined();
    expect(getPresetById(undefined)).toBeUndefined();
    expect(getPresetById('')).toBeUndefined();
    expect(getPresetById('preset-없음')).toBeUndefined();
  });

  it('있는 id 는 해당 프리셋', () => {
    expect(getPresetById('preset-3-1')?.ratioLabel).toBe('3:1');
  });
});

describe('nearestPreset', () => {
  it('정확히 일치하는 비율', () => {
    expect(nearestPreset(3.0).id).toBe('preset-3-1');
    expect(nearestPreset(2.5).id).toBe('preset-2-5-1');
    expect(nearestPreset(3.5).id).toBe('preset-3-5-1');
  });

  it('중간값은 더 가까운 쪽으로', () => {
    expect(nearestPreset(2.6).id).toBe('preset-2-5-1');
    expect(nearestPreset(2.9).id).toBe('preset-3-1');
    expect(nearestPreset(3.4).id).toBe('preset-3-5-1');
  });

  it('범위를 벗어나도 가장 가까운 것을 돌려준다', () => {
    expect(nearestPreset(0.1).id).toBe('preset-2-5-1');
    expect(nearestPreset(99).id).toBe('preset-3-5-1');
  });
});

describe('ratioToBackswingPercent', () => {
  it('3:1 이면 백스윙 비중 75%', () => {
    expect(ratioToBackswingPercent(getPresetById('preset-3-1')!)).toBeCloseTo(75, 5);
  });

  it('2.5:1 이면 약 71.4%', () => {
    expect(ratioToBackswingPercent(getPresetById('preset-2-5-1')!)).toBeCloseTo(
      (2.5 / 3.5) * 100,
      5,
    );
  });

  it('항상 50~100% 사이다 (백스윙이 더 길다는 전제)', () => {
    for (const p of TEMPO_PRESETS) {
      const pct = ratioToBackswingPercent(p);
      expect(pct).toBeGreaterThan(50);
      expect(pct).toBeLessThan(100);
    }
  });
});

/**
 * presets.ts 주석: "character.ts의 라벨과 **반드시 같아야 한다.**
 * 프리셋 화면과 결과 화면에서 같은 비율이 다른 이름으로 불리면
 * 사용자는 두 개념이라고 생각한다."
 *
 * 문서로만 남은 이 규칙을 실행 가능한 형태로 고정한다.
 */
describe('프리셋 별칭 ↔ 성향 라벨 일치 (교차 파일 불변식)', () => {
  it.each(TEMPO_PRESETS.map((p) => [p.ratioLabel, p.alias, p.ratioBackswing / p.ratioDownswing]))(
    '%s 프리셋의 별칭 "%s" 는 characterForRatio 라벨과 같다',
    (_label, alias, ratio) => {
      expect(characterForRatio(ratio as number).label).toBe(alias);
    },
  );

  it('설명 문장도 성향 detail 과 같은 표현을 쓴다', () => {
    for (const p of TEMPO_PRESETS) {
      const ch = characterForRatio(p.ratioBackswing / p.ratioDownswing);
      // 완전 일치까지는 요구하지 않되, 서로 다른 성향을 가리키면 안 된다
      expect(ch.label).toBe(p.alias);
    }
  });
});
