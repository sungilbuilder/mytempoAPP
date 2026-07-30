import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useOnboardingStore } from '../store/useOnboardingStore';

/**
 * 랜딩/온보딩 3장 스와이프 (WBS 1.7). 기획: product_design/landing-page-concept.md,
 * 목업: product_design/landing-page-demo.html, 라우팅: engineering/theme-toggle-and-landing-architecture-note.md
 *
 * 새 제스처 라이브러리 없이 ScrollView horizontal pagingEnabled로 구현(아키텍처 노트 권고).
 */
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Slide = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  footnote?: string;
};

const SLIDES: Slide[] = [
  {
    key: 'hero',
    eyebrow: '마이템포',
    title: '프로의 템포가 아니라,\n내 최고의 스윙의 템포',
    body: '누구나 자신만의 리듬이 있어요. 마이템포는 그 리듬을 찾고 반복 연습하도록 돕습니다.',
  },
  {
    key: 'save',
    eyebrow: '01. 저장',
    title: '내 인생 최고의 스윙\n한 번을 저장하세요',
    body: '백스윙과 다운스윙의 비율을 숫자(예: 3:1)로 남겨두면 언제든 그 감각을 다시 불러올 수 있어요.',
  },
  {
    key: 'practice',
    eyebrow: '02. 반복 연습',
    title: '그 리듬을 소리로\n반복 연습합니다',
    body: '비프음 템포에 맞춰 스윙하며 몸에 리듬을 새기세요.',
    footnote: '템포 여러 개 저장과 연습 히스토리는 추후 프리미엄 기능으로 제공될 예정이에요.',
  },
];

/** 슬라이드 2: 그린→골드로 채워지는 미니 템포 바 루프 애니메이션 */
function LoopingTempoBar() {
  const progress = useSharedValue(30);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(75, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, []);

  const style = useAnimatedStyle(() => ({ width: `${progress.value}%` }));

  return (
    <View className="w-full h-4 rounded-full overflow-hidden bg-surface2 dark:bg-surface2Dark flex-row">
      <Animated.View className="bg-green dark:bg-green-neon h-full" style={style} />
      <View className="bg-gold dark:bg-gold-neon h-full flex-1" />
    </View>
  );
}

/** 슬라이드 3: 비프 시각화 펄스 링 */
function PulseRing() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    scale.value = withRepeat(withTiming(1.6, { duration: 900, easing: Easing.out(Easing.ease) }), -1, false);
    opacity.value = withRepeat(withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) }), -1, false);
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View className="items-center justify-center w-24 h-24">
      <Animated.View
        className="absolute w-24 h-24 rounded-full bg-gold dark:bg-gold-neon"
        style={ringStyle}
      />
      <View className="w-16 h-16 rounded-full bg-gold dark:bg-gold-neon items-center justify-center">
        <Text className="text-onAccentDark text-xs font-nanum-bold">BEEP</Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const markOnboardingSeen = useOnboardingStore((s) => s.markOnboardingSeen);
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const finish = useCallback(() => {
    markOnboardingSeen();
    router.replace('/(tabs)');
  }, [markOnboardingSeen, router]);

  const goToIndex = useCallback((index: number) => {
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
    setActiveIndex(index);
  }, []);

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  }, []);

  const advanceOrFinish = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      goToIndex(activeIndex + 1);
    }
  }, [activeIndex, goToIndex]);

  return (
    <View className="flex-1 bg-bg dark:bg-bgDark">
      {/* 상단 스토리형 진행 바 */}
      <View className="flex-row gap-2 px-6 pt-6">
        {SLIDES.map((s, i) => (
          <View key={s.key} className="flex-1 h-1 rounded-full overflow-hidden bg-surface2 dark:bg-surface2Dark">
            <View
              className="h-full bg-green dark:bg-green-neon"
              style={{ width: i <= activeIndex ? '100%' : '0%' }}
            />
          </View>
        ))}
      </View>

      {/* 건너뛰기 */}
      <View className="flex-row justify-end px-6 pt-3">
        <Pressable onPress={finish} hitSlop={12}>
          <Text className="text-muted dark:text-mutedDark font-nanum-bold text-sm">건너뛰기</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        className="flex-1"
      >
        {SLIDES.map((slide, i) => (
          <Pressable
            key={slide.key}
            style={{ width: SCREEN_WIDTH }}
            className="flex-1 items-center justify-center px-8 gap-8"
            onPress={i < SLIDES.length - 1 ? advanceOrFinish : undefined}
          >
            {i === 0 && (
              <Image
                source={require('../assets/images/icon.png')}
                style={{ width: 88, height: 88, borderRadius: 20 }}
              />
            )}
            {i === 1 && <LoopingTempoBar />}
            {i === 2 && <PulseRing />}

            <View className="gap-3 items-center">
              <Text className="text-green dark:text-green-neon font-nanum-bold text-xs tracking-widest uppercase">
                {slide.eyebrow}
              </Text>
              <Text className="text-ink dark:text-inkDark text-2xl font-nanum-extrabold text-center leading-8">
                {slide.title}
              </Text>
              <Text className="text-muted dark:text-mutedDark text-center leading-5">{slide.body}</Text>
              {slide.footnote && (
                <Text className="text-disabled dark:text-disabledDark text-xs text-center mt-2">
                  {slide.footnote}
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* 하단 도트 인디케이터 (탭으로 이동 가능) */}
      <View className="flex-row justify-center gap-2 pb-4">
        {SLIDES.map((s, i) => (
          <Pressable key={s.key} onPress={() => goToIndex(i)} hitSlop={8}>
            <View
              className={`h-2 rounded-full ${
                i === activeIndex ? 'w-6 bg-green dark:bg-green-neon' : 'w-2 bg-line dark:bg-lineDark'
              }`}
            />
          </Pressable>
        ))}
      </View>

      <View className="px-8 pb-10">
        {activeIndex === SLIDES.length - 1 ? (
          <Pressable
            className="bg-green dark:bg-green-neon rounded-2xl py-4 items-center"
            onPress={finish}
          >
            <Text className="text-onAccent dark:text-onAccentDark font-nanum-extrabold text-base">
              무료로 시작하기
            </Text>
          </Pressable>
        ) : (
          <Pressable
            className="border border-line dark:border-lineDark rounded-2xl py-4 items-center"
            onPress={advanceOrFinish}
          >
            <Text className="text-ink dark:text-inkDark font-nanum-bold text-base">다음</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
