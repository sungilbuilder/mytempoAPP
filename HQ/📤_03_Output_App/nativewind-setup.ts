/**
 * WBS 1.5/1.8 — NativeWind 서드파티 컴포넌트 className 지원 등록.
 * app/_layout.tsx 최상단에서 한 번만 import(부수효과 import)한다.
 * 개별 화면 파일에서 각자 cssInterop을 부르지 않도록 이 파일로 통합 — 중복 등록/등록 누락 방지.
 *
 * 참고(2026-07-30 로컬 빌드 전 재검토): FlatList의 contentContainerClassName은
 * cssInterop이 아니라 remapProps로 등록해야 동작한다(className→style은 cssInterop,
 * contentContainerClassName→contentContainerStyle 같은 다른 prop 매핑은 remapProps).
 * 이전 라운드에 index.tsx에서 등록 없이 contentContainerClassName을 썼던 버그를
 * 이번 로컬 빌드 전 검수에서 발견해 여기서 고쳤다.
 */
import { cssInterop, remapProps } from 'nativewind';
import { BlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';
import { FlatList } from 'react-native';

cssInterop(BlurView, { className: 'style' });
cssInterop(Animated.View, { className: 'style' });
remapProps(FlatList, { contentContainerClassName: 'contentContainerStyle' });
