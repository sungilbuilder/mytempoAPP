import { TRIAL_DAYS, computeEntitlement, useEntitlementStore } from '../useEntitlementStore';

const DAY_MS = 24 * 60 * 60 * 1000;
const T0 = new Date('2026-08-01T09:00:00+09:00').getTime();
const iso = (t: number) => new Date(t).toISOString();

describe('computeEntitlement — 역방향 체험 계산', () => {
  it('결제했으면 체험과 무관하게 항상 full', () => {
    const e = computeEntitlement(iso(T0 - 100 * DAY_MS), true, T0);
    expect(e).toEqual({ full: true, trialActive: false, trialDaysLeft: 0, isPremium: true });
  });

  it('첫 실행 기록이 없으면 체험 첫날로 본다 — 잠긴 화면부터 보여주지 않는다', () => {
    const e = computeEntitlement(null, false, T0);
    expect(e.full).toBe(true);
    expect(e.trialActive).toBe(true);
    expect(e.trialDaysLeft).toBe(TRIAL_DAYS - 1);
  });

  it('설치 당일은 잔여 6일', () => {
    const e = computeEntitlement(iso(T0), false, T0);
    expect(e.trialDaysLeft).toBe(6);
    expect(e.full).toBe(true);
  });

  it('7일차(마지막 날)까지는 열려 있고 잔여 0', () => {
    const e = computeEntitlement(iso(T0), false, T0 + 6 * DAY_MS);
    expect(e.full).toBe(true);
    expect(e.trialActive).toBe(true);
    expect(e.trialDaysLeft).toBe(0);
  });

  it('8일차부터 무료 티어로 내려온다', () => {
    const e = computeEntitlement(iso(T0), false, T0 + 7 * DAY_MS);
    expect(e.full).toBe(false);
    expect(e.trialActive).toBe(false);
    expect(e.trialDaysLeft).toBe(0);
  });

  it('한참 지나도 잔여일이 음수로 새지 않는다', () => {
    const e = computeEntitlement(iso(T0), false, T0 + 365 * DAY_MS);
    expect(e.trialDaysLeft).toBe(0);
    expect(e.full).toBe(false);
  });

  /**
   * 기기 시계를 되돌리는 우회는 **의도적으로 막지 않는다**(오프라인 앱).
   * 그래도 크래시하거나 음수 잔여일이 나오면 안 된다.
   */
  it('시계를 과거로 돌려도 안전하게 동작한다', () => {
    const e = computeEntitlement(iso(T0), false, T0 - 10 * DAY_MS);
    expect(e.full).toBe(true);
    expect(e.trialDaysLeft).toBeGreaterThanOrEqual(0);
    expect(e.trialDaysLeft).toBeLessThanOrEqual(TRIAL_DAYS + 10);
  });
});

describe('useEntitlementStore — 액션', () => {
  beforeEach(() => {
    useEntitlementStore.setState({ startedAt: null, isPremium: false, trialEndSeen: false });
  });

  it('startTrialIfNeeded 는 최초 1회만 기록한다', () => {
    const { startTrialIfNeeded } = useEntitlementStore.getState();
    startTrialIfNeeded();
    const first = useEntitlementStore.getState().startedAt;
    expect(first).not.toBeNull();

    startTrialIfNeeded();
    expect(useEntitlementStore.getState().startedAt).toBe(first);
  });

  it('setPremium / markTrialEndSeen 이 상태에 반영된다', () => {
    useEntitlementStore.getState().setPremium(true);
    expect(useEntitlementStore.getState().isPremium).toBe(true);

    useEntitlementStore.getState().markTrialEndSeen();
    expect(useEntitlementStore.getState().trialEndSeen).toBe(true);
  });
});
