module.exports = function (api) {
  api.cache(true);
  return {
    /**
     * NativeWind v4는 babel-preset-expo에 jsxImportSource를 넘기고 'nativewind/babel'
     * 프리셋을 함께 등록해야 className prop이 실제 스타일로 변환된다.
     * (2026-07-30 수정) 이전에는 metro의 withNativeWind만 설정하고 이 부분이 빠져 있어서
     * className이 전부 무시될 수 있었다 — 실기기에서 스타일이 하나도 안 먹던 원인 중 하나.
     */
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    /**
     * (2026-07-30, SDK54 업그레이드) Reanimated v4부터 워크릿 처리가 react-native-worklets로
     * 분리되어 babel 플러그인도 'react-native-reanimated/plugin' 대신
     * 'react-native-worklets/plugin'을 써야 한다. 반드시 plugins 배열의 마지막 항목이어야 함.
     */
    plugins: ['react-native-worklets/plugin'],
  };
};
