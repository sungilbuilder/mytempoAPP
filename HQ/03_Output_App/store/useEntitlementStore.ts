/**
 * 엔타이틀먼트 — "지금 이 사용자가 유료 기능을 쓸 수 있는가" (2026-08-06 신설)
 *
 * ## 배경 — 만들 게 없었다, 잠글 게 없었을 뿐
 *
 * [[AOS-통합리뷰-2026-08-06]] P-2: [[v1.0-출시사양]]이 Premium으로 확정한 3종이
 * **전부 무료로 열려 있었다.** 그런데 세 가지 중 둘(사운드팩·샷 간격)은 이미
 * 완성돼 있었고, 히스토리도 7일 컷만 없었다. 즉 남은 일은 개발이 아니라 조립이다.
 *
 *   사운드팩 전체        → 구현 완료 · 잠금 없음
 *   샷 간격 커스텀        → 구현 완료 · 잠금 없음
 *   히스토리 전체 기간    → 7일 컷 없음
 *
 * ## 역방향 체험 (Reverse Trial)
 *
 * 설치 직후 7일간은 **전부 열어준다.** 8일차부터 무료 티어로 내려온다.
 *
 * 왜 이 방향인가: 습관 앱에서 "먼저 써보고 결제"는 사실상 유일하게 작동하는
 * 구조다. 처음부터 잠가두면 유료 기능이 무엇인지 체감할 기회 자체가 없고,
 * 무료로 계속 열어두면 결제할 이유가 없다. 체험이 끝나는 시점이
 * **가장 아쉬운 순간**이라 그때 안내하는 게 정직하면서도 효과적이다.
 *
 * ⚠️ 히스토리는 **표시만 자르고 저장은 전부 유지한다.**
 * 8일차 강등에서 데이터가 사라지면 ①결제 후 복구가 안 되고
 * ②D30 리텐션 관측이 끊겨 유일한 출시 게이트를 판정할 수 없게 된다.
 *
 * ## v1 범위
 *
 * 실제 결제(IAP) 연동은 스토어 계정이 필요해 이 단계에서 하지 않는다.
 * 여기까지가 "잠그는 코드"이고, `setPremium(true)`를 호출하는 자리에
 * 나중에 구매 복원 결과를 물리면 된다 → [[T-10-IAP-역방향체험-구현]].
 */
import { create } from 'zustand';
import { persisted } from './persist';

/** 역방향 체험 기간 (일) — 설치일 포함 7일 */
export const TRIAL_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

type EntitlementState = {
  /** 첫 실행 시각 (ISO). 체험 잔여일 계산의 기준점 */
  startedAt: string | null;
  /** 결제 완료 여부. v1에서는 항상 false — IAP 연동 시 여기에 물린다 */
  isPremium: boolean;
  /** 체험 종료 안내를 이미 봤는가 (같은 안내를 반복해서 띄우지 않기 위함) */
  trialEndSeen: boolean;
  /** 첫 실행 시 한 번 호출. 이미 값이 있으면 아무것도 하지 않는다 */
  startTrialIfNeeded: () => void;
  setPremium: (v: boolean) => void;
  markTrialEndSeen: () => void;
};

export const useEntitlementStore = create<EntitlementState>()(
  persisted<EntitlementState>(
    'entitlement',
    (set, get) => ({
      startedAt: null,
      isPremium: false,
      trialEndSeen: false,
      startTrialIfNeeded: () => {
        if (get().startedAt) return;
        set({ startedAt: new Date().toISOString() });
      },
      setPremium: (isPremium) => set({ isPremium }),
      markTrialEndSeen: () => set({ trialEndSeen: true }),
    }),
    {
      partialize: (s) => ({
        startedAt: s.startedAt,
        isPremium: s.isPremium,
        trialEndSeen: s.trialEndSeen,
      }),
    },
  ),
);

export type Entitlement = {
  /** 유료 기능을 지금 쓸 수 있는가 (결제했거나 체험 중) */
  full: boolean;
  /** 체험 기간 중인가 */
  trialActive: boolean;
  /** 체험 잔여일 (0이면 오늘이 마지막 날) */
  trialDaysLeft: number;
  isPremium: boolean;
};

/**
 * 순수 계산 — 테스트와 화면 양쪽에서 같은 함수를 쓴다.
 *
 * ⚠️ 기기 시계를 되돌려 체험을 늘리는 건 막지 않는다.
 * 완전 오프라인 앱이라 서버 시각을 확인할 방법이 없고, 그걸 막겠다고
 * 네트워크를 붙이면 "완전 오프라인"이라는 핵심 셀링 포인트가 무너진다.
 * 소수의 우회보다 그쪽 손해가 크다는 판단이다.
 */
export function computeEntitlement(
  startedAt: string | null,
  isPremium: boolean,
  now = Date.now(),
): Entitlement {
  if (isPremium) {
    return { full: true, trialActive: false, trialDaysLeft: 0, isPremium: true };
  }
  if (!startedAt) {
    // 아직 첫 실행 기록이 없으면 체험 첫날로 본다 — 잠긴 화면부터 보여주지 않는다.
    return { full: true, trialActive: true, trialDaysLeft: TRIAL_DAYS - 1, isPremium: false };
  }
  const started = new Date(startedAt).getTime();
  const elapsedDays = Math.floor((now - started) / DAY_MS);
  const left = TRIAL_DAYS - 1 - elapsedDays;
  const active = left >= 0;
  return {
    full: active,
    trialActive: active,
    trialDaysLeft: Math.max(0, left),
    isPremium: false,
  };
}

/** 화면에서 쓰는 훅 */
export function useEntitlement(): Entitlement {
  const startedAt = useEntitlementStore((s) => s.startedAt);
  const isPremium = useEntitlementStore((s) => s.isPremium);
  return computeEntitlement(startedAt, isPremium);
}
