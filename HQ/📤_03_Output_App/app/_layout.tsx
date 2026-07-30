import '../global.css';
import '../nativewind-setup';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import {
  useFonts,
  NanumGothic_400Regular,
  NanumGothic_700Bold,
  NanumGothic_800ExtraBold,
} from '@expo-google-fonts/nanum-gothic';

/**
 * WBS 1.8 — 나눔고딕 폰트 적용. OFL 라이선스(상업적 이용 가능, 앱 내 고지 권장)이며
 * 오픈소스 라이선스 고지 문구는 설정 화면(WBS 1.6, app/settings.tsx)에 넣어둔다.
 *
 * (2026-07-30 수정) 이전 버전은 `if (!fontsLoaded) return <View/>`로 폰트 로딩만 기다렸는데,
 * 폰트 다운로드가 실패하면 fontsLoaded가 영원히 false여서 앱이 빈 화면(스플래시)에 갇혔다.
 * 실제로 실기기에서 "아이콘만 뜨고 아무것도 안 되는" 증상이 이것 때문이었다.
 * → 이제 error가 나면 폰트 없이라도 앱을 띄운다(폰트는 시스템 기본으로 폴백).
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NanumGothic_400Regular,
    NanumGothic_700Bold,
    NanumGothic_800ExtraBold,
  });

  // 폰트 로드 실패 시 콘솔에 남겨서 터미널에서 원인 확인 가능하게 함
  if (fontError) {
    console.warn('[마이템포] 나눔고딕 폰트 로드 실패 — 시스템 기본 폰트로 진행합니다.', fontError);
  }

  // 로딩 중일 때만 잠깐 대기. 실패(fontError)한 경우엔 기다리지 않고 앱을 띄운다.
  if (!fontsLoaded && !fontError) {
    return (
      <View className="flex-1 items-center justify-center bg-bg dark:bg-bgDark">
        <Text className="text-muted dark:text-mutedDark">불러오는 중…</Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
