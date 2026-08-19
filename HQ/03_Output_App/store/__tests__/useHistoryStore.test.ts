import type { TFunction } from 'i18next';
import {
  FREE_HISTORY_DAYS,
  MIN_RECORD_SEC,
  NSM_SWING_THRESHOLD,
  computeStreak,
  humanDate,
  humanDuration,
  isCompleted,
  summarize,
  toDateKey,
  useHistoryStore,
  visibleSessions,
  type PracticeSession,
} from '../useHistoryStore';

/** 집계 함수가 전부 `new Date()` 기준이라 시스템 시각을 고정한다. */
const NOW = new Date('2026-08-07T10:00:00+09:00');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
});
afterAll(() => {
  jest.useRealTimers();
});

const dayKey = (n: number) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return toDateKey(d);
};

const session = (over: Partial<PracticeSession> = {}): PracticeSession => ({
  id: Math.random().toString(36).slice(2),
  date: dayKey(0),
  durationSec: 300,
  swingCount: 25,
  completed: true,
  countSource: 'audio',
  ratio: 3.0,
  sourceLabel: '3:1',
  ...over,
});

describe('toDateKey', () => {
  it('YYYY-MM-DD 로 0 패딩한다', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('isCompleted — NSM 완료 판정', () => {
  it('completed 필드가 있으면 그 값을 그대로 신뢰한다', () => {
    expect(isCompleted(session({ completed: true, swingCount: 0 }))).toBe(true);
    expect(isCompleted(session({ completed: false, swingCount: 999 }))).toBe(false);
  });

  it('구버전 저장본(completed 없음)은 swingCount 로 되짚는다', () => {
    const legacy = session({ swingCount: NSM_SWING_THRESHOLD });
    delete (legacy as Partial<PracticeSession>).completed;
    expect(isCompleted(legacy)).toBe(true);

    const legacyShort = session({ swingCount: NSM_SWING_THRESHOLD - 1 });
    delete (legacyShort as Partial<PracticeSession>).completed;
    expect(isCompleted(legacyShort)).toBe(false);
  });
});

describe('computeStreak — 연속 연습 일수', () => {
  it('기록이 없으면 0', () => {
    expect(computeStreak([])).toBe(0);
  });

  it('오늘부터 이어지면 그 길이만큼', () => {
    const s = [0, 1, 2].map((n) => session({ date: dayKey(n) }));
    expect(computeStreak(s)).toBe(3);
  });

  it('오늘 아직 안 했어도 어제까지 이어졌으면 살아있다', () => {
    const s = [1, 2, 3].map((n) => session({ date: dayKey(n) }));
    expect(computeStreak(s)).toBe(3);
  });

  it('오늘도 어제도 없으면 0 (이틀 비면 끊긴다)', () => {
    const s = [2, 3, 4].map((n) => session({ date: dayKey(n) }));
    expect(computeStreak(s)).toBe(0);
  });

  it('중간이 비면 거기서 멈춘다', () => {
    const s = [0, 1, 3, 4].map((n) => session({ date: dayKey(n) }));
    expect(computeStreak(s)).toBe(2);
  });

  it('같은 날 여러 세션은 하루로 센다', () => {
    const s = [session({ date: dayKey(0) }), session({ date: dayKey(0) })];
    expect(computeStreak(s)).toBe(1);
  });
});

describe('summarize — 주간 집계', () => {
  it('기록이 없으면 전부 0 이고 델타는 null', () => {
    const r = summarize([]);
    expect(r).toMatchObject({
      weekDays: 0,
      weekMinutes: 0,
      weekSwings: 0,
      weekCompletedDays: 0,
      avgRatio: 0,
      ratioDelta: null,
      streak: 0,
    });
  });

  it('최근 7일만 이번 주로 센다', () => {
    const s = [
      session({ date: dayKey(0) }),
      session({ date: dayKey(6) }),
      session({ date: dayKey(7) }),
    ];
    expect(summarize(s).weekDays).toBe(2);
  });

  it('분 단위는 반올림한다', () => {
    const s = [session({ durationSec: 90 })];
    expect(summarize(s).weekMinutes).toBe(2);
  });

  it('스윙 수를 합산한다', () => {
    const s = [session({ swingCount: 20 }), session({ swingCount: 25 })];
    expect(summarize(s).weekSwings).toBe(45);
  });

  it('NSM 완료가 있었던 날 수를 따로 센다', () => {
    const s = [
      session({ date: dayKey(0), completed: true }),
      session({ date: dayKey(1), completed: false }),
      session({ date: dayKey(2), completed: true }),
    ];
    expect(summarize(s).weekDays).toBe(3);
    expect(summarize(s).weekCompletedDays).toBe(2);
  });

  it('지난주 데이터가 있어야 델타가 나온다', () => {
    const onlyThisWeek = [session({ date: dayKey(0), ratio: 3.2 })];
    expect(summarize(onlyThisWeek).ratioDelta).toBeNull();

    const both = [
      session({ date: dayKey(0), ratio: 3.2 }),
      session({ date: dayKey(8), ratio: 3.0 }),
    ];
    expect(summarize(both).ratioDelta).toBeCloseTo(0.2, 5);
  });
});

describe('visibleSessions — 무료 티어 표시 제한', () => {
  const s = [0, 3, 6, 7, 30].map((n) => session({ date: dayKey(n) }));

  it('full 이면 전부 보여준다', () => {
    expect(visibleSessions(s, true)).toHaveLength(5);
  });

  it('무료면 최근 7일만 보여준다', () => {
    expect(visibleSessions(s, false)).toHaveLength(3); // 0, 3, 6
  });

  it('표시만 자를 뿐 원본 배열은 건드리지 않는다 — 결제 후 복구와 리텐션 관측을 위해', () => {
    visibleSessions(s, false);
    expect(s).toHaveLength(5);
  });

  it('기간은 인자로 조정할 수 있다', () => {
    expect(visibleSessions(s, false, 1)).toHaveLength(1);
    expect(FREE_HISTORY_DAYS).toBe(7);
  });
});

/**
 * humanDate/humanDuration은 i18n `t()`를 받아 문자열을 만든다(2026-08-08 i18n
 * 리팩터). 실제 리소스 대신 여기서 쓰는 키만 흉내 낸 최소 스텁을 쓴다 —
 * i18next 전체를 초기화하지 않고도 포맷 로직 자체를 검증하기 위함이다.
 */
const fakeT = ((key: string, params?: Record<string, unknown>): string => {
  switch (key) {
    case 'common:today':
      return '오늘';
    case 'common:yesterday':
      return '어제';
    case 'common:monthDay':
      return `${params?.month}월 ${params?.day}일`;
    case 'domain:units.seconds':
      return `${params?.value}초`;
    case 'domain:units.minutes':
      return `${params?.value}분`;
    default:
      return key;
  }
}) as TFunction;

describe('humanDate / humanDuration', () => {
  it('오늘·어제는 말로, 그 전은 날짜로', () => {
    expect(humanDate(dayKey(0), fakeT)).toBe('오늘');
    expect(humanDate(dayKey(1), fakeT)).toBe('어제');
    expect(humanDate('2026-07-27', fakeT)).toBe('7월 27일');
  });

  it('60초 미만은 초, 이상은 분', () => {
    expect(humanDuration(45, fakeT)).toBe('45초');
    expect(humanDuration(59, fakeT)).toBe('59초');
    expect(humanDuration(60, fakeT)).toBe('1분');
    expect(humanDuration(1234, fakeT)).toBe('21분');
  });
});

describe('useHistoryStore', () => {
  beforeEach(() => {
    useHistoryStore.setState({ sessions: [] });
  });

  it('최신 세션이 앞에 쌓인다', () => {
    const a = session({ id: 'a' });
    const b = session({ id: 'b' });
    useHistoryStore.getState().addSession(a);
    useHistoryStore.getState().addSession(b);
    expect(useHistoryStore.getState().sessions.map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('500개를 넘으면 오래된 것부터 버린다', () => {
    for (let i = 0; i < 505; i++) {
      useHistoryStore.getState().addSession(session({ id: `s${i}` }));
    }
    const kept = useHistoryStore.getState().sessions;
    expect(kept).toHaveLength(500);
    expect(kept[0].id).toBe('s504');
    expect(kept.map((s) => s.id)).not.toContain('s0');
  });

  it('clearAll 로 비운다', () => {
    useHistoryStore.getState().addSession(session());
    useHistoryStore.getState().clearAll();
    expect(useHistoryStore.getState().sessions).toEqual([]);
  });

  it('MIN_RECORD_SEC 상수가 노출돼 있다 (호출부가 각자 정의하지 않도록)', () => {
    expect(MIN_RECORD_SEC).toBe(10);
  });
});
