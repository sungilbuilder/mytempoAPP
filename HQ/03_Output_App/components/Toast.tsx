/**
 * 토스트 — 화면을 막지 않는 한 줄 알림 (2026-08-06 신설, AOS 리뷰 U-4)
 *
 * ## 왜 만들었나
 *
 * 10초 미만 연습은 기록되지 않는데 **아무 말도 하지 않고** 홈으로 갔다.
 * 사용자는 기록 화면에 가서야 그 사실을 안다. 스트릭이 걸린 습관 앱에서
 * "했는데 안 남았다"는 신뢰 문제다. 한 줄이면 해결되는 일이었다.
 *
 * ## 왜 Alert가 아니라 토스트인가
 *
 * `Alert.alert`는 확인을 강요한다. 여기서 전할 내용은 사용자가 무언가
 * 결정해야 하는 게 아니라 **왜 기록이 없는지에 대한 설명**이라, 흐름을
 * 끊지 않고 스쳐 지나가는 편이 맞다. Android `ToastAndroid`를 쓰지 않은 건
 * 시스템 토스트가 브랜드 색·글꼴을 따르지 않고 iOS에 없기 때문이다.
 *
 * 접근성: `accessibilityLiveRegion="polite"`로 TalkBack이 현재 읽던 것을
 * 끊지 않고 이어서 읽게 한다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Text, View } from 'react-native';
import { koreanWrap, textScaling } from './ui';

const VISIBLE_MS = 2600;
const FADE_MS = 180;

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(text);
    timer.current = setTimeout(() => setMessage(null), VISIBLE_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return { message, show };
}

export function Toast({ message }: { message: string | null }) {
  const opacity = useRef(new Animated.Value(0)).current;
  /**
   * 사라진 뒤에도 한 프레임 동안 텍스트를 유지해야 페이드아웃이 보인다.
   * message가 null이 되는 순간 언마운트하면 툭 끊긴다.
   */
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setShown(message);
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_MS,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShown(null);
    });
  }, [message, opacity]);

  if (!shown) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{ opacity, position: 'absolute', left: 24, right: 24, bottom: 96 }}
    >
      <View
        accessibilityLiveRegion={Platform.OS === 'android' ? 'polite' : undefined}
        accessible
        accessibilityLabel={shown}
        className="bg-surface2 dark:bg-surface2Dark border border-line dark:border-lineDark rounded-card px-s2 py-[12px]"
      >
        <Text
          {...koreanWrap}
          {...textScaling}
          className="font-kr-medium text-caption text-ink dark:text-inkDark text-center"
        >
          {shown}
        </Text>
      </View>
    </Animated.View>
  );
}
