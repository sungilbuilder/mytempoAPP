import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRenderTrace } from '../../features/debug/useRenderTrace';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { palette } from '../../constants/theme';
import { TempoRing } from '../../components/TempoRing';
import { Caption, IconBars, IconPlay, IconSettings, IconTarget, Logo } from '../../components/ui';
import { useActiveTempo } from '../../features/tempo/useActiveTempo';
import { formatRatio } from '../../features/tempo/character';
import { useHistoryStore, summarize } from '../../store/useHistoryStore';

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
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = palette(colorScheme);
  const tempo = useActiveTempo();
  const sessions = useHistoryStore((s) => s.sessions);
  const summary = summarize(sessions);

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bgDark" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 32 }}>
        {/*
          헤더
          2026-07-31 브랜드 리뉴얼: "오늘"이라는 무의미한 캡션 자리에 워드마크를 넣었다.
          창업자 전략 — 앱 아이콘은 심볼만 쓰는 대신, 앱 안에서는 워드마크를 적극 노출해
          브랜드를 각인시킨다. 홈은 재방문 시 가장 먼저 보는 화면이라 노출 가치가 가장 크다.
        */}
        <View className="flex-row items-start justify-between pb-s4">
          <View className="gap-[6px]">
            <Logo size={18} color={c.primary} accentColor={c.accent} />
            <Text className="font-kr-bold text-h1 text-ink dark:text-inkDark">연습할까요</Text>
          </View>
          <Pressable onPress={() => router.push('/settings')} hitSlop={14} className="pt-[4px]">
            <IconSettings color={c.subtle} />
          </Pressable>
        </View>

        {/* 이어서 연습 — 이 화면의 유일한 주 액션 */}
        <View className="bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-lg p-s3 items-center">
          <Text className="font-kr-medium text-caption text-muted dark:text-mutedDark self-start">
            이어서 연습
          </Text>
          <Text className="font-kr-medium text-caption text-subtle dark:text-subtleDark self-start pt-[2px]">
            {tempo.sublabel}
          </Text>

          <View className="py-s3">
            <TempoRing
              ratio={tempo.ratio}
              size={188}
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
              <Text className="font-display-bold text-[44px]" style={{ color: c.ink }}>
                {formatRatio(tempo.ratio)}
              </Text>
              <Text className="font-kr-medium text-caption pt-[2px]" style={{ color: c.subtle }}>
                {tempo.label}
              </Text>
            </TempoRing>
          </View>

          <Pressable
            onPress={() => router.push('/practice')}
            className="w-full flex-row items-center justify-center gap-[8px] bg-accent dark:bg-accent-neon rounded-card py-s2 active:opacity-85"
          >
            <IconPlay color={colorScheme === 'dark' ? c.onPrimary : '#FFFFFF'} size={20} />
            <Text
              className="font-kr-bold text-body"
              style={{ color: colorScheme === 'dark' ? c.onPrimary : '#FFFFFF' }}
            >
              바로 연습 시작
            </Text>
          </Pressable>
        </View>

        {/* 보조 액션 2개 */}
        <View className="flex-row gap-[12px] pt-s2">
          <Pressable
            onPress={() => router.push('/marking')}
            className="flex-1 bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-card p-s2 gap-[6px] active:opacity-80"
          >
            <IconTarget color={c.primary} size={22} />
            <Text className="font-kr-bold text-body text-ink dark:text-inkDark">내 스윙 등록</Text>
            {/* 2026-07-31 문구 수정: "3곳 탭"은 실제 조작(드래그+프레임버튼)과 다르고,
                검토 끝에 폐기한 "탭 투 템포" 방식을 연상시켜 혼란을 준다. */}
            <Caption>영상에서 세 지점 표시</Caption>
          </Pressable>

          <Pressable
            onPress={() => router.push('/presets')}
            className="flex-1 bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-card p-s2 gap-[6px] active:opacity-80"
          >
            <IconBars color={c.primary} size={22} />
            <Text className="font-kr-bold text-body text-ink dark:text-inkDark">템포 바꾸기</Text>
            <Caption>3종 프리셋</Caption>
          </Pressable>
        </View>

        {/* 이번 주 요약 — 숫자보다 "며칠 했는지"가 먼저 */}
        <Pressable
          onPress={() => router.push('/(tabs)/history')}
          className="flex-row items-center justify-between bg-surface2 dark:bg-surface2Dark rounded-card px-s2 py-s2 mt-s2 active:opacity-80"
        >
          <Caption>이번 주</Caption>
          <View className="flex-row items-baseline gap-[6px]">
            <Text className="font-display-bold text-h1 text-ink dark:text-inkDark">
              {summary.weekDays}일
            </Text>
            {summary.weekMinutes > 0 && (
              <Text className="font-kr-medium text-caption text-muted dark:text-mutedDark">
                · {summary.weekMinutes}분
              </Text>
            )}
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
