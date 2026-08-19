import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRenderTrace } from '../../features/debug/useRenderTrace';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { palette } from '../../constants/theme';
import { TempoRing } from '../../components/TempoRing';
import {
  Caption,
  IconBars,
  IconButton,
  IconPlay,
  IconSettings,
  IconTarget,
  Logo,
  MIN_TOUCH,
  koreanWrap,
  numeralScaling,
  textScaling,
} from '../../components/ui';
import { useActiveTempo } from '../../features/tempo/useActiveTempo';
import { formatRatio } from '../../features/tempo/character';
import { useHistoryStore, summarize } from '../../store/useHistoryStore';
import { useEntitlement, useEntitlementStore } from '../../store/useEntitlementStore';

/**
 * 홈 — "오늘 연습할까요"
 *
 * 시안 근거: Premium "홈" / App UI ① 홈
 *   왜: 앱을 켜자마자 "무엇을 눌러야 하는지" 1개(이어서 연습)만 강조.
 *   재방문 시 재생까지 걸리는 시간이 짧을수록 3일 리텐션이 오른다는 판단.
 *
 * 골드(accent)는 화면당 최대 1곳 규칙에 따라 [바로 연습 시작] 버튼에만 쓴다.
 */
export default function HomeScreen() {
  useRenderTrace('HomeScreen');
  const { t } = useTranslation(['home', 'common', 'domain']);
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = palette(colorScheme);
  const tempo = useActiveTempo();
  const sessions = useHistoryStore((s) => s.sessions);
  const summary = summarize(sessions);

  /**
   * 역방향 체험 시작점 기록 (2026-08-06).
   *
   * 홈은 앱을 켤 때 반드시 지나는 화면이라 여기서 한 번 찍는다.
   * 온보딩에 두지 않은 이유: 온보딩은 건너뛸 수 있고 "다시 보기"로 재진입도 된다.
   * `startTrialIfNeeded`는 이미 값이 있으면 아무 일도 하지 않는다.
   */
  const startTrialIfNeeded = useEntitlementStore((s) => s.startTrialIfNeeded);
  useEffect(() => {
    startTrialIfNeeded();
  }, [startTrialIfNeeded]);
  const { trialActive, trialDaysLeft, isPremium } = useEntitlement();

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bgDark" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/*
          헤더
          2026-07-31 브랜드 리뉴얼: "오늘"이라는 무의미한 캡션 자리에 워드마크를 넣었다.
          창업자 전략 — 앱 아이콘은 심볼만 쓰는 대신, 앱 안에서는 워드마크를 적극 노출해
          브랜드를 각인시킨다. 홈은 재방문 시 가장 먼저 보는 화면이라 노출 가치가 가장 크다.
        */}
        <View className="flex-row items-center justify-between pb-s3">
          <View className="gap-[6px]">
            <Logo size={18} color={c.primary} accentColor={c.accent} />
            <Text
              {...textScaling}
              accessibilityRole="header"
              className="font-kr-bold text-h1 text-ink dark:text-inkDark"
            >
              {t('home:greeting')}
            </Text>
          </View>
          <View className="flex-row items-center gap-[4px]">
            <IconButton label={t('home:settingsA11y')} onPress={() => router.push('/settings')}>
              <IconSettings color={c.muted} />
            </IconButton>
          </View>
        </View>

        {/*
          이 화면의 유일한 주 액션.

          2026-08-06 (AOS 리뷰 P-4): 처음 켠 사용자에게도 "이어서 연습"이라고
          말하고 있었다. `useActiveTempo()`가 고른 적이 없으면 조용히 첫 프리셋을
          돌려주기 때문이다. 이어갈 게 없는데 이어서 하라고 하면 홈의 첫인상이
          어긋난다. 이제 고른 적이 있을 때만 "이어서"라고 말한다.
        */}
        <View className="bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-lg p-s2 items-center">
          <Text
            {...textScaling}
            className="font-kr-medium text-caption text-muted dark:text-mutedDark self-start"
          >
            {tempo.hasHistory ? t('home:resumeLabel') : t('home:startLabel')}
          </Text>
          <Text
            {...koreanWrap}
            {...textScaling}
            className="font-kr-medium text-caption text-muted dark:text-mutedDark self-start pt-[2px]"
          >
            {tempo.hasHistory ? tempo.sublabel : t('home:startSublabel')}
          </Text>

          <View className="py-s2">
            <TempoRing
              ratio={tempo.ratio}
              size={168}
              colors={{
                primary: c.primary,
                accent: c.accent,
                track: c.track,
                dot: c.ink,
              }}
            >
              {/*
                2026-08-01: 링 안 숫자가 안 보인다는 제보 → 색을 className의 `dark:`
                variant가 아니라 **팔레트에서 직접** 지정한다.
                링의 SVG 색(c.primary 등)은 이미 JS 팔레트로 그리고 있어서, 텍스트만
                className에 의존하면 둘이 어긋날 때 배경과 같은 색이 되어 사라진다.
                한 화면 안에서 색의 출처를 하나로 통일하는 편이 안전하다.
              */}
              <Text
                {...numeralScaling}
                accessibilityLabel={t('home:ratioA11y', {
                  ratio: formatRatio(tempo.ratio),
                  label: tempo.label,
                })}
                className="font-display-bold text-[38px]"
                style={{ color: c.ink }}
              >
                {formatRatio(tempo.ratio)}
              </Text>
              {/* 2026-08-06: subtle(1.66:1 on surface) → muted (AOS 리뷰 V-3) */}
              <Text
                {...textScaling}
                className="font-kr-medium text-caption pt-[2px]"
                style={{ color: c.muted }}
              >
                {tempo.label}
              </Text>
            </TempoRing>
          </View>

          {/*
            2026-08-06 (AOS 리뷰 V-1): 골드 위 텍스트를 흰색에서 `onAccent`로.
            라이트 모드 대비 1.93:1 → 8.61:1. 앱의 유일한 주 액션이고
            야외 연습장에서 쓰는 버튼이라 실사용 조건은 계산값보다 나쁘다.
          */}
          <Pressable
            onPress={() => router.push('/practice')}
            accessibilityRole="button"
            accessibilityLabel={t('home:startPracticeA11y')}
            accessibilityHint={t('home:startPracticeHintA11y', { label: tempo.label })}
            style={{ minHeight: MIN_TOUCH }}
            className="w-full flex-row items-center justify-center gap-[8px] bg-accent dark:bg-accent-neon rounded-card py-s2 active:opacity-85"
          >
            <IconPlay color={c.onAccent} size={20} />
            <Text {...textScaling} className="font-kr-bold text-body" style={{ color: c.onAccent }}>
              {t('home:startPractice')}
            </Text>
          </Pressable>
        </View>

        {/* 보조 액션 2개 */}
        <View className="flex-row gap-[12px] pt-s2">
          <Pressable
            onPress={() => router.push('/marking')}
            accessibilityRole="button"
            accessibilityLabel={t('home:registerSwingA11y')}
            accessibilityHint={t('home:registerSwingHintA11y')}
            className="flex-1 bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-card px-s2 py-[10px] gap-[4px] active:opacity-80"
          >
            <IconTarget color={c.primary} size={20} />
            <Text {...textScaling} className="font-kr-bold text-body text-ink dark:text-inkDark">
              {t('home:registerSwing')}
            </Text>
            {/* 2026-07-31 문구 수정: "3곳 탭"은 실제 조작(드래그+프레임버튼)과 다르고,
                검토 끝에 폐기한 "탭 투 템포" 방식을 연상시켜 혼란을 준다. */}
            <Caption>{t('home:registerSwingCaption')}</Caption>
          </Pressable>

          <Pressable
            onPress={() => router.push('/presets')}
            accessibilityRole="button"
            accessibilityLabel={t('home:changeTempoA11y')}
            accessibilityHint={t('home:changeTempoHintA11y')}
            className="flex-1 bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-card px-s2 py-[10px] gap-[4px] active:opacity-80"
          >
            <IconBars color={c.primary} size={20} />
            <Text {...textScaling} className="font-kr-bold text-body text-ink dark:text-inkDark">
              {t('home:changeTempo')}
            </Text>
            <Caption>{t('home:changeTempoCaption')}</Caption>
          </Pressable>
        </View>

        {/*
          이번 주 요약 — 숫자보다 "며칠 했는지"가 먼저.

          2026-08-06 (AOS 리뷰 P-6): 스윙 수를 함께 보여준다. NSM의 단위가
          스윙 횟수인데 화면은 분(minutes)만 말하고 있어서, **지표와 화면이 다른 것을
          세고 있었다.** 분은 여전히 유용하니 지우지 않고 나란히 둔다.
        */}
        <Pressable
          onPress={() => router.push('/(tabs)/history')}
          accessibilityRole="button"
          accessibilityLabel={t('home:weekSummaryA11y', {
            days: summary.weekDays,
            swings: summary.weekSwings,
          })}
          style={{ minHeight: MIN_TOUCH }}
          className="flex-row items-center justify-between bg-surface2 dark:bg-surface2Dark rounded-card px-s2 py-[10px] mt-s2 active:opacity-80"
        >
          <Caption>{t('home:weekCaption')}</Caption>
          <View className="flex-row items-baseline gap-[6px]">
            <Text
              {...numeralScaling}
              className="font-display-bold text-h1 text-ink dark:text-inkDark"
            >
              {t('home:weekDays', { days: summary.weekDays })}
            </Text>
            {summary.weekSwings > 0 && (
              <Text
                {...numeralScaling}
                className="font-kr-medium text-caption text-muted dark:text-mutedDark"
              >
                {t('home:weekSwings', { swings: summary.weekSwings })}
              </Text>
            )}
            {summary.weekMinutes > 0 && (
              <Text
                {...numeralScaling}
                className="font-kr-medium text-caption text-muted dark:text-mutedDark"
              >
                {t('home:weekMinutes', { minutes: summary.weekMinutes })}
              </Text>
            )}
          </View>
        </Pressable>

        {/*
          체험 안내 (2026-08-06, 역방향 체험)

          ⚠️ 온보딩에서 유료 예고를 삭제한 자리를 여기가 대신한다. 차이는
          **말하는 시점**이다 — 첫 실행에 "언젠가 유료"라고 예고하는 것과, 실제로
          체험이 끝나갈 때 무엇이 달라지는지 알려주는 것은 정직함이 다르다.
          마지막 이틀에만 조용히 뜨고, 끝난 뒤에는 사라진다(잔소리하지 않는다).
        */}
        {!isPremium && trialActive && trialDaysLeft <= 1 && (
          <View className="bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-card px-s2 py-s2 mt-s2">
            <Text
              {...koreanWrap}
              {...textScaling}
              className="font-kr-medium text-caption text-ink dark:text-inkDark"
            >
              {trialDaysLeft === 0 ? t('home:trialToday') : t('home:trialTomorrow')}
            </Text>
            <Caption className="pt-[4px]">{t('home:trialCaption')}</Caption>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
