import '../global.css';
import '../nativewind-setup';
import { useRenderTrace } from '../features/debug/useRenderTrace';
import { Platform, ScrollView, View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts,
  NotoSansKR_400Regular,
  NotoSansKR_500Medium,
  NotoSansKR_700Bold,
  NotoSansKR_900Black,
} from '@expo-google-fonts/noto-sans-kr';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { startThemeSync } from '../store/themeSync';

/**
 * 테마 동기화를 모듈 로드 시점에 한 번 시작한다 (React 밖).
 * 렌더 사이클에 참여하지 않으므로 리렌더를 유발하지 않는다.
 */
startThemeSync();

/**
 * 폰트 (2026-07-31 디자인 시안 반영):
 *   본문/UI = Noto Sans KR, 숫자·라틴 디스플레이 = Space Grotesk.
 *   시안 파일(App UI / Renewal / Logos)이 실제로 이 조합으로 렌더링돼 있다.
 *   둘 다 SIL Open Font License 1.1 — 상업적 이용 가능, 앱 내 고지는 설정 화면에.
 *
 * ⚠️ 폰트 로딩 데드락 방지 (2026-07-30에 실기기에서 터졌던 이슈):
 *   폰트 다운로드가 실패하면 fontsLoaded가 영원히 false가 되어 앱이 빈 화면에 갇힌다.
 *   실제로 "아이콘만 뜨고 아무것도 안 되는" 증상의 원인이었다.
 *   → error가 나면 폰트 없이라도 앱을 띄운다(시스템 기본 폰트로 폴백).
 */
/**
 * 에러를 화면에 직접 보여준다.
 *
 * expo-router가 공식 지원하는 export다 — 하위 라우트에서 렌더 중 예외가 나면
 * 흰 화면 대신 이 컴포넌트가 뜬다. 브라우저 개발자도구를 열지 않아도
 * 무엇이 터졌는지 바로 읽을 수 있게 하려고 넣었다.
 * (2026-07-31 웹 흰 화면을 디버깅하면서 추가 — 원인이 안 보이는 게 가장 큰 문제였다)
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#2A1414' }}
      contentContainerStyle={{ padding: 24, paddingTop: 72 }}
    >
      <Text style={{ color: '#FF9C9C', fontSize: 12, letterSpacing: 2, marginBottom: 8 }}>
        RUNTIME ERROR
      </Text>
      <Text selectable style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', lineHeight: 25 }}>
        {error?.message ?? '알 수 없는 오류'}
      </Text>
      <Text
        selectable
        style={{ color: '#FFC9C9', fontSize: 11, lineHeight: 17, marginTop: 20 }}
      >
        {error?.stack ?? ''}
      </Text>
      <Text
        onPress={() => retry()}
        style={{
          color: '#2A1414',
          backgroundColor: '#FF9C9C',
          fontSize: 14,
          fontWeight: '700',
          textAlign: 'center',
          paddingVertical: 14,
          borderRadius: 12,
          marginTop: 28,
          overflow: 'hidden',
        }}
      >
        다시 시도
      </Text>
    </ScrollView>
  );
}

/**
 * 웹 전용 — React가 마운트되기 전에 터지는 예외까지 잡아 화면에 그린다.
 * ErrorBoundary는 React 렌더 중 예외만 잡으므로, 그보다 앞 단계에서
 * 죽는 경우(모듈 초기화 실패 등)는 여전히 흰 화면이 된다. 그 구멍을 막는다.
 */
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    const el = document.getElementById('__boot_error');
    if (el) return;
    const box = document.createElement('pre');
    box.id = '__boot_error';
    box.style.cssText =
      'position:fixed;inset:0;z-index:99999;margin:0;padding:24px;background:#2A1414;' +
      'color:#FFC9C9;font:12px/1.6 monospace;white-space:pre-wrap;overflow:auto';
    box.textContent =
      'BOOT ERROR\n\n' + (e.error?.stack || e.message || String(e)) + '\n\n' + (e.filename ?? '');
    document.body.appendChild(box);
  });
}

/**
 * 앱 껍데기 — **어떤 상태도 구독하지 않는다** (2026-08-01 재설계).
 *
 * 이전에는 여기서 `useSettingsStore(themeMode)` + `useColorScheme()`을 구독하고
 * `useEffect`로 `setColorScheme`을 호출했는데, 그게 무한 렌더 루프의 무대였다.
 * NativeWind의 `useColorScheme()`은 **렌더 도중에** 구독을 해제·재등록하고 알림이
 * 오면 항상 새 객체로 setState하기 때문에, 같은 컴포넌트에서 색상 스킴을 바꾸면
 * `렌더 → 구독 → 알림 → 리렌더` 고리가 만들어지기 쉽다.
 *
 * 그래서 테마 동기화를 React 밖(`store/themeSync.ts`, zustand subscribe)으로 옮기고,
 * 이 컴포넌트는 구독을 하나도 갖지 않게 했다 — **구조적으로 루프가 불가능하다.**
 *
 * StatusBar는 `style="auto"`로 둔다. Expo가 배경 밝기에 맞춰 알아서 대비를 잡아주므로
 * 색상 스킴을 직접 읽을 필요가 없다.
 */
function ThemedApp() {
  useRenderTrace('ThemedApp');
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansKR_400Regular,
    NotoSansKR_500Medium,
    NotoSansKR_700Bold,
    NotoSansKR_900Black,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  if (fontError) {
    console.warn('[마이템포] 폰트 로드 실패 — 시스템 기본 폰트로 진행합니다.', fontError);
  }

  if (!fontsLoaded && !fontError) {
    return (
      <View className="flex-1 items-center justify-center bg-bg dark:bg-bgDark">
        <Text className="text-muted dark:text-mutedDark">불러오는 중…</Text>
      </View>
    );
  }

  return <ThemedApp />;
}
