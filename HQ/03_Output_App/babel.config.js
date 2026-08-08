module.exports = function (api) {
  api.cache(true);
  return {
    /**
     * NativeWind v4는 babel-preset-expo에 jsxImportSource를 넘기고 'nativewind/babel'
     * 프리셋을 함께 등록해야 className prop이 실제 스타일로 변환된다.
     * (2026-07-30 수정) 이전에는 metro의 withNativeWind만 설정하고 이 부분이 빠져 있어서
     * className이 전부 무시될 수 있었다 — 실기기에서 스타일이 하나도 안 먹던 원인 중 하나.
     */
    /**
     * (2026-08-08) 웹 빌드가 "Cannot use 'import.meta' outside a module"로
     * 아예 뜨지 않던 문제 수정.
     *
     * 원인: zustand의 ESM 빌드가 dev/prod 판별에 `import.meta.env.MODE`를 쓰는데,
     * `@expo/cli`가 웹 번들 요청에 `engine: 'hermes'`를 강제로 붙인다
     * (node_modules/expo/node_modules/@expo/cli — ManifestMiddleware.getWebBundleUrl).
     * `unstable_transformImportMeta`는 클라이언트 번들 기본값이 false라
     * `import.meta`가 변환되지 않은 채 그대로 번들에 남았고, 브라우저는 이 스크립트를
     * `type="module"` 없이 로드하므로 파싱 단계에서 바로 SyntaxError가 났다.
     *
     * `web`에만 켠다 — 네이티브(Hermes)는 이미 정상 동작하고, 문서도 "엔진이 import.meta를
     * 네이티브로 지원하면 이 변환이 방해될 수 있다"고 명시한다.
     */
    presets: [
      [
        'babel-preset-expo',
        { jsxImportSource: 'nativewind', web: { unstable_transformImportMeta: true } },
      ],
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
