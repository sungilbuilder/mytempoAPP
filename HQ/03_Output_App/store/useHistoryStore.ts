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

export type PracticeSession = {
  id: string;
  /** ISO 날짜 (YYYY-MM-DD) — 하루 단위 집계 기준 */
  date: string;
  /** 연습한 시간 (초) */
  durationSec: number;
  /** 반복 재생된 스윙 사이클 수 */
  swingCount: number;
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
  const dayCount = new Set(inRange.map((s) => s.date)).size;
  const avgRatio =
    inRange.length > 0
      ? inRange.reduce((acc, s) => acc + s.ratio, 0) / inRange.length
      : 0;

  return { dayCount, totalMinutes: Math.round(totalSec / 60), avgRatio, count: inRange.length };
}

export type HistorySummary = {
  /** 이번 주(최근 7일) 연습한 날 수 */
  weekDays: number;
  /** 이번 주 총 분 */
  weekMinutes: number;
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
    avgRatio: thisWeek.avgRatio,
    ratioDelta:
      thisWeek.count > 0 && lastWeek.count > 0
        ? thisWeek.avgRatio - lastWeek.avgRatio
        : null,
    streak: computeStreak(sessions),
  };
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
