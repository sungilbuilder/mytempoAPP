/**
 * 템포 성향 판정 — 비율 하나를 사람이 읽을 수 있는 문장으로 바꾼다.
 *
 * ## ⚠️ 2026-08-06 라벨 전면 교체 (AOS 리뷰 B-3 · 창업자 확정)
 *
 * 이전 라벨은 **안정형 / 균형형 / 파워형**이었고, 파일 주석 스스로 "PM 확정 전까지
 * 잠정값"이라 적어두고 있었다. 문제는 이 셋이 **대등하게 읽히지 않는다**는 것이다.
 * "파워형"은 명백히 좋게, "안정형"은 무난하게 들린다.
 *
 * 그런데 이 라벨을 가르는 건 **비율일 뿐 실력이 아니다.** 3.5:1이면 파워형이 된다.
 * 앱 전체가 "빠른 게 더 좋은 건 아니에요"라는 원칙 위에 서 있고
 * `swingSpeeds.ts`는 그 원칙에 파일 절반을 할애하는데, **라벨만 그 원칙을
 * 배신하고 있었다.**
 *
 * 새 라벨은 비율이 실제로 무엇을 말하는지만 그대로 옮긴다.
 *   고르게 (< 2.75)  — 올리고 내리는 시간 차가 작다
 *   여유롭게 (2.75~3.25) — 투어 프로 구간에서 가장 흔한 대역
 *   길게 (> 3.25)     — 백스윙을 상대적으로 길게 가져간다
 *
 * 셋 중 무엇이 낫다는 함의가 없고, 셋 다 **동작의 서술**이다.
 * 우열이 필요한 자리가 아니라는 게 요점 — 여기서 필요한 건 "네 리듬은 이렇다"이지
 * "네 리듬은 이 등급이다"가 아니다.
 *
 * 표기 방침은 그대로다: Tour Tempo 고유의 프레임 표기(21/7, 24/8 등)는 쓰지 않는다
 * — 방법론 네이밍 유사성 리스크 회피(company-memory 2026-07-30).
 *
 * ⚠️ 임계값은 프리셋 3종(2.5 / 3.0 / 3.5)의 중간지점이고, 골프 스윙 생체역학
 * 연구에 근거한 값이 아니다. 그래서 화면 문구도 "~에 가까운"으로만 말한다.
 *
 * 2026-08-08 i18n: label/headline/detail 문자열은 여기 두지 않고
 * `i18n/locales/{ko,en}/domain.json`의 `character.<id>`에 둔다. 화면은
 * `t(\`domain:character.${id}.label\`)` 형태로 읽는다. 프리셋 별칭(`presets.ts`의
 * `characterId`)도 같은 id를 참조하므로, 프리셋 화면과 결과 화면의 표현이
 * **구조적으로** 항상 같다 — 문자열을 두 곳에 따로 두지 않는다.
 *
 * ⚠️ 2026-08-19 (T-39) — `approach`·`putting` 추가.
 *
 * 이 둘은 `characterForRatio()`가 **계산해서 내놓는 값이 아니다.** 이 함수의
 * 임계값(2.75/3.25)은 드라이버·아이언 풀스윙 프리셋 3종의 중간지점이라는
 * 의미만 가지고, 어프로치·퍼팅(2:1)은 애초에 그 철학("빠른 게 더 좋은 건
 * 아니에요")이 다루는 대상이 아니다. 그래서 `presets.ts`에서 두 프리셋에
 * `characterId: 'approach'`/`'putting'`을 **직접 지정**하고, 이 함수는 절대
 * 이 두 값을 리턴하지 않는다 — 계산 경로와 직접 지정 경로가 섞이지 않게
 * 의도적으로 분리했다. `result.tsx`/`my-swings.tsx`가 임의의 측정 비율에
 * `characterForRatio()`를 계속 쓰는 한(드라이버·아이언 세션 전제), 어프로치·
 * 퍼팅 세션 결과 화면에 이 라벨이 그대로 맞는지는 별도 검토가 필요하다
 * (T-39 실행 메모, golf-ux-designer 몫으로 남겨둠).
 */
export type TempoCharacterId = 'balanced' | 'stable' | 'power' | 'approach' | 'putting';

/** 백스윙:다운스윙 비율(예: 3.2)을 성향 id로 변환 */
export function characterForRatio(ratio: number): TempoCharacterId {
  if (ratio < 2.75) return 'balanced';
  if (ratio <= 3.25) return 'stable';
  return 'power';
}

/** 3.15 → "3.2:1" (소수 첫째자리 반올림) */
export function formatRatio(ratio: number): string {
  return `${Math.round(ratio * 10) / 10}:1`;
}

/* ───────────── 영상 fps에 따른 표시 정밀도 (2026-07-31 신설) ───────────── */

/**
 * 왜 fps에 따라 표시를 바꾸는가.
 *
 * 3:1 템포에서 다운스윙은 30fps 기준 8프레임뿐이다. 분모가 작아 마킹 오차가 증폭되는데,
 * 슬로우 재생으로 사용자 오차를 없애도 "실제 임팩트 순간이 두 프레임 사이에 있는"
 * 양자화 오차(±0.5프레임)는 남는다. 이걸 비율 오차로 환산하면:
 *
 *    30fps → ±0.19   (3.0과 3.2를 구분 못 함)
 *    60fps → ±0.09
 *   120fps → ±0.05
 *   240fps → ±0.02   (슬로모)
 *
 * 게다가 30fps는 셔터 1/60s 기준 노출 중 클럽헤드가 약 67cm 이동해 임팩트 프레임이
 * 통째로 번진다 — 계산 오차 이전에 눈으로 판별이 어렵다.
 *
 * 그래서 30fps 영상에 "3.2:1"이라고 쓰면 근거 없는 정밀도를 보여주는 것이 된다.
 * 창업자 확정(2026-07-31): 정직하게 표시한다.
 */
export type RatioPrecision = 'exact' | 'approximate' | 'coarse';

export function precisionForFps(fps: number | undefined): RatioPrecision {
  if (fps === undefined) return 'coarse'; // 알 수 없으면 가장 보수적으로
  if (fps >= 120) return 'exact';
  if (fps >= 60) return 'approximate';
  return 'coarse';
}

/**
 * 정밀도를 반영해 비율을 문자열로 만든다.
 *   exact       → "3.2:1"
 *   approximate → "3.2:1"  (별도로 tolerance 표기를 함께 노출)
 *   coarse      → "약 3:1"  (정수)
 */
export function formatRatioWithPrecision(
  ratio: number,
  precision: RatioPrecision,
): { text: string; tolerance?: string; canImprove: boolean } {
  if (precision === 'coarse') {
    return { text: `약 ${Math.round(ratio)}:1`, canImprove: true };
  }
  if (precision === 'approximate') {
    return { text: formatRatio(ratio), tolerance: '±0.1', canImprove: true };
  }
  return { text: formatRatio(ratio), canImprove: false };
}

/** 초 단위를 "0.56s" 형태로 */
export function formatSeconds(sec: number): string {
  return `${sec.toFixed(2)}s`;
}
