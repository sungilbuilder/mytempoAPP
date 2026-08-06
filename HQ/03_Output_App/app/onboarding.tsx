import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { darkColors, lightColors, palette, type AppColors } from '../constants/theme';
import { koreanWrap, Logo } from '../components/ui';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useSettingsStore } from '../store/useSettingsStore';

const { width } = Dimensions.get('window');
const SLIDE_COUNT = 4;

/**
 * 온보딩 — 4장 스와이프
 *
 * 근거: `mytempo-full-demo.html`의 온보딩 구조 + 2026-07-31 테마 선택 화면 추가.
 *
 * 핵심 원칙: **각 장이 서로 다른 시각 요소를 갖는다.**
 *   ① 골프공 배지 — "내 스윙"이라는 주체
 *   ② 가로 템포 바 — 비율(백스윙 그린 : 다운스윙 골드)이라는 개념
 *   ③ 퍼져나가는 펄스 링 — 소리가 반복된다는 감각
 *   ④ 테마 미리보기 카드 — 첫 실행에서 화면 밝기를 직접 고르게 함
 *
 * ④를 온보딩에 둔 이유: 이 앱은 야간 연습장·실내 스크린에서 쓰는 경우가 많아
 * 첫 화면부터 눈부심 여부가 사용성에 직결된다. 설정에 묻어두면 대부분 안 바꾼다.
 */

/* ── ① 골프공 배지 ─────────────────────────────── */
function BallBadge({ color }: { color: string }) {
  return (
    <View
      className="w-[74px] h-[74px] rounded-lg items-center justify-center"
      style={{ backgroundColor: color }}
    >
      <Svg width={42} height={42} viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="9" fill="#F7F1E0" />
        {[
          [10, 9],
          [14, 9],
          [12, 12],
          [10, 15],
          [14, 15],
        ].map(([cx, cy], i) => (
          <Circle key={i} cx={cx} cy={cy} r="1" fill={color} />
        ))}
      </Svg>
    </View>
  );
}

/* ── ② 가로 템포 바 ────────────────────────────── */
function TempoBar({ primary, accent, track }: { primary: string; accent: string; track: string }) {
  return (
    <View
      className="w-full max-w-[220px] h-[16px] rounded-pill overflow-hidden flex-row"
      style={{ backgroundColor: track }}
    >
      {/* 3:1 → 백스윙이 75% */}
      <View style={{ flexBasis: '75%', backgroundColor: primary }} />
      <View style={{ flex: 1, backgroundColor: accent }} />
    </View>
  );
}

/* ── ③ 퍼져나가는 펄스 링 ──────────────────────── */
function PulseRing({ delay, color, active }: { delay: number; color: string; active: boolean }) {
  const p = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(p);
      p.value = 0;
      return;
    }
    p.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }), -1, false)
    );
    return () => cancelAnimation(p);
  }, [active, delay, p]);

  const style = useAnimatedStyle(() => ({
    width: 56 + p.value * 84,
    height: 56 + p.value * 84,
    opacity: 0.9 * (1 - p.value),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', borderRadius: 999, borderWidth: 2, borderColor: color }, style]}
    />
  );
}

function PulseRings({ accent, active }: { accent: string; active: boolean }) {
  return (
    <View className="w-[130px] h-[130px] items-center justify-center">
      <PulseRing delay={0} color={accent} active={active} />
      <PulseRing delay={800} color={accent} active={active} />
      <PulseRing delay={1600} color={accent} active={active} />
      <View className="w-[52px] h-[52px] rounded-pill" style={{ backgroundColor: accent }} />
    </View>
  );
}

/* ── ④ 테마 선택 ───────────────────────────────── */

/** 해당 테마가 실제로 어떻게 보이는지 축소해 보여주는 미리보기 */
function ThemePreview({ c }: { c: AppColors }) {
  return (
    <View
      className="w-full h-[104px] rounded-card p-[10px] justify-between"
      style={{ backgroundColor: c.bg }}
    >
      {/* 미니 카드 — 링 + 텍스트 라인 */}
      <View
        className="flex-row items-center gap-[8px] rounded-[10px] p-[8px]"
        style={{ backgroundColor: c.surface }}
      >
        <Svg width={26} height={26} viewBox="0 0 100 100">
          <Circle cx="50" cy="50" r="40" fill="none" stroke={c.track} strokeWidth={13} />
          <Circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={c.accent}
            strokeWidth={13}
            transform="rotate(-90 50 50)"
            strokeDasharray="251"
          />
          <Circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={c.primary}
            strokeWidth={13}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            strokeDasharray="188 63"
          />
        </Svg>
        <View className="flex-1 gap-[4px]">
          <View className="h-[6px] w-[70%] rounded-pill" style={{ backgroundColor: c.ink }} />
          <View className="h-[5px] w-[45%] rounded-pill" style={{ backgroundColor: c.muted }} />
        </View>
      </View>

      {/* 미니 버튼 */}
      <View className="h-[22px] rounded-[8px]" style={{ backgroundColor: c.accent }} />
    </View>
  );
}

/** 선택 표시 — 테마 카드와 "폰 설정 따르기" 양쪽에서 함께 쓴다 */
function CheckDot({ color }: { color: string }) {
  return (
    <View
      className="w-[16px] h-[16px] rounded-pill items-center justify-center"
      style={{ backgroundColor: color }}
    >
      <Svg width={10} height={10} viewBox="0 0 24 24">
        <Path
          d="M5 12.5l4.5 4.5L19 7"
          stroke="#FFFFFF"
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

function ThemeOption({
  label,
  hint,
  colors,
  selected,
  accent,
  onPress,
}: {
  label: string;
  hint: string;
  colors: AppColors;
  selected: boolean;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-1 active:opacity-80">
      <View
        className="rounded-lg p-[6px]"
        style={{
          borderWidth: 2,
          borderColor: selected ? accent : 'transparent',
        }}
      >
        <ThemePreview c={colors} />
      </View>
      <View className="flex-row items-center justify-center gap-[5px] pt-[8px]">
        {selected && <CheckDot color={accent} />}
        <Text className="font-kr-bold text-body text-ink dark:text-inkDark">{label}</Text>
      </View>
      <Text className="text-caption text-subtle dark:text-subtleDark text-center pt-[2px]">
        {hint}
      </Text>
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = palette(colorScheme);
  const markSeen = useOnboardingStore((s) => s.markOnboardingSeen);
  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  function finish() {
    markSeen();
    router.replace('/(tabs)');
  }

  function goTo(next: number) {
    const p = Math.min(SLIDE_COUNT - 1, Math.max(0, next));
    scrollRef.current?.scrollTo({ x: width * p, animated: true });
    setPage(p);
  }

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) setPage(p);
  }

  const SLIDES = [
    {
      title: '프로의 템포가 아니라,\n내 최고의 스윙의 템포',
      body: '누구나 자신만의 리듬이 있어요.\n마이템포는 그 리듬을 찾고 반복 연습하도록 돕습니다.',
      visualAbove: true,
      visual: <BallBadge color={c.primary} />,
    },
    {
      title: '내 인생 최고의 스윙\n한 번을 저장하세요',
      /*
        2026-07-31 문구 수정 2건.
        ① "스윙 영상만 있으면"을 추가했다 — 이전엔 영상이 필요하다는 사실을 마킹 화면에
           들어가서야 알게 돼서, 준비 없이 진입한 사용자가 그 자리에서 이탈했다.
        ② "숫자(예: 3:1)로" → "비율로" — 30fps 영상은 결과가 "약 3:1"로 나오는데
           온보딩이 정확한 숫자를 약속하면 기대와 결과가 어긋난다.
      */
      body: '스윙 영상만 있으면 백스윙과 다운스윙의 비율로 남겨둘 수 있어요.\n언제든 그 감각을 다시 불러올 수 있습니다.',
      visualAbove: false,
      visual: <TempoBar primary={c.primary} accent={c.accent} track={c.surface2} />,
    },
    {
      title: '그 리듬을 소리로\n반복 연습합니다',
      body: '소리에 맞춰 스윙하며\n몸에 리듬을 새기세요.',
      visualAbove: false,
      visual: <PulseRings accent={c.accent} active={page === 2} />,
    },
    {
      title: '화면은 어떻게\n보여드릴까요',
      body: '야간 연습장이나 실내 스크린에서는 어둡게가 눈이 편해요.\n나중에 설정에서 언제든 바꿀 수 있습니다.',
      visualAbove: false,
      visual: (
        <View className="w-full gap-s2">
          <View className="flex-row gap-[12px]">
            <ThemeOption
              label="밝게"
              hint="낮·실외 연습장"
              colors={lightColors}
              selected={themeMode === 'light'}
              accent={c.primary}
              onPress={() => setThemeMode('light')}
            />
            <ThemeOption
              label="어둡게"
              hint="야간·실내 스크린"
              colors={darkColors as unknown as AppColors}
              selected={themeMode === 'dark'}
              accent={c.primary}
              onPress={() => setThemeMode('dark')}
            />
          </View>

          <Pressable
            onPress={() => setThemeMode('auto')}
            className="flex-row items-center justify-center gap-[7px] rounded-card py-s2 active:opacity-80"
            style={{
              backgroundColor: c.surface,
              borderWidth: themeMode === 'auto' ? 2 : 1,
              borderColor: themeMode === 'auto' ? c.primary : c.line,
            }}
          >
            {themeMode === 'auto' && <CheckDot color={c.primary} />}
            <Text className="font-kr-medium text-body text-ink dark:text-inkDark">
              폰 설정을 따를게요
            </Text>
          </Pressable>
        </View>
      ),
    },
  ];

  const isLast = page === SLIDE_COUNT - 1;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bgDark" edges={['top', 'bottom']}>
      {/* 상단 진행 바 */}
      <View className="flex-row gap-[6px] px-s3 pt-s1">
        {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
          <View
            key={i}
            className="flex-1 h-[4px] rounded-pill overflow-hidden"
            style={{ backgroundColor: c.line }}
          >
            <View
              className="h-full rounded-pill"
              style={{ width: i <= page ? '100%' : '0%', backgroundColor: c.primary }}
            />
          </View>
        ))}
      </View>

      {/*
        로고 + 건너뛰기
        2026-07-31 브랜드 리뉴얼: 앱 아이콘 PNG를 그대로 쓰던 것을 벡터 로크업(Logo)으로 교체.
        창업자 전략 — 앱 아이콘은 심볼만 단순하게, 앱 내부에서는 워드마크를 적극 노출한다.
        PNG 대신 벡터를 쓰는 이유: 배경 사각형이 없어 화면 배경과 자연스럽게 붙고,
        라이트/다크 테마에 따라 색이 자동으로 따라간다.
      */}
      <View className="flex-row items-center justify-between px-s3 pt-s2">
        <Logo size={22} color={c.primary} accentColor={c.accent} />
        <Pressable onPress={finish} hitSlop={14}>
          <Text className="font-kr-bold text-caption text-muted dark:text-mutedDark">건너뛰기</Text>
        </Pressable>
      </View>

      <View className="flex-1">
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
        >
          {SLIDES.map((slide, i) => (
            <View key={i} style={{ width }} className="justify-center px-s6 gap-s3">
              {slide.visualAbove && <View className="items-center">{slide.visual}</View>}

              <Text className="font-kr-black text-h1 text-ink dark:text-inkDark text-center leading-[32px]">
                {slide.title}
              </Text>
              <Text className="text-body text-muted dark:text-mutedDark text-center">
                {slide.body}
              </Text>

              {!slide.visualAbove && (
                <View className="pt-s1 w-full items-center">{slide.visual}</View>
              )}

              {/* CTA는 마지막 장에만 */}
              {i === SLIDE_COUNT - 1 && (
                <View className="w-full pt-s2">
                  <Pressable
                    onPress={finish}
                    className="rounded-card py-s2 items-center active:opacity-85"
                    style={{ backgroundColor: c.primary }}
                  >
                    <Text
                      className="font-kr-bold text-body"
                      style={{ color: colorScheme === 'dark' ? c.onPrimary : '#FFFFFF' }}
                    >
                      무료로 시작하기
                    </Text>
                  </Pressable>
                  <Text {...koreanWrap} className="text-caption text-subtle dark:text-subtleDark text-center pt-s2 leading-[17px]">
                    템포 여러 개 저장과 연습 히스토리는{'\n'}추후 프리미엄 기능으로 제공될 예정이에요
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/*
          좌/우 탭 영역 — 스와이프를 모르는 사용자를 위한 보조 조작.
          마지막 장에서는 테마 카드를 눌러야 하므로 탭 영역을 걷어낸다.
        */}
        {!isLast && (
          <>
            <Pressable
              onPress={() => goTo(page - 1)}
              className="absolute left-0 top-[60px] bottom-[120px] w-[26%]"
            />
            <Pressable
              onPress={() => goTo(page + 1)}
              className="absolute right-0 top-[60px] bottom-[120px] w-[26%]"
            />
          </>
        )}
      </View>

      {/* 하단 도트 */}
      <View className="flex-row justify-center gap-[8px] pb-s3">
        {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
          <Pressable
            key={i}
            onPress={() => goTo(i)}
            hitSlop={10}
            className="h-[7px] rounded-pill"
            style={{
              width: i === page ? 20 : 7,
              backgroundColor: i === page ? c.primary : c.line,
            }}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
