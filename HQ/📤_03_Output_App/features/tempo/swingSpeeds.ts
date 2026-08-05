/**
 * 스윙 속도 — 비율과 별개인 두 번째 축 (2026-08-01, WBS 2.11 / 2.12)
 *
 * ## 왜 만들었나
 *
 * 창업자가 공유한 템포 훈련 트랙 4종의 수치를 계산해보니 결정적인 사실이 나왔다.
 *
 *   0.700s / 0.233s  → 비율 3.00:1, 스윙 전체 0.933s
 *   0.800s / 0.267s  → 비율 3.00:1, 스윙 전체 1.067s
 *   0.900s / 0.300s  → 비율 3.00:1, 스윙 전체 1.200s
 *   1.000s / 0.333s  → 비율 3.00:1, 스윙 전체 1.333s
 *
 * **넷 다 비율은 똑같이 3:1이고, 다른 것은 "절대 속도"뿐이다.**
 *
 * 그런데 우리 앱은 비율(2.5:1 / 3:1 / 3.5:1)만 바꾸고 스윙 전체 길이는 1.1초로
 * 고정돼 있었다. 즉 훈련 체계의 축 하나가 통째로 빠져 있었다.
 *
 * ## ⚠️ 빠른 속도가 더 좋은 속도가 아니다
 *
 * 창업자 지적: "골프 선수들이 각각 템포가 다른데, 속도가 무조건 빨라진다고
 * 좋아지는 건 아닌 것 같다." — 맞는 말이고, 이 파일의 설계 전체가 그 위에 서 있다.
 *
 * 여러 측정에서 반복적으로 확인되는 것은 **비율의 일관성**(대체로 3:1 근처)이지
 * "빠를수록 낫다"가 아니다. 절대 속도는 체격·유연성·스윙 길이에 따라 사람마다
 * 다르고, 자기 몸에 맞지 않는 속도로 억지로 맞추면 오히려 리듬이 깨진다.
 *
 * 그래서 이 파일은 다음 두 가지를 **구조적으로** 지킨다.
 *   1) 순서를 느린 것 → 빠른 것으로 두되, 어느 것도 "상위 단계"로 표시하지 않는다.
 *      화면의 주인공은 형용사가 아니라 **실제 소요 시간(초)** 이다.
 *   2) 추천은 "네가 도달해야 할 목표"가 아니라 **"측정된 네 스윙에 가장 가까운 것"**
 *      을 고른다. 목표를 제시하려면 근거가 있어야 하는데, 우리에겐 없다.
 *
 * ## 어떻게 구현했나
 *
 * 오디오를 속도별로 새로 만들지 않고 **재생 배속(playbackRate)으로 처리**한다.
 * 비율은 파일 안에 이미 박혀 있고 배속은 전체를 균일하게 늘리거나 줄이므로
 * 비율이 보존된다. 파일 수가 4배로 늘지 않는 것도 큰 이점이다.
 * (음 높이는 `shouldCorrectPitch`로 보정한다 — metronome.ts 참고)
 *
 * ## ⚠️ 표기에 대한 원칙
 *
 * 원본 트랙들이 쓰는 "프레임 수/프레임 수" 표기는 **쓰지 않는다.** 이는
 * 2026-07-30에 이미 정한 방침이며(`preset-naming-methodology-proposal.md`),
 * 특정 상용 방법론의 고유 표기를 그대로 가져오면 유사성 이슈가 생길 수 있기 때문이다.
 * 대신 **실제 소요 시간(초)을 그대로 보여준다.** 사실 그 자체라 문제가 없고,
 * 프레임 표기보다 일반 골퍼에게 더 직관적이다.
 */

/**
 * id는 스윙 길이(센티초)에서 따왔다 — `s120` = 1.20초.
 *
 * 왜 'slow'/'normal' 같은 형용사를 쓰지 않았나: 단계가 3개에서 4개로 늘면서
 * "보통"이 가리키는 대상이 바뀌었다. 형용사를 id로 쓰면 저장된 값의 **의미가
 * 조용히 달라진다.** 길이는 안 변하므로 id로 안전하다.
 */
export type SwingSpeedId = 's133' | 's120' | 's107' | 's093';

export type SwingSpeed = {
  id: SwingSpeedId;
  /** 이 속도에서 스윙 전체(백스윙+다운스윙)에 걸리는 시간 */
  swingSec: number;
  /** 화면에 크게 띄우는 값 — "1.20초" */
  label: string;
  /** 짧은 성격 설명. 우열이 아니라 느낌을 말한다. */
  nickname: string;
  /** 기준 오디오(스윙 1.1초)에 곱할 재생 배속 */
  rate: number;
};

/** 기준 오디오 파일의 스윙 구간 길이 — 오디오 생성 스크립트의 SWING과 같아야 한다. */
export const BASE_SWING_SEC = 1.1;

function speed(id: SwingSpeedId, swingSec: number, nickname: string): SwingSpeed {
  return {
    id,
    swingSec,
    label: `${swingSec.toFixed(2)}초`,
    nickname,
    rate: BASE_SWING_SEC / swingSec,
  };
}

/** 느린 것 → 빠른 것 순. **순서일 뿐 등급이 아니다.** */
export const SWING_SPEEDS: SwingSpeed[] = [
  speed('s133', 1.333, '느긋하게'),
  speed('s120', 1.2, '여유 있게'),
  speed('s107', 1.067, '탄력 있게'),
  speed('s093', 0.933, '경쾌하게'),
];

/** 측정 이력이 없는 사용자에게 처음 보여줄 단계 */
export const DEFAULT_SWING_SPEED: SwingSpeedId = 's120';

export function getSwingSpeed(id: SwingSpeedId): SwingSpeed {
  // 알 수 없는 id(구버전 저장값 등)는 조용히 기본값으로 떨어진다.
  return SWING_SPEEDS.find((s) => s.id === id) ?? SWING_SPEEDS[1];
}

/**
 * 해당 속도·비율에서 백스윙/다운스윙이 각각 몇 초인지.
 * 화면에 "0.90초 : 0.30초"처럼 사실을 그대로 보여주기 위한 계산이다.
 */
export function swingBreakdown(s: SwingSpeed, ratio: number) {
  const backswingSec = s.swingSec * (ratio / (ratio + 1));
  const downswingSec = s.swingSec / (ratio + 1);
  return { backswingSec, downswingSec };
}

/* ───────────────────── 개인 템포 추천 ───────────────────── */

export type SpeedRecommendation = {
  speed: SwingSpeed;
  /** 추천 근거가 된 실측 스윙 길이(초) */
  measuredSec: number;
  /** 추천에 쓴 스윙 개수 */
  sampleCount: number;
  /**
   * 실측값이 우리 4단계 범위 밖인가.
   * true면 "가장 가까운 것"일 뿐 잘 맞는 단계가 아니라는 뜻이라,
   * 화면에서 그 사실을 숨기지 말아야 한다.
   */
  outOfRange: boolean;
};

/**
 * 측정된 내 스윙에서 가장 가까운 단계를 고른다.
 *
 * ⚠️ 설계 의도 — "목표"가 아니라 "출발점"을 고른다.
 *
 * 더 빠른 단계를 목표로 제시하고 싶은 유혹이 있지만, 그러려면 "당신은 더 빨라져야
 * 한다"는 근거가 있어야 한다. 우리에겐 없다. 프로들 사이에서도 절대 속도는
 * 제각각이고, 일관되게 관찰되는 건 비율이지 속도가 아니다.
 * 그래서 **지금 내 몸이 실제로 내는 속도**에서 시작하게 한다.
 *
 * 여러 스윙을 저장했다면 **중앙값**을 쓴다. 평균이 아닌 이유: 마킹을 한 번
 * 잘못하면(임팩트를 놓치는 등) 평균은 통째로 끌려가지만 중앙값은 버틴다.
 */
export function recommendSwingSpeed(
  swings: { backswingSec: number; downswingSec: number }[]
): SpeedRecommendation | null {
  const totals = swings
    .map((w) => w.backswingSec + w.downswingSec)
    // 0.4초 미만/3초 초과는 마킹 실수로 본다 — 사람이 낼 수 있는 스윙 속도가 아니다.
    .filter((t) => t >= 0.4 && t <= 3.0)
    .sort((a, b) => a - b);

  if (totals.length === 0) return null;

  const mid = Math.floor(totals.length / 2);
  const measuredSec =
    totals.length % 2 === 1 ? totals[mid] : (totals[mid - 1] + totals[mid]) / 2;

  const nearest = SWING_SPEEDS.reduce((best, s) =>
    Math.abs(s.swingSec - measuredSec) < Math.abs(best.swingSec - measuredSec) ? s : best
  );

  const slowest = SWING_SPEEDS[0].swingSec;
  const fastest = SWING_SPEEDS[SWING_SPEEDS.length - 1].swingSec;

  return {
    speed: nearest,
    measuredSec,
    sampleCount: totals.length,
    outOfRange: measuredSec > slowest || measuredSec < fastest,
  };
}
