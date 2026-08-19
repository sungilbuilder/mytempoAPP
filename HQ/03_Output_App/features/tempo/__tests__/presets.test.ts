import { characterForRatio } from '../character';
import {
  TEMPO_PRESETS,
  getPresetById,
  isPresetFree,
  nearestPreset,
  ratioToBackswingPercent,
} from '../presets';

const DRIVER_IRON_PRESETS = TEMPO_PRESETS.filter((p) => p.category === 'driver_iron');

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

  /**
   * 2026-08-19 (T-39) — approach·putting(2:1)이 생기면서 실제 드라이버 스윙의
   * 비율이 2:1에 가까울 때 잘못 "퍼팅" 오디오를 빌려오는 사고가 가능해졌다.
   * `nearestPreset`은 driver_iron 카테고리 밖으로 절대 나가면 안 된다.
   */
  it('비율이 2:1에 가까워도 driver_iron 프리셋만 후보로 삼는다 (approach·putting 오염 방지)', () => {
    expect(nearestPreset(2.0).category).toBe('driver_iron');
    expect(nearestPreset(2.0).id).toBe('preset-2-5-1');
    expect(nearestPreset(2.1).category).toBe('driver_iron');
  });
});

describe('TEMPO_PRESETS — 카테고리 (2026-08-19, T-39)', () => {
  it('driver_iron 3종은 항상 무료다', () => {
    for (const p of TEMPO_PRESETS.filter((p) => p.category === 'driver_iron')) {
      expect(isPresetFree(p)).toBe(true);
    }
  });

  it('approach·putting은 항상 프리미엄이다', () => {
    const gated = TEMPO_PRESETS.filter(
      (p) => p.category === 'approach' || p.category === 'putting',
    );
    expect(gated.length).toBe(2);
    for (const p of gated) {
      expect(isPresetFree(p)).toBe(false);
    }
  });

  it('approach·putting은 둘 다 2:1 — 세 독립 출처(2007 PGA투어 실측·Blast Motion·Tour Tempo) 교차검증', () => {
    const approach = getPresetById('preset-approach-2-1');
    const putting = getPresetById('preset-putting-2-1');
    expect(approach?.ratioBackswing).toBe(2);
    expect(approach?.ratioDownswing).toBe(1);
    expect(putting?.ratioBackswing).toBe(2);
    expect(putting?.ratioDownswing).toBe(1);
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
 * 2026-08-08 i18n 리팩터 이후로는 `characterId`가 라벨 문자열 대신 이 불변식을
 * 구조적으로 보장한다(둘 다 같은 `domain.json`의 `character.<id>`를 참조).
 * 여기서는 그 참조 자체가 어긋나지 않았는지만 고정한다.
 *
 * ⚠️ 2026-08-19 (T-39) — `driver_iron` 카테고리로 범위를 좁혔다. approach·putting
 * 프리셋은 `characterForRatio()`가 계산하지 않고 `presets.ts`가 직접 지정한다
 * (character.ts L36-47 주석 참고 — 이 함수의 임계값은 드라이버·아이언 철학
 * 전용이라 애초에 이 두 값을 리턴하지 않도록 의도적으로 분리했다). 이 불변식은
 * "계산 경로"를 쓰는 프리셋에만 적용된다.
 */
describe('프리셋 characterId ↔ characterForRatio 일치 (교차 파일 불변식)', () => {
  it.each(
    TEMPO_PRESETS.filter((p) => p.category === 'driver_iron').map((p) => [
      p.ratioLabel,
      p.characterId,
      p.ratioBackswing / p.ratioDownswing,
    ]),
  )(
    '%s 프리셋의 characterId "%s" 는 characterForRatio 결과와 같다',
    (_label, characterId, ratio) => {
      expect(characterForRatio(ratio as number)).toBe(characterId);
    },
  );
});
