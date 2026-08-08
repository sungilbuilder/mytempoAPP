/**
 * 템포 링 — 마이템포의 시그니처 컴포넌트.
 *
 * 시안 근거: Premium.dc.html "SIGNATURE COMPONENT · TEMPO RING"
 *   링 하나에 백스윙(그린)·다운스윙(골드) 비율과 진행 점을 함께 담아
 *   홈·연습 화면에 반복 노출한다. 숫자 "3:1"만으로는 다른 메트로놈 앱과
 *   구별되지 않지만, 형태가 있는 링은 스크린샷 한 장으로도 브랜드를 식별하게 한다.
 *
 * 기하 구조(시안 원본 그대로):
 *   viewBox 0 0 100 100 / cx,cy = 50 / r = 42 / strokeWidth = 9
 *   둘레 = 2πr ≈ 263.9 → 골드가 링 전체, 그 위에 그린이 백스윙 비중만큼 덮는다.
 *   진행 점은 r=4.5 원이 링을 따라 돈다(회전은 SVG 내부가 아니라 래퍼 View를 돌린다 —
 *   reanimated x react-native-svg의 animatedProps 조합보다 이 쪽이 훨씬 덜 깨진다).
 */
import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { DEFAULT_SWING_SPEED } from '../features/tempo/swingSpeeds';
import { impactAtMs } from '../features/audio-engine/soundPacks';

const R = 42;
const CIRCUMFERENCE = 2 * Math.PI * R; // ≈ 263.9

/** 각도(0=정각 위, 시계방향 degree) → SVG 좌표(viewBox 0~100 기준) */
function pointOnRing(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { cx: 50 + R * Math.sin(rad), cy: 50 - R * Math.cos(rad) };
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * 히트 이펙트 — 링을 도는 점이 시작/탑/임팩트 지점에 "도착하는 순간" 파형처럼
 * 번지는 원 이펙트. (2026-08-08 신설, 사용자 요청 — 리듬 게임의 판정선 이펙트 참고)
 *
 * 위치는 고정(그 지점의 SVG 좌표)이고, `pulse`(0→1→0)만 애니메이션한다.
 * 반지름·투명도 둘 다 pulse에서 파생시켜 "점이 지나가며 링이 그 자리에서
 * 잠깐 크게 번쩍였다 사라지는" 느낌을 낸다.
 */
function HitRipple({
  pulse,
  cx,
  cy,
  color,
}: {
  pulse: SharedValue<number>;
  cx: number;
  cy: number;
  color: string;
}) {
  const animatedProps = useAnimatedProps(() => ({
    // 2026-08-08 (사용자 피드백 — "파장 효과 원이 너무 크다"): 최대 반지름을
    // 14 → 8.5로 줄였다. 링 두께(strokeWidth 9)보다 커지면 링 자체를 가려
    // 오히려 산만했다.
    r: 2.5 + pulse.value * 6,
    opacity: pulse.value,
  }));
  return (
    <AnimatedCircle
      cx={cx}
      cy={cy}
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      animatedProps={animatedProps}
    />
  );
}

export type TempoRingProps = {
  /** 백스윙:다운스윙 비율. 3:1이면 3 */
  ratio: number;
  /** 화면상 지름(px) */
  size?: number;
  /** 재생 중이면 진행 점이 링을 따라 돈다 */
  playing?: boolean;
  /**
   * 실제 스윙(백스윙 시작)이 시작될 때마다 바뀌는 값 — 보통 스윙 카운트를 그대로 넘긴다.
   *
   * 2026-08-08 신설(실기기 검증 — "2번째 스윙부터 원이 안 맞음"). 이전에는 링이
   * `cycleMs` 간격으로 스스로 반복 재생하는 **자체 타이머**였다. 이게 맞으려면
   * 실제 스윙 반복 주기가 항상 `cycleMs`(스윙 신호 자체의 루프 길이, ~2초)와
   * 같아야 하는데, "샷 사이클" 모드(어드레스 대기 + 카운트인 뒤 스윙, 간격
   * 15~40초)에서는 전혀 다르다. 그래서 첫 스윙 이후로는 링의 자체 루프가 실제
   * 오디오보다 훨씬 빨리 돌아 어드레스·대기 구간에도 계속 회전하고, 스윙마다
   * 어긋남이 누적됐다.
   *
   * 고친 방식은 자체 루프를 버리고, **실제 스윙 신호가 올 때만** 한 바퀴(길이는
   * `swingMs`) 돌게 한다. 신호가 오기 전(대기·카운트인)에는 그냥 멈춰 있는다 —
   * 별도 "정지" 계산이 필요 없다.
   */
  swingTick?: number;
  /** 스윙 자체(백스윙+다운스윙)의 시간(ms) — 이 시간에 걸쳐 링을 한 바퀴 돈다. */
  swingMs?: number;
  /** 링 색 */
  colors: {
    /** 백스윙 구간 */
    primary: string;
    /** 다운스윙 구간 */
    accent: string;
    /** 링 바닥(트랙) */
    track: string;
    /** 진행 점 */
    dot: string;
  };
  /** 링 가운데에 들어갈 내용(보통 "3:1" 숫자) */
  children?: React.ReactNode;
};

export function TempoRing({
  ratio,
  size = 220,
  playing = false,
  swingTick = 0,
  swingMs = impactAtMs(DEFAULT_SWING_SPEED),
  colors,
  children,
}: TempoRingProps) {
  const spin = useSharedValue(0);
  /* 히트 이펙트 3종 — 시작(원점) · 탑(백스윙→다운스윙 경계) · 임팩트(원점으로 복귀) */
  const startPulse = useSharedValue(0);
  const topPulse = useSharedValue(0);
  const impactPulse = useSharedValue(0);

  // 백스윙이 차지하는 비중. ratio가 이상치여도 링이 깨지지 않게 클램프한다.
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? Math.min(9, ratio) : 3;
  const backswingFraction = safeRatio / (safeRatio + 1);
  const backswingLen = CIRCUMFERENCE * backswingFraction;

  // 정지 상태에서는 스윙 신호를 기다리지 않는다 — 항상 맨 위(0도)로 되돌린다.
  useEffect(() => {
    if (playing) return;
    cancelAnimation(spin);
    spin.value = withTiming(0, { duration: 220 });
    cancelAnimation(startPulse);
    cancelAnimation(topPulse);
    cancelAnimation(impactPulse);
    startPulse.value = 0;
    topPulse.value = 0;
    impactPulse.value = 0;
  }, [playing, spin, startPulse, topPulse, impactPulse]);

  /*
    실제 스윙 신호(swingTick 변화)가 올 때만 한 바퀴 돈다. `playing`은 이 effect의
    의존성에 넣지 않는다 — 재생 버튼을 누른 순간(아직 대기·카운트인 중) 이 값만
    바뀌어도 링이 돌기 시작하면 첫 스윙 전부터 어긋나는 문제가 되살아난다.
    대신 ref로 최신 playing만 읽어 "정지 중에 신호가 와도 무시" 정도만 가드한다.
  */
  const playingRef = useRef(playing);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    if (!playingRef.current) return;
    const duration = Math.max(100, swingMs);

    spin.value = 0;
    spin.value = withTiming(360, { duration, easing: Easing.linear });

    /*
      히트 이펙트 3종을 링 회전과 같은 시간축에 맞춘다 (2026-08-08 신설).
      점이 그 지점을 "지나는" 시점에 파형이 번쩍이도록, 스핀 애니메이션과 동일한
      duration·기준 시각(swingTick 변화 순간 = t0)에서 delay만 다르게 준다.
        시작(0%)   → 즉시
        탑(경계)   → duration * backswingFraction 뒤
        임팩트(100%) → duration 뒤 (스핀이 한 바퀴 다 돈 시점과 정확히 겹친다)
    */
    const burst = () =>
      withSequence(withTiming(1, { duration: 90 }), withTiming(0, { duration: 260 }));

    startPulse.value = 0;
    startPulse.value = burst();

    topPulse.value = 0;
    topPulse.value = withDelay(duration * backswingFraction, burst());

    impactPulse.value = 0;
    impactPulse.value = withDelay(duration, burst());

    return () => {
      cancelAnimation(spin);
      cancelAnimation(startPulse);
      cancelAnimation(topPulse);
      cancelAnimation(impactPulse);
    };
  }, [swingTick, swingMs, backswingFraction, spin, startPulse, topPulse, impactPulse]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  const originPoint = pointOnRing(0);
  const topPoint = pointOnRing(backswingFraction * 360);

  return (
    <View style={{ width: size, height: size }}>
      {/* 링 본체 */}
      <Svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute' }}>
        {/* 바닥 트랙 */}
        <Circle cx="50" cy="50" r={R} fill="none" stroke={colors.track} strokeWidth={9} />
        {/* 다운스윙(골드) — 링 전체를 깔고 */}
        <Circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={colors.accent}
          strokeWidth={9}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          strokeDasharray={`${CIRCUMFERENCE}`}
        />
        {/* 백스윙(그린) — 그 위를 비율만큼 덮는다 */}
        <Circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={colors.primary}
          strokeWidth={9}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          strokeDasharray={`${backswingLen} ${CIRCUMFERENCE - backswingLen}`}
        />

        {/*
          히트 이펙트 — 시작/임팩트는 같은 자리(링 맨 위)에서 서로 다른 시점에
          번쩍이고, 탑은 백스윙:다운스윙 경계 지점에서 번쩍인다.
        */}
        <HitRipple
          pulse={startPulse}
          cx={originPoint.cx}
          cy={originPoint.cy}
          color={colors.primary}
        />
        <HitRipple pulse={topPulse} cx={topPoint.cx} cy={topPoint.cy} color={colors.dot} />
        <HitRipple
          pulse={impactPulse}
          cx={originPoint.cx}
          cy={originPoint.cy}
          color={colors.accent}
        />
      </Svg>

      {/* 진행 점 — 래퍼를 회전시킨다 */}
      <Animated.View style={[{ position: 'absolute', width: size, height: size }, dotStyle]}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx="50" cy="8" r="4.5" fill={colors.dot} />
        </Svg>
      </Animated.View>

      {/*
        가운데 내용 (2026-08-01 수정 — 링 안 숫자가 안 보이던 문제)

        이전에는 `flex: 1`로 남은 공간을 채우게 했는데, 형제인 SVG와 진행점이
        `position: absolute`라 레이아웃에서 빠지면서 이 View가 실제로는 높이를
        제대로 못 받는 경우가 있었다. 게다가 Android에서는 absolute 형제가
        나중 형제 위에 그려질 수 있어 숫자가 링 뒤로 가려지기도 한다.

        → 자신도 absolute로 부모를 꽉 채우고 `zIndex`로 확실히 맨 위에 올린다.
          (HTML 데모에서 링 중앙 정렬을 고칠 때 쓴 것과 같은 방식)
      */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default TempoRing;
