/**
 * 렌더 추적 (개발 전용) — 2026-08-01 신설
 *
 * "Maximum update depth exceeded"를 세 번 고쳤는데도 재발해서, 추정을 멈추고
 * **실제로 무엇이 몇 번 렌더되는지** 측정하기로 했다.
 *
 * 사용법: 의심되는 컴포넌트 맨 위에 `useRenderTrace('이름')` 한 줄.
 * Metro 터미널에 렌더 횟수가 찍히고, 짧은 시간에 폭주하면 경고를 낸다.
 *
 * ⚠️ 원인을 찾은 뒤에는 호출부를 제거한다. 이 파일 자체는 남겨둬도 무해하다
 * (개발 빌드에서만 동작하고, 호출하지 않으면 아무 일도 하지 않는다).
 */
import { useRef } from 'react';

/** 이 횟수를 넘으면 폭주로 보고 경고한다. */
const BURST_LIMIT = 25;
/** 폭주 판정 시간 창(ms) */
const WINDOW_MS = 1000;

export function useRenderTrace(name: string, extra?: Record<string, unknown>) {
  const count = useRef(0);
  const windowStart = useRef(Date.now());
  const warned = useRef(false);

  if (!__DEV__) return;

  count.current += 1;
  const now = Date.now();

  // 시간 창이 지나면 카운터를 리셋한다 (정상적인 산발적 렌더는 무시)
  if (now - windowStart.current > WINDOW_MS) {
    windowStart.current = now;
    count.current = 1;
    warned.current = false;
  }

  const detail = extra ? ` ${JSON.stringify(extra)}` : '';

  if (count.current <= 5) {
    console.log(`[렌더추적] ${name} #${count.current}${detail}`);
  } else if (count.current === BURST_LIMIT && !warned.current) {
    warned.current = true;
    console.warn(
      `[렌더추적] 🔴 ${name} 이(가) 1초 안에 ${BURST_LIMIT}회 렌더됐습니다 — 여기가 루프의 진원지입니다.${detail}`,
    );
  }
}
