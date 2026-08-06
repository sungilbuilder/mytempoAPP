import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { palette } from '../../constants/theme';
import { Caption, IconTrend, koreanWrap } from '../../components/ui';
import {
  useHistoryStore,
  summarize,
  humanDate,
  humanDuration,
} from '../../store/useHistoryStore';
import { formatRatio } from '../../features/tempo/character';

/**
 * 기록 — "숫자보다 며칠 했는지가 먼저"
 *
 * 시안 근거: Premium "기록"
 *   왜: "지난주 대비 +0.1" 같은 진행 신호 하나가 그래프 전체보다
 *   재방문 동기를 더 강하게 만든다는 판단. 그래서 그래프를 넣지 않았다.
 *
 * ⚠️ 범위: PLANNING.md의 MVP 3개 기능에 없던 화면이다.
 * 2026-07-31 디자인 시안 채택으로 추가됐다(창업자 승인). 저장은 전부 기기 로컬.
 */
export default function HistoryScreen() {
  const { colorScheme } = useColorScheme();
  const c = palette(colorScheme);
  const sessions = useHistoryStore((s) => s.sessions);
  const summary = summarize(sessions);

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bgDark" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 32 }}>
        <Text className="font-kr-bold text-h1 text-ink dark:text-inkDark">기록</Text>
        <Caption className="pt-[6px]">
          이번 주 {summary.weekDays}일 · {summary.weekMinutes}분
        </Caption>

        {/* 요약 2칸 */}
        <View className="flex-row gap-[12px] pt-s3">
          <View className="flex-1 bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-card p-s2">
            <Caption>평균 템포</Caption>
            <Text className="font-display-bold text-[28px] text-ink dark:text-inkDark pt-[4px]">
              {summary.avgRatio > 0 ? formatRatio(summary.avgRatio) : '—'}
            </Text>
            {summary.ratioDelta !== null && (
              <View className="flex-row items-center gap-[4px] pt-[2px]">
                <IconTrend color={c.primary} size={14} />
                <Text
                  className="font-kr-medium text-caption"
                  style={{ color: c.primary }}
                >
                  지난주 대비 {summary.ratioDelta >= 0 ? '+' : ''}
                  {(Math.round(summary.ratioDelta * 10) / 10).toFixed(1)}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-1 bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-card p-s2">
            <Caption>연속</Caption>
            <Text className="font-display-bold text-[28px] text-ink dark:text-inkDark pt-[4px]">
              {summary.streak}일
            </Text>
            <Caption className="pt-[2px]">
              {summary.streak > 0 ? '이어가는 중' : '오늘 시작해볼까요'}
            </Caption>
          </View>
        </View>

        {/* 세션 목록 */}
        {sessions.length === 0 ? (
          <View className="items-center bg-surface2 dark:bg-surface2Dark rounded-lg px-s3 py-s6 mt-s3">
            <Text {...koreanWrap} className="font-kr-bold text-body text-ink dark:text-inkDark">
              아직 연습 기록이 없어요
            </Text>
            <Caption className="pt-[6px] text-center">
              한 번만 연습해도 여기에 남습니다
            </Caption>
          </View>
        ) : (
          <View className="pt-s3">
            {sessions.slice(0, 60).map((s) => (
              <View
                key={s.id}
                className="flex-row items-center justify-between py-s2 border-b border-line dark:border-lineDark"
              >
                <View>
                  <Text className="font-kr-bold text-body text-ink dark:text-inkDark">
                    {humanDate(s.date)}
                  </Text>
                  <Caption className="pt-[2px]">
                    {humanDuration(s.durationSec)} · {s.sourceLabel}
                  </Caption>
                </View>
                <Text className="font-display-bold text-h2 text-ink dark:text-inkDark">
                  {formatRatio(s.ratio)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
