/**
 * NativeWind 서드파티 컴포넌트 className 지원 등록.
 * app/_layout.tsx 최상단에서 한 번만 import(부수효과 import)한다.
 * 개별 화면에서 각자 cssInterop을 부르지 않도록 여기로 통합 — 중복 등록/누락 방지.
 *
 * NativeWind는 RN 코어 컴포넌트(View/Text/Pressable/ScrollView…)만 기본 지원한다.
 * 서드파티 컴포넌트는 여기에 등록하지 않으면 className이 **조용히 무시된다**
 * (에러도 안 나고 스타일만 안 먹는다 — 그래서 원인 찾기가 특히 어렵다).
 *
 * 이력:
 * - 2026-07-30: FlatList의 contentContainerClassName은 cssInterop이 아니라
 *   remapProps로 등록해야 동작한다는 걸 발견해 수정
 *   (className→style은 cssInterop, 다른 prop 매핑은 remapProps).
 * - 2026-07-31: **SafeAreaView 등록 누락**을 발견해 추가. 모든 화면이
 *   `<SafeAreaView className="flex-1 …">`로 시작하는데 등록이 안 돼 있으면
 *   flex-1이 무시되어 화면 높이가 0이 되고, 결과적으로 아무것도 안 보인다.
 *   웹 흰 화면 증상의 유력한 원인이었다.
 */
import { cssInterop, remapProps } from 'nativewind';
import { BlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';
import { FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg from 'react-native-svg';

cssInterop(BlurView, { className: 'style' });
cssInterop(Animated.View, { className: 'style' });
cssInterop(SafeAreaView, { className: 'style' });
cssInterop(Svg, { className: 'style' });
remapProps(FlatList, { contentContainerClassName: 'contentContainerStyle' });
