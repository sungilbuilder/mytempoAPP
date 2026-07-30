import { Tabs, useRouter } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useColorScheme } from 'nativewind';
import { lightColors, darkColors } from '../../constants/theme';

function SettingsButton() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? darkColors : lightColors;
  return (
    <Pressable onPress={() => router.push('/settings')} hitSlop={12} style={{ paddingHorizontal: 12 }}>
      <Text style={{ fontSize: 18, color: c.ink }}>⚙</Text>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const c = colorScheme === 'dark' ? darkColors : lightColors;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.ink,
        headerTitleStyle: { fontFamily: 'NanumGothic_700Bold' },
        headerRight: () => <SettingsButton />,
        tabBarLabelStyle: { fontFamily: 'NanumGothic_400Regular' },
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '마이템포 · 프리셋' }} />
      <Tabs.Screen name="my-swings" options={{ title: '내 스윙' }} />
      <Tabs.Screen name="practice/index" options={{ title: '연습' }} />
    </Tabs>
  );
}
