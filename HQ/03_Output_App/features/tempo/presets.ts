import type { TempoCharacterId } from './character';

/**
 * 프리셋 카테고리 (2026-08-19, T-39 신설)
 *
 * 무료/프리미엄 경계가 곧 이 값이다 — `isPresetFree()` 참고. 3종(driver_iron)은
 * v1.0 출시 때부터 전부 무료였고, approach·putting은 처음부터 프리미엄으로
 * 못박은 신규 카테고리라 "이미 무료였던 걸 유료로 옮기는" 반발이 구조적으로
 * 없다([[T-39-어프로치퍼팅-프리미엄-프리셋]] 판단 근거).
 */
export type TempoPresetCategory = 'driver_iron' | 'approach' | 'putting';

export type TempoPreset = {
  id: string;
  /**
   * 별칭·설명 문자열은 `i18n/locales/{ko,en}/domain.json`에 있다
   * (별칭 = `domain:character.<characterId>.label`, 설명 = `domain:presets.<id>.description`).
   * `characterId`로 character.ts와 같은 라벨을 참조하므로 두 화면의 표현이
   * 구조적으로 항상 일치한다 — 2026-08-08 i18n 리팩터.
   */
  characterId: TempoCharacterId;
  /** 비율 표기 — "3:1" (숫자라 언어와 무관, 그대로 둔다) */
  ratioLabel: string;
  /** 백스윙 구간 비율 (예: 3:1의 3) */
  ratioBackswing: number;
  /** 다운스윙 구간 비율 (예: 3:1의 1) */
  ratioDownswing: number;
  /** 2026-08-19 (T-39) 신설. 기본값 없음 — 매 프리셋이 명시적으로 밝힌다 */
  category: TempoPresetCategory;
};

/**
 * 프리셋 라벨링 방법론 (WBS 0.9, [[프리셋-라벨링-방법론]]):
 * - 비율(3:1 등)은 객관적 수치라 그대로 사용
 * - Tour Tempo 고유의 프레임 카운트 표기(21/7, 24/8 등)는 쓰지 않음 — 방법론 네이밍 유사성 회피
 *
 * ⚠️ 2026-08-06 별칭 교체 (AOS 리뷰 B-3 · 창업자 확정)
 *   안정형 → 여유롭게 · 균형형 → 고르게 · 파워형 → 길게
 *
 * 이전 별칭은 우열이 있는 것처럼 읽혔다("파워형"이 좋아 보이고 "안정형"이
 * 무난해 보인다). 하지만 이 셋을 가르는 건 **비율일 뿐 실력이 아니다.**
 * 새 별칭은 동작을 그대로 서술하기만 한다. 자세한 근거는 `character.ts` 주석 참고.
 *
 * ⚠️ `character.ts`의 라벨과 **반드시 같아야 한다.** 프리셋 화면과 결과 화면에서
 * 같은 비율이 다른 이름으로 불리면 사용자는 두 개념이라고 생각한다.
 *   2.5:1 → 고르게 · 3:1 → 여유롭게 · 3.5:1 → 길게
 */
export const TEMPO_PRESETS: TempoPreset[] = [
  {
    id: 'preset-3-1',
    characterId: 'stable',
    ratioLabel: '3:1',
    ratioBackswing: 3,
    ratioDownswing: 1,
    category: 'driver_iron',
  },
  {
    id: 'preset-2-5-1',
    characterId: 'balanced',
    ratioLabel: '2.5:1',
    ratioBackswing: 2.5,
    ratioDownswing: 1,
    category: 'driver_iron',
  },
  {
    id: 'preset-3-5-1',
    characterId: 'power',
    ratioLabel: '3.5:1',
    ratioBackswing: 3.5,
    ratioDownswing: 1,
    category: 'driver_iron',
  },
  /**
   * 2026-08-19 (T-39) 신설 — 어프로치·퍼팅.
   *
   * 둘 다 2:1로 비율이 같다([[T-39-어프로치퍼팅-프리미엄-프리셋]] 조사 근거:
   * 2007년 PGA투어 99명 실측·Blast Motion 센서 데이터·Tour Tempo 방법론
   * 세 출처 교차검증, 창업자 확인 2026-08-19). 그런데도 프리셋을 하나로
   * 합치지 않고 둘로 나눈 이유 — 사용자에게는 "지금 뭘 연습 중인가"라는
   * 맥락이 숫자보다 중요하고, 카드 하나가 두 카테고리에 동시에 걸치면
   * 목록 UX가 혼란스럽다. [[T-38-개인화템포-4단계고정재검토|T-38]]에서
   * 이미 "선택지 과잉"이 지적된 만큼 각 카테고리 1개로 시작한다.
   */
  {
    id: 'preset-approach-2-1',
    characterId: 'approach',
    ratioLabel: '2:1',
    ratioBackswing: 2,
    ratioDownswing: 1,
    category: 'approach',
  },
  {
    id: 'preset-putting-2-1',
    characterId: 'putting',
    ratioLabel: '2:1',
    ratioBackswing: 2,
    ratioDownswing: 1,
    category: 'putting',
  },
];

/**
 * 무료 티어에서 쓸 수 있는가 (2026-08-19, T-39 게이팅).
 *
 * `soundPacks.ts`의 `isPackFree()`와 같은 모양이다 — 경계는 카테고리 하나로
 * 정한다. driver_iron 3종은 v1.0 출시 때부터 무료였던 핵심 루프라 그대로
 * 두고, approach·putting만 프리미엄이다.
 */
export function isPresetFree(preset: TempoPreset): boolean {
  return preset.category === 'driver_iron';
}

export function getPresetById(id: string | null | undefined): TempoPreset | undefined {
  if (!id) return undefined;
  return TEMPO_PRESETS.find((p) => p.id === id);
}

/**
 * 임의 비율에 가장 가까운 프리셋. (2026-08-01 분리)
 * 사운드 팩 도입으로 "오디오 파일"이 아니라 "어느 프리셋인지"가 필요해졌다 —
 * 팩마다 파일이 다르므로 id를 알아야 조합을 고를 수 있다.
 *
 * ⚠️ 2026-08-19 (T-39) — 항상 `driver_iron` 카테고리 안에서만 찾는다.
 * 유일한 호출부(`useActiveTempo.ts`)가 "내 스윙"(전신 스윙 녹화)의 오디오를
 * 빌려올 프리셋을 찾는 용도인데, approach·putting까지 후보에 넣으면 실측
 * 비율이 2:1 근처인 **평범한 드라이버 스윙**이 "퍼팅" 오디오를 빌려오는
 * 사고가 난다. "내 스윙"에는 아직 카테고리 개념이 없어(T-39 스코프 밖 —
 * `app/swing-editor`는 손대지 않기로 결정) 이 구분을 함수 밖으로 옮길 수
 * 없으므로, 안전한 기본값(풀스윙만 검색)을 코드가 강제한다.
 */
export function nearestPreset(ratio: number): TempoPreset {
  const candidates = TEMPO_PRESETS.filter((p) => p.category === 'driver_iron');
  return candidates.reduce((best, p) => {
    const r = p.ratioBackswing / p.ratioDownswing;
    const bestR = best.ratioBackswing / best.ratioDownswing;
    return Math.abs(r - ratio) < Math.abs(bestR - ratio) ? p : best;
  }, candidates[0]);
}

/** 비율을 미니 시각화 막대용 백분율(백스윙 비중)로 변환 */
export function ratioToBackswingPercent(preset: TempoPreset): number {
  return (preset.ratioBackswing / (preset.ratioBackswing + preset.ratioDownswing)) * 100;
}
