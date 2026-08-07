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
import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { DEFAULT_SWING_SPEED } from '../features/tempo/swingSpeeds';
import { cycleMs as audioCycleMs } from '../features/audio-engine/soundPacks';

const R = 42;
const CIRCUMFERENCE = 2 * Math.PI * R; // ≈ 263.9

export type TempoRingProps = {
  /** 백스윙:다운스윙 비율. 3:1이면 3 */
  ratio: number;
  /** 화면상 지름(px) */
  size?: number;
  /** 재생 중이면 진행 점이 링을 따라 돈다 */
  playing?: boolean;
  /**
   * 한 사이클 시간(ms).
   *
   * ⚠️ 기본값은 오디오 루프 길이를 그대로 쓴다 (2026-08-06, AOS 리뷰 V-4).
   * 이전 기본값 2600은 2026-08-01에 오디오를 2.0초로 재생성하면서 놓친 값이었다.
   * 당시엔 `practice.tsx`만 `playing`을 넘겨서 드러나지 않았지만, 홈 링에
   * 애니메이션을 켜는 순간 **진행 점이 소리보다 30% 느리게 도는** 버그가 됐을 값이다.
   * 숫자를 여기 다시 적지 말고 항상 오디오 쪽 함수를 가져다 쓸 것.
   *
   * ⚠️ 2026-08-07: `rate` prop이 사라졌다. 배속 재생을 없애면서 루프 길이 자체가
   * 속도별로 달라졌기 때문이다 — 호출부가 `cycleMs(속도)`를 그대로 넘긴다.
   * 기본값도 상수가 아니라 기본 속도의 루프 길이다.
   */
  cycleMs?: number;
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
  cycleMs = audioCycleMs(DEFAULT_SWING_SPEED),
  colors,
  children,
}: TempoRingProps) {
  const spin = useSharedValue(0);

  useEffect(() => {
    if (playing) {
      const duration = Math.max(300, cycleMs);
      spin.value = 0;
      spin.value = withRepeat(
        withTiming(360, { duration, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(spin);
      spin.value = withTiming(0, { duration: 220 });
    }
    return () => cancelAnimation(spin);
  }, [playing, cycleMs, spin]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }],
  }));

  // 백스윙이 차지하는 둘레 길이. ratio가 이상치여도 링이 깨지지 않게 클램프한다.
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? Math.min(9, ratio) : 3;
  const backswingLen = CIRCUMFERENCE * (safeRatio / (safeRatio + 1));

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
