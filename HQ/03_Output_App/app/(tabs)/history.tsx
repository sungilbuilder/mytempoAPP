import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { palette } from '../../constants/theme';
import { Caption, IconTrend, koreanWrap, numeralScaling, textScaling } from '../../components/ui';
import {
  FREE_HISTORY_DAYS,
  useHistoryStore,
  summarize,
  humanDate,
  humanDuration,
  visibleSessions,
} from '../../store/useHistoryStore';
import { useEntitlement } from '../../store/useEntitlementStore';
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
  /**
   * ⚠️ 요약은 **전체 데이터**로 계산한다 (2026-08-06).
   *
   * 화면에 보이는 목록만 7일로 자르고, 이번 주 집계·스트릭·지난주 대비는
   * 저장된 전부를 쓴다. 스트릭이 무료 사용자에게만 7일에서 끊기면
   * "습관 앱이 습관을 못 세는" 이상한 일이 된다. 게이팅은 목록 열람이지
   * 데이터 자체가 아니다.
   */
  const summary = summarize(sessions);

  const { full } = useEntitlement();
  const listed = useMemo(() => visibleSessions(sessions, full), [sessions, full]);
  const hiddenCount = sessions.length - listed.length;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bgDark" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          {...textScaling}
          accessibilityRole="header"
          className="font-kr-bold text-h1 text-ink dark:text-inkDark"
        >
          기록
        </Text>
        {/* 2026-08-06 (AOS 리뷰 P-6): NSM 단위인 스윙 수를 함께 보여준다 */}
        <Caption className="pt-[6px]">
          이번 주 {summary.weekDays}일 · {summary.weekSwings}스윙 · {summary.weekMinutes}분
        </Caption>

        {/* 요약 2칸 */}
        <View className="flex-row gap-[12px] pt-s3">
          <View
            accessible
            accessibilityLabel={`평균 템포 ${summary.avgRatio > 0 ? formatRatio(summary.avgRatio) : '아직 없음'}`}
            className="flex-1 bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-card p-s2"
          >
            <Caption>평균 템포</Caption>
            <Text
              {...numeralScaling}
              className="font-display-bold text-[28px] text-ink dark:text-inkDark pt-[4px]"
            >
              {summary.avgRatio > 0 ? formatRatio(summary.avgRatio) : '—'}
            </Text>
            {summary.ratioDelta !== null && (
              <View className="flex-row items-center gap-[4px] pt-[2px]">
                <IconTrend color={c.primary} size={14} />
                <Text
                  {...numeralScaling}
                  className="font-kr-medium text-caption"
                  style={{ color: c.primary }}
                >
                  지난주 대비 {summary.ratioDelta >= 0 ? '+' : ''}
                  {(Math.round(summary.ratioDelta * 10) / 10).toFixed(1)}
                </Text>
              </View>
            )}
          </View>

          <View
            accessible
            accessibilityLabel={`연속 ${summary.streak}일`}
            className="flex-1 bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-card p-s2"
          >
            <Caption>연속</Caption>
            <Text
              {...numeralScaling}
              className="font-display-bold text-[28px] text-ink dark:text-inkDark pt-[4px]"
            >
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
            <Caption className="pt-[6px] text-center">한 번만 연습해도 여기에 남습니다</Caption>
          </View>
        ) : (
          <View className="pt-s3">
            {listed.slice(0, 60).map((s) => (
              <View
                key={s.id}
                accessible
                accessibilityLabel={`${humanDate(s.date)}, ${s.swingCount ?? 0}스윙, ${humanDuration(s.durationSec)}, ${s.sourceLabel}, 비율 ${formatRatio(s.ratio)}`}
                className="flex-row items-center justify-between py-s2 border-b border-line dark:border-lineDark"
              >
                <View className="flex-1 pr-s2">
                  <Text
                    {...textScaling}
                    className="font-kr-bold text-body text-ink dark:text-inkDark"
                  >
                    {humanDate(s.date)}
                  </Text>
                  {/*
                    2026-08-06 (AOS 리뷰 P-6): 스윙 횟수를 앞에 둔다.
                    [[KPI-노스스타]]가 시간 기준을 버린 이유가 "배속 때문에 불공정"이었는데
                    화면은 계속 분만 보여주고 있었다. 시간은 보조로 남긴다.
                  */}
                  <Caption className="pt-[2px]">
                    {s.swingCount > 0 ? `${s.swingCount}스윙 · ` : ''}
                    {humanDuration(s.durationSec)} · {s.sourceLabel}
                  </Caption>
                </View>
                <Text
                  {...numeralScaling}
                  className="font-display-bold text-h2 text-ink dark:text-inkDark"
                >
                  {formatRatio(s.ratio)}
                </Text>
              </View>
            ))}

            {/*
              7일 컷 안내 (2026-08-06, Premium 게이팅)

              ⚠️ **표시만 자르고 저장은 전부 유지한다.** 위 요약(스트릭·이번 주)도
              전체 데이터로 계산한다. 데이터를 지우면 결제 후 복구가 안 되고
              D30 리텐션 관측이 끊긴다 → store/useHistoryStore.ts `visibleSessions`
            */}
            {hiddenCount > 0 && (
              <View className="bg-surface2 dark:bg-surface2Dark rounded-card px-s2 py-s2 mt-s3">
                <Text
                  {...koreanWrap}
                  {...textScaling}
                  className="font-kr-medium text-caption text-ink dark:text-inkDark"
                >
                  {`최근 ${FREE_HISTORY_DAYS}일까지 보여드리고 있어요`}
                </Text>
                <Caption className="pt-[4px]">
                  {`이전 기록 ${hiddenCount}건도 그대로 남아 있어요. 지워지지 않습니다.`}
                </Caption>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
