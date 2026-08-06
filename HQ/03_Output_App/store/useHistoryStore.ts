/**
 * 연습 기록 — "며칠 했는지"를 숫자보다 먼저 보여주는 화면의 데이터 소스.
 *
 * 시안 근거: Premium/App UI "기록" 화면
 *   이번 주 4일 · 48분 / 평균 템포 3.1:1 / 지난주 대비 +0.1 / 연속 3일
 *
 * ⚠️ 범위 주의: PLANNING.md의 MVP 3개 기능에는 기록 화면이 없었다.
 * 2026-07-31 디자인 시안 채택으로 추가된 항목이다(창업자 승인).
 * 클라우드 동기화는 여전히 V2 — 여기 있는 건 전부 기기 로컬 저장이다.
 */
import { create } from 'zustand';
import { persisted } from './persist';

/**
 * NSM(노스스타 지표) 완료 기준 — 한 세션에서 스윙 20회 이상. (2026-08-06 명문화)
 *
 * [[KPI-노스스타]]가 60초 기준을 버리고 스윙 횟수를 택한 이유: 배속을 쓰면
 * 같은 60초라도 스윙 수가 달라져 시간 기준이 불공정해진다.
 *
 * ⚠️ 이 숫자를 코드 여러 곳에 흩어 쓰지 말 것. 정의가 바뀌면 여기만 고친다.
 */
export const NSM_SWING_THRESHOLD = 20;

/**
 * 히스토리에 남길 최소 연습 시간 (초).
 * NSM 완료 기준과 **다른 축**이다 — 짧아도 "연습했다"는 기록은 남겨야
 * 스트릭이 끊기지 않고, 반대로 기록에 남았다고 전부 NSM 완료는 아니다.
 */
export const MIN_RECORD_SEC = 10;

export type PracticeSession = {
  id: string;
  /** ISO 날짜 (YYYY-MM-DD) — 하루 단위 집계 기준 */
  date: string;
  /** 연습한 시간 (초) */
  durationSec: number;
  /**
   * 실제로 울린 스윙 신호 횟수.
   *
   * ⚠️ 2026-08-06부터 이 값은 **오디오 루프 경계**에서 센 값이다(AOS 리뷰 P-3).
   * 이전에는 JS `setInterval`로 세어 오디오와 어긋났고, 재생 중 설정을 바꾸면
   * 위상이 초기화됐다. 그 시절 데이터와 섞이지 않도록 아래 `countSource`를 둔다.
   */
  swingCount: number;
  /**
   * NSM 완료 세션인가 (swingCount >= NSM_SWING_THRESHOLD).
   *
   * 저장 시점에 **값으로 굳혀둔다.** 기준이 나중에 바뀌더라도 과거 판정이
   * 소급해서 흔들리면 D30 리텐션 추이 자체를 신뢰할 수 없기 때문이다.
   */
  completed: boolean;
  /**
   * 스윙 카운트를 무엇으로 셌는가. (2026-08-06 신설)
   * 'timer' = 구버전(JS 타이머, 부정확) · 'audio' = 오디오 루프 경계
   * 계측 대시보드에서 구버전 데이터를 분리하기 위한 필드다 → T-16.
   */
  countSource?: 'timer' | 'audio';
  /** 그때 쓴 템포 비율 */
  ratio: number;
  /** "내 스윙" 또는 프리셋 이름 */
  sourceLabel: string;
};

type HistoryState = {
  sessions: PracticeSession[];
  addSession: (session: PracticeSession) => void;
  clearAll: () => void;
};

export const useHistoryStore = create<HistoryState>()(
  persisted<HistoryState>(
    'history',
    (set) => ({
      sessions: [],
      addSession: (session) =>
        set((s) => ({ sessions: [session, ...s.sessions].slice(0, 500) })),
      clearAll: () => set({ sessions: [] }),
    }),
    { partialize: (s) => ({ sessions: s.sessions }) }
  )
);

/* ───────────────────────── 집계 함수 ───────────────────────── */

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function daysAgoKey(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateKey(d);
}

/**
 * 연속 연습 일수(스트릭).
 * 오늘 아직 안 했더라도 어제까지 이어졌으면 스트릭은 살아있는 것으로 센다 —
 * "오늘 0시가 지나자마자 스트릭이 깨진 것처럼 보이는" 좌절을 피하기 위해서다.
 */
export function computeStreak(sessions: PracticeSession[]): number {
  const days = new Set(sessions.map((s) => s.date));
  if (days.size === 0) return 0;

  let start = 0;
  if (!days.has(daysAgoKey(0))) {
    if (!days.has(daysAgoKey(1))) return 0;
    start = 1;
  }

  let streak = 0;
  for (let i = start; i < 400; i++) {
    if (!days.has(daysAgoKey(i))) break;
    streak++;
  }
  return streak;
}

/** 최근 n일 구간의 집계 */
function summarizeRange(sessions: PracticeSession[], fromDaysAgo: number, toDaysAgo: number) {
  const keys = new Set<string>();
  for (let i = toDaysAgo; i <= fromDaysAgo; i++) keys.add(daysAgoKey(i));

  const inRange = sessions.filter((s) => keys.has(s.date));
  const totalSec = inRange.reduce((acc, s) => acc + s.durationSec, 0);
  const totalSwings = inRange.reduce((acc, s) => acc + (s.swingCount ?? 0), 0);
  const dayCount = new Set(inRange.map((s) => s.date)).size;
  /** NSM — "완료한 연습"이 있었던 날 수 */
  const completedDays = new Set(inRange.filter(isCompleted).map((s) => s.date)).size;
  const avgRatio =
    inRange.length > 0
      ? inRange.reduce((acc, s) => acc + s.ratio, 0) / inRange.length
      : 0;

  return {
    dayCount,
    completedDays,
    totalMinutes: Math.round(totalSec / 60),
    totalSwings,
    avgRatio,
    count: inRange.length,
  };
}

/**
 * NSM 완료 세션 판정.
 * `completed` 필드가 없는 구버전 저장본은 swingCount로 되짚어 판정한다.
 */
export function isCompleted(s: PracticeSession): boolean {
  if (typeof s.completed === 'boolean') return s.completed;
  return (s.swingCount ?? 0) >= NSM_SWING_THRESHOLD;
}

export type HistorySummary = {
  /** 이번 주(최근 7일) 연습한 날 수 */
  weekDays: number;
  /** 이번 주 총 분 */
  weekMinutes: number;
  /** 이번 주 총 스윙 수 — NSM의 단위 (2026-08-06 신설) */
  weekSwings: number;
  /** 이번 주 NSM 완료(스윙 20회 이상)가 있었던 날 수 */
  weekCompletedDays: number;
  /** 이번 주 평균 템포 비율 */
  avgRatio: number;
  /** 지난주 대비 평균 템포 변화 (양수 = 늘어남). 지난주 데이터 없으면 null */
  ratioDelta: number | null;
  streak: number;
};

export function summarize(sessions: PracticeSession[]): HistorySummary {
  const thisWeek = summarizeRange(sessions, 6, 0);
  const lastWeek = summarizeRange(sessions, 13, 7);

  return {
    weekDays: thisWeek.dayCount,
    weekMinutes: thisWeek.totalMinutes,
    weekSwings: thisWeek.totalSwings,
    weekCompletedDays: thisWeek.completedDays,
    avgRatio: thisWeek.avgRatio,
    ratioDelta:
      thisWeek.count > 0 && lastWeek.count > 0
        ? thisWeek.avgRatio - lastWeek.avgRatio
        : null,
    streak: computeStreak(sessions),
  };
}

/**
 * 무료 티어에서 화면에 보여줄 기간 (일). (2026-08-06, Premium 게이팅)
 *
 * ⚠️ **표시만 자르고 저장은 전부 유지한다.** 데이터를 지우면
 *   ① 결제 후 복구가 안 되고
 *   ② D30 리텐션 관측이 끊겨 유일한 출시 게이트를 판정할 수 없게 된다.
 * → [[v1.0-출시사양]] 무료 티어 "최근 7일 히스토리"
 */
export const FREE_HISTORY_DAYS = 7;

/**
 * 엔타이틀먼트에 따라 화면에 보여줄 세션만 걸러낸다.
 * `full = true`(프리미엄 또는 체험 기간)면 전부 돌려준다.
 */
export function visibleSessions(
  sessions: PracticeSession[],
  full: boolean,
  days = FREE_HISTORY_DAYS
): PracticeSession[] {
  if (full) return sessions;
  const keys = new Set<string>();
  for (let i = 0; i < days; i++) keys.add(daysAgoKey(i));
  return sessions.filter((s) => keys.has(s.date));
}

/** "어제", "7월 27일" 같은 사람이 읽는 날짜 */
export function humanDate(dateKey: string): string {
  if (dateKey === daysAgoKey(0)) return '오늘';
  if (dateKey === daysAgoKey(1)) return '어제';
  const [, m, d] = dateKey.split('-');
  return `${Number(m)}월 ${Number(d)}일`;
}

/** 1234초 → "20분" / 45초 → "45초" */
export function humanDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)}초`;
  return `${Math.round(sec / 60)}분`;
}
