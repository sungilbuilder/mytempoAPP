import { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { palette } from '../../constants/theme';
import { IconHome, IconTarget, IconTrend } from '../../components/ui';
import { useRenderTrace } from '../../features/debug/useRenderTrace';

/**
 * 탭 구조 (2026-07-31 시안 반영): 홈 · 내 스윙 · 기록
 *
 * 이전 구조는 [프리셋 · 내 스윙 · 연습]이었다. 시안이 바꾼 핵심은
 *   - 프리셋을 탭에서 빼고 홈의 "템포 바꾸기"로 진입시킨 것
 *     (매번 고르는 화면이 아니라 한 번 고르고 마는 화면이라서)
 *   - 연습을 탭이 아니라 전체화면으로 띄운 것
 *     (재생 중엔 탭바가 보일 이유가 없고, 화면 전체가 하나의 메트로놈이어야 한다)
 *   - 대신 기록을 탭에 올린 것 ("며칠 했는지"를 항상 볼 수 있게)
 *
 * 헤더는 끄고 각 화면이 자기 헤더를 직접 그린다 — 시안의 여백/타이포를
 * React Navigation 기본 헤더로는 재현할 수 없기 때문.
 */
export default function TabsLayout() {
  useRenderTrace('TabsLayout');

  /**
   * 2026-08-01 — `useColorScheme()` 구독을 복구했다.
   *
   * 무한 루프의 진짜 원인은 이 훅이 아니라 `(tabs)/practice/index.tsx`의
   * 리다이렉트 스텁이었다(마운트 즉시 `<Redirect>`가 실행돼 네비게이션 상태가
   * 스스로를 갱신하는 고리). 원인을 특정하는 동안 이 구독을 임시로 걷어냈었지만,
   * 그러면 실행 중 테마를 바꿔도 탭바 색이 따라오지 않는다.
   *
   * 원인이 확정됐으므로 정상 동작으로 되돌린다.
   */
  const { colorScheme } = useColorScheme();
  const c = palette(colorScheme);

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarLabelStyle: { fontFamily: 'NotoSansKR_500Medium', fontSize: 11 },
      tabBarActiveTintColor: c.primary,
      /*
        2026-08-06: subtle → muted (AOS 리뷰 V-3).
        비활성 탭 라벨은 11px 텍스트다. subtle은 bg 위에서 라이트 3.06 / 다크 3.17로
        AA(4.5) 미달이었다. 탭 라벨은 "지금 어디에 있고 어디로 갈 수 있는가"를
        말하는 글자라 흐릿하면 길을 잃는다. muted는 5.31 / 6.19로 통과한다.
      */
      tabBarInactiveTintColor: c.muted,
      tabBarStyle: {
        backgroundColor: c.bg,
        borderTopColor: c.line,
        height: 62,
        paddingTop: 6,
        paddingBottom: 8,
      },
    }),
    [c.primary, c.muted, c.bg, c.line],
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <IconHome color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="my-swings"
        options={{
          title: '내 스윙',
          tabBarIcon: ({ color }) => <IconTarget color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: '기록',
          tabBarIcon: ({ color }) => <IconTrend color={color} size={22} />,
        }}
      />
      {/* 구 연습 라우트 — 리다이렉트 스텁이라 탭바에는 숨긴다 */}
    </Tabs>
  );
}
