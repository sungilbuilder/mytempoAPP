import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { usePracticeStore } from '../../../store/usePracticeStore';
import { getPresetById, ratioToBackswingPercent } from '../../../features/tempo/presets';
import { Metronome } from '../../../features/audio-engine/metronome';

/**
 * 메인 스윙 템포 화면 (WBS 1.5 다크모드 → WBS 1.6 라이트/다크 토글)
 * - 템포 바: react-native-reanimated로 프리셋 변경 시 60fps 부드러운 폭 전환
 * - 중앙 카드: expo-blur BlurView + 반투명 서페이스로 글래스모피즘(tint는 현재 스킴에 맞춰 전환)
 * - 컬러/여백/라운드: `dark:` variant 병행 표기(tailwind.config.js)
 * - BlurView/Animated.View의 cssInterop 등록은 `nativewind-setup.ts`에 통합(중복 등록 방지)
 */
export default function PracticeScreen() {
  const selectedPresetId = usePracticeStore((s) => s.selectedPresetId);
  const bpmRate = usePracticeStore((s) => s.bpmRate);
  const isPlaying = usePracticeStore((s) => s.isPlaying);
  const setBpmRate = usePracticeStore((s) => s.setBpmRate);
  const setIsPlaying = usePracticeStore((s) => s.setIsPlaying);
  const { colorScheme } = useColorScheme();

  const preset = getPresetById(selectedPresetId);
  const metronomeRef = useRef<Metronome | null>(null);
  const [ready, setReady] = useState(false);
  const backswingWidth = useSharedValue(0);

  useEffect(() => {
    const m = new Metronome();
    metronomeRef.current = m;
    m.configureAudioMode();
    return () => {
      m.unload();
    };
  }, []);

  useEffect(() => {
    async function loadPreset() {
      if (!preset || !metronomeRef.current) return;
      setReady(false);
      await metronomeRef.current.load(preset.audioFile);
      setReady(true);
    }
    loadPreset();
  }, [preset?.id]);

  useEffect(() => {
    metronomeRef.current?.setRate(bpmRate);
  }, [bpmRate]);

  useEffect(() => {
    if (!preset) return;
    backswingWidth.value = withTiming(ratioToBackswingPercent(preset), { duration: 600 });
  }, [preset?.id]);

  const backswingStyle = useAnimatedStyle(() => ({
    width: `${backswingWidth.value}%`,
  }));

  const togglePlay = async () => {
    if (!metronomeRef.current || !ready) return;
    if (isPlaying) {
      await metronomeRef.current.stop();
      setIsPlaying(false);
    } else {
      await metronomeRef.current.play(bpmRate);
      setIsPlaying(true);
    }
  };

  if (!preset) {
    return (
      <View className="flex-1 items-center justify-center bg-bg dark:bg-bgDark p-8">
        <Text className="text-muted dark:text-mutedDark text-center">
          연습할 템포를 먼저 프리셋 탭에서 선택해주세요.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-bg dark:bg-bgDark p-8 gap-6">
      <View className="w-full rounded-3xl overflow-hidden">
        <BlurView
          intensity={40}
          tint={colorScheme === 'dark' ? 'dark' : 'light'}
          className="w-full items-center p-6 gap-6"
        >
          <Text className="text-muted dark:text-mutedDark text-xs tracking-widest uppercase">
            {preset.name}
          </Text>

          <Text className="text-ink dark:text-inkDark text-[56px] font-nanum-extrabold leading-none">
            {preset.ratioBackswing}:{preset.ratioDownswing}
          </Text>

          <View className="w-full h-4 rounded-full overflow-hidden bg-surface2 dark:bg-surface2Dark flex-row">
            <Animated.View className="bg-green dark:bg-green-neon h-full" style={backswingStyle} />
            <View className="bg-gold dark:bg-gold-neon h-full flex-1" />
          </View>
          <Text className="text-muted dark:text-mutedDark text-xs">
            백스윙(그린) · 다운스윙/임팩트(골드)
          </Text>

          <Pressable
            className="w-[72px] h-[72px] rounded-full bg-gold dark:bg-gold-neon items-center justify-center"
            onPress={togglePlay}
            disabled={!ready}
          >
            {/* 골드 배경은 라이트/다크 모두 밝은 편이라 텍스트는 항상 진한 톤 고정 */}
            <Text className="text-onAccentDark text-base font-nanum-extrabold">
              {isPlaying ? '정지' : '재생'}
            </Text>
          </Pressable>

          <View className="flex-row items-center gap-4">
            <Pressable
              className="border border-line dark:border-lineDark rounded-xl px-4 py-2"
              onPress={() => setBpmRate(bpmRate - 0.1)}
            >
              <Text className="text-ink dark:text-inkDark font-nanum-bold">느리게</Text>
            </Pressable>
            <Text className="text-ink dark:text-inkDark text-base font-nanum-bold min-w-[48px] text-center">
              {bpmRate.toFixed(1)}x
            </Text>
            <Pressable
              className="border border-line dark:border-lineDark rounded-xl px-4 py-2"
              onPress={() => setBpmRate(bpmRate + 0.1)}
            >
              <Text className="text-ink dark:text-inkDark font-nanum-bold">빠르게</Text>
            </Pressable>
          </View>
        </BlurView>
      </View>
    </View>
  );
}
