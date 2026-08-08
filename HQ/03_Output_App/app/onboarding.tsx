import { useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import Svg, { Circle, Path } from 'react-native-svg';
import { darkColors, lightColors, palette, type AppColors } from '../constants/theme';
import {
  Caption,
  MIN_TOUCH,
  koreanWrap,
  Logo,
  numeralScaling,
  textScaling,
} from '../components/ui';
import { TempoRing } from '../components/TempoRing';
import { playCue } from '../features/audio-engine/cues';
import { Metronome } from '../features/audio-engine/metronome';
import {
  FREE_SOUND_PACK,
  SHOT_INTERVALS,
  impactAtMs,
  loopAudio,
  type ShotIntervalSec,
} from '../features/audio-engine/soundPacks';
import { DEFAULT_SWING_SPEED } from '../features/tempo/swingSpeeds';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useSettingsStore } from '../store/useSettingsStore';

const SLIDE_COUNT = 4;

/** 3번째 장 템포 링 데모에서 쓰는 프리셋 — 실제 연습 화면과 같은 3:1 무료팩 루프. */
const DEMO_PRESET_ID = 'preset-3-1';

/**
 * 온보딩 — 4장 스와이프
 *
 * 근거: `mytempo-full-demo.html`의 온보딩 구조 + 2026-07-31 테마 선택 화면 추가.
 *
 * 핵심 원칙: **각 장이 서로 다른 시각 요소를 갖는다.**
 *   ① 골프공 배지 — "내 스윙"이라는 주체
 *   ② 가로 템포 바 — 비율(백스윙 그린 : 다운스윙 골드)이라는 개념 + 구간 라벨·숫자
 *   ③ 3:1 템포 링 — 앱의 시그니처 심볼을 그대로 써서 "소리가 반복된다"는 감각을 전달
 *      (2026-08-08: 의미 없이 오르내리기만 하던 펄스 링 데모를 실제 연습 화면과
 *      같은 컴포넌트로 교체 — 사용자 피드백)
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

/** 3:1 → 백스윙이 75%. 온보딩 데모용 고정값(실측 데이터 없이 개념만 보여준다) */
const DEMO_BACKSWING_FRACTION = 0.75;

/*
  ── ② 가로 템포 바 ──────────────────────────────
  2026-08-08 (사용자 요청): 색만 보고는 "이게 뭘 뜻하는지" 안 읽혔다. 링·바
  아래 화면(연습·결과)에서 쓰는 것과 같은 어휘(시작·탑·임팩트)로 구간에 라벨을
  달고, 비율 숫자(3:1)를 그 위에 크게 보여준다.
*/
function TempoBar({ primary, accent, track }: { primary: string; accent: string; track: string }) {
  return (
    <View className="w-full max-w-[220px] items-center gap-s2">
      <Text {...numeralScaling} className="font-display-bold text-h1 text-ink dark:text-inkDark">
        3 : 1
      </Text>

      <View
        className="w-full h-[16px] rounded-pill overflow-hidden flex-row"
        style={{ backgroundColor: track }}
      >
        <View
          style={{ flexBasis: `${DEMO_BACKSWING_FRACTION * 100}%`, backgroundColor: primary }}
        />
        <View style={{ flex: 1, backgroundColor: accent }} />
      </View>

      {/*
        구간 라벨 — 시작(0%) · 탑(백스윙:다운스윙 경계) · 임팩트(100%).
        "탑"은 바 위 경계 지점에 절대 위치로 맞춘다 — translateX로 대략 중앙 정렬
        (캡션 한 글자라 오차가 눈에 띄지 않는다).
      */}
      <View className="w-full" style={{ height: 18 }}>
        <View style={{ position: 'absolute', left: 0 }}>
          <Caption>백스윙 시작</Caption>
        </View>
        <View
          style={{
            position: 'absolute',
            left: `${DEMO_BACKSWING_FRACTION * 100}%`,
            transform: [{ translateX: -9 }],
          }}
        >
          <Caption>탑</Caption>
        </View>
        <View style={{ position: 'absolute', right: 0 }}>
          <Caption>임팩트</Caption>
        </View>
      </View>
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
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={`${label} 화면, ${hint}`}
      accessibilityState={{ checked: selected, selected }}
      className="flex-1 active:opacity-80"
    >
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
        <Text {...textScaling} className="font-kr-bold text-body text-ink dark:text-inkDark">
          {label}
        </Text>
      </View>
      {/* 2026-08-06: subtle → muted (AOS 리뷰 V-3). 테마 설명은 읽히라고 쓴 문장이다 */}
      <Text
        {...textScaling}
        className="text-caption text-muted dark:text-mutedDark text-center pt-[2px]"
      >
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
  const shotIntervalSec = useSettingsStore((s) => s.shotIntervalSec);
  const setShotInterval = useSettingsStore((s) => s.setShotInterval);
  const uiSounds = useSettingsStore((s) => s.uiSounds);
  const beepVolume = useSettingsStore((s) => s.beepVolume);
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  /* 2026-08-08: 모듈 로드 시 1회 캡처하던 Dimensions.get을 훅으로 교체 — 회전/폴더블 대응 */
  const { width } = useWindowDimensions();

  /**
   * 3번째 장의 템포 링 데모 — 실제 연습 화면과 같은 오디오 엔진을 그대로 쓴다.
   * (2026-08-08, 사용자 요청 — "링만 있고 소리가 없다. 소리도 같이 넣어야 한다")
   *
   * 이전엔 `setInterval`로 흉내만 냈다(오디오 없이 링만 돎). 이제 실제 3:1
   * 루프 오디오(연습 화면과 동일한 무료 나무팩)를 로드해 재생하고, 루프가
   * 한 바퀴 돌 때마다(`setOnCycle`) `swingTick`을 올려 링을 진짜 소리에 맞춰
   * 돌린다 — practice.tsx와 정확히 같은 연결 방식이다(features/audio-engine
   * /metronome.ts 참고).
   *
   * 부수 효과: 예전엔 "바퀴 사이 쉬는 시간"을 수동으로 만들어 임팩트·시작
   * 파장이 겹쳐 색이 마스킹되는 문제를 막았는데(2026-08-08 1차 수정), 이제는
   * 실제 루프 파일 자체에 대기 구간이 들어 있어서 그 문제도 자연히 해결된다.
   */
  const metronomeRef = useRef<Metronome | null>(null);
  const [demoTick, setDemoTick] = useState(0);
  useEffect(() => {
    if (page !== 2) return;
    let cancelled = false;
    const m = new Metronome();
    metronomeRef.current = m;

    (async () => {
      try {
        await m.configureAudioMode();
        if (cancelled) return;
        await m.load(loopAudio(DEMO_PRESET_ID, FREE_SOUND_PACK, DEFAULT_SWING_SPEED), beepVolume);
        if (cancelled) return;
        m.setOnCycle(() => setDemoTick((t) => t + 1));
        await m.play();
      } catch (e) {
        console.warn('[마이템포] 온보딩 링 데모 오디오 로드 실패', e);
      }
    })();

    return () => {
      cancelled = true;
      m.unload();
      metronomeRef.current = null;
    };
  }, [page, beepVolume]);

  function finish() {
    /*
      시그니처 사운드 (2026-08-06, T-24)

      앱 전체에서 **여기 한 곳에서만** 울린다. 켤 때마다 나면 소리가 자산이 아니라
      소음이 되고, 브랜드 사운드는 흔해지는 순간 값이 떨어진다.

      이 소리는 브랜드 심볼(링을 3:1로 나눈 Tempo Arc Mark)을 그대로 옮긴 것이다 —
      세 음의 시간 간격이 3:1이고, 마지막 음의 주파수가 첫 음의 정확히 3배다.
      게다가 리듬이 앞으로 수천 번 듣게 될 연습 루프와 같아서, 첫 인상과 제품 경험이
      같은 형태를 갖는다. → scripts/generate-sound-packs.py §2-③

      건너뛰기로 나가도 울린다 — 소개를 안 봐도 브랜드 첫인상은 남겨야 한다.
    */
    if (uiSounds) playCue('signature', beepVolume);
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
      /* 2026-08-08 문구 단순화 (사용자 테스트: 긴 설명은 안 읽힘) — 2줄 이내로 축약 */
      body: '누구나 자신만의 리듬이 있어요.\n마이템포가 그 리듬을 찾아드려요.',
      visualAbove: true,
      visual: <BallBadge color={c.primary} />,
    },
    {
      /* 2026-08-06 용어 통일: 스윙은 "등록"한다 (AOS 리뷰 B-2) */
      title: '내 인생 최고의 스윙\n한 번을 등록하세요',
      /* 2026-08-08 문구 단순화: 영상이 필요하다는 사실만 남기고 나머지는 뺐다 */
      body: '내 스윙 영상 하나면\n나만의 템포를 저장할 수 있어요.',
      visualAbove: false,
      visual: <TempoBar primary={c.primary} accent={c.accent} track={c.surface2} />,
    },
    {
      title: '그 리듬을 소리로\n반복 연습합니다',
      body: '소리에 맞춰 스윙하며\n몸에 익히세요.',
      visualAbove: false,
      /*
        2026-08-08 (사용자 피드백): 이전엔 골드 원 하나가 오르내리는 펄스 링
        데모였는데 "별 의미 없어 보인다"는 지적을 받았다. 앱에서 가장 핵심인
        심볼 — 연습·결과 화면과 동일한 3:1 템포 링 — 을 그대로 가져와, 이
        온보딩 장부터 실제 앱과 같은 형태를 각인시킨다.
      */
      visual: (
        <TempoRing
          ratio={3}
          size={130}
          playing={page === 2}
          swingTick={demoTick}
          swingMs={impactAtMs(DEFAULT_SWING_SPEED)}
          colors={{ primary: c.primary, accent: c.accent, track: c.surface2, dot: c.ink }}
        >
          <Text
            {...numeralScaling}
            className="font-display-bold text-h1 text-ink dark:text-inkDark"
          >
            3:1
          </Text>
        </TempoRing>
      ),
    },
    {
      title: '화면은 어떻게\n보여드릴까요',
      /* 2026-08-08 문구 단순화 — 설정 변경 안내는 아래 샷 간격 섹션과 겹쳐 뺐다 */
      body: '야간·실내에선 어둡게가 편해요.',
      visualAbove: false,
      visual: (
        <View className="w-full gap-s3">
          <View className="w-full gap-s2">
            {/*
              2026-08-08 (사용자 요청): "폰 설정을 따를게요" 버튼을 온보딩에서 뺐다.
              밝게/어둡게 둘 중 하나만 고르게 하고, 자동(폰 설정 따라가기)은
              설정(settings.tsx의 "테마" 세그먼트) 쪽에서만 고를 수 있게 한다 —
              온보딩은 첫인상 화면이라 선택지를 최소화하는 쪽이 낫다는 판단.
            */}
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
          </View>

          {/*
            샷 간격 (2026-08-08 신설, 사용자 테스트 피드백).
            설정에 묻어두면 대부분 안 바꾸는 건 테마와 같은 문제라 온보딩에 올렸다.
            단, 여기선 프리미엄 잠금 표시를 하지 않는다 — 첫 화면에서 유료화를
            언급하지 않는다는 원칙(위 CTA 주석 참고)을 그대로 따른다.
          */}
          <View className="w-full gap-[8px]">
            <Text
              {...textScaling}
              className="font-kr-bold text-caption text-muted dark:text-mutedDark text-center"
            >
              샷 간격 — 스윙 사이 쉬는 시간
            </Text>
            <View className="flex-row gap-[8px]">
              {SHOT_INTERVALS.map((d) => {
                const selected = shotIntervalSec === d.value;
                return (
                  <Pressable
                    key={d.value}
                    onPress={() => setShotInterval(d.value as ShotIntervalSec)}
                    accessibilityRole="radio"
                    accessibilityLabel={`${d.label}, ${d.hint}`}
                    accessibilityState={{ checked: selected, selected }}
                    style={{ minHeight: MIN_TOUCH }}
                    className="flex-1 items-center justify-center rounded-card active:opacity-80"
                  >
                    <View
                      className="w-full items-center justify-center rounded-card py-[10px]"
                      style={{
                        backgroundColor: selected ? c.primary : c.surface2,
                      }}
                    >
                      <Text
                        {...textScaling}
                        className="font-kr-bold text-caption"
                        style={{ color: selected ? c.onPrimary : c.ink }}
                      >
                        {d.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
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
        <Pressable
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel="소개 건너뛰기"
          hitSlop={14}
          style={{ minHeight: MIN_TOUCH, minWidth: 48 }}
          className="items-end justify-center"
        >
          <Text
            {...textScaling}
            className="font-kr-bold text-caption text-muted dark:text-mutedDark"
          >
            건너뛰기
          </Text>
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

              <Text
                {...textScaling}
                accessibilityRole="header"
                className="font-kr-black text-h1 text-ink dark:text-inkDark text-center leading-[40px]"
              >
                {slide.title}
              </Text>
              <Text
                {...koreanWrap}
                {...textScaling}
                className="text-body text-muted dark:text-mutedDark text-center"
              >
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
                    accessibilityRole="button"
                    accessibilityLabel="시작하기"
                    style={{ backgroundColor: c.primary, minHeight: MIN_TOUCH }}
                    className="rounded-card py-s2 items-center justify-center active:opacity-85"
                  >
                    <Text
                      {...textScaling}
                      className="font-kr-bold text-body"
                      style={{ color: c.onPrimary }}
                    >
                      시작하기
                    </Text>
                  </Pressable>
                  {/*
                    ⚠️ 2026-08-06 삭제 (AOS 리뷰 P-1 · B-1)

                    여기 있던 문구: "템포 여러 개 저장과 연습 히스토리는 추후
                    프리미엄 기능으로 제공될 예정이에요"

                    [[v1.0-출시사양]]의 무료 티어는 **"내 스윙 무제한 저장 · 최근 7일
                    히스토리"**다. 스윙 저장은 영구 무료로 확정돼 있다. 즉 앱의
                    **첫 실행 화면에서 사실과 다른 유료화 예고**를 하고 있었고,
                    그것도 무료로 열기로 정한 기능을 대상으로 했다.

                    세 가지가 동시에 깨졌다 — 사용자 신뢰(첫 화면 약속이 뒤집히면
                    좋은 방향이어도 "말 바뀌는 앱"이다), [[브랜드-가이드]]의 "과장 금지",
                    SSOT-코드 일치.

                    CTA도 "무료로 시작하기" → "시작하기"로 바꿨다. 무료를 앞세우면
                    "언젠가 유료"라는 예고가 되어 같은 문제를 반쯤 남긴다.
                    유료 안내가 필요한 자리는 여기가 아니라 **체험이 끝나는 시점**이다
                    (역방향 체험 — store/useEntitlementStore.ts).
                  */}
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/*
          탭하면 다음 장 — 스와이프를 모르는 사용자를 위한 보조 조작.
          2026-08-08: 이전엔 좌/우 26% 폭짜리 투명 영역만 있어서, 사람들이 실제로
          탭하는 화면 중앙(제목·본문 위)은 반응이 없었다("터치 안 됨"으로 느껴짐).
          전체 폭을 탭 영역으로 넓힌다. 뒤로 가기는 아래 점 인디케이터로 충분하다.
          마지막 장에서는 테마·샷간격 카드를 눌러야 하므로 탭 영역을 걷어낸다.
        */}
        {!isLast && (
          <Pressable
            onPress={() => goTo(page + 1)}
            accessibilityRole="button"
            accessibilityLabel="다음 소개"
            className="absolute left-0 right-0 top-[60px] bottom-[120px]"
          />
        )}
      </View>

      {/*
        하단 도트
        2026-08-06 (AOS 리뷰 A-4): 7px + hitSlop 10 = 27dp였다. 도트는 스와이프·탭
        영역이라는 보조 수단이 따로 있어 덜 급하지만, 실제 터치 영역만 48dp로 넓힌다.
        보이는 크기는 그대로 두고 투명 여백만 키우는 방식이라 디자인은 바뀌지 않는다.
      */}
      <View className="flex-row justify-center pb-s3">
        {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
          <Pressable
            key={i}
            onPress={() => goTo(i)}
            accessibilityRole="button"
            accessibilityLabel={`${SLIDE_COUNT}장 중 ${i + 1}번째 소개로 이동`}
            accessibilityState={{ selected: i === page }}
            style={{ width: MIN_TOUCH, height: MIN_TOUCH }}
            className="items-center justify-center"
          >
            <View
              className="h-[7px] rounded-pill"
              style={{
                width: i === page ? 20 : 7,
                backgroundColor: i === page ? c.primary : c.line,
              }}
            />
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
