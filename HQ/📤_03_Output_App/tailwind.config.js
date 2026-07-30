/**
 * WBS 1.5/1.6 — NativeWind 설정. 색 토큰 근거:
 * HQ/📑_02_Workspace/product_design/design-guideline-v2-dark.md (다크)
 * HQ/📑_02_Workspace/product_design/light-dark-mode-guideline.md (라이트/토글)
 *
 * 규칙: 클래스 접두어 없음 = 라이트(기본), `dark:` 접두어 = 다크.
 * 예: className="bg-bg dark:bg-bgDark text-ink dark:text-inkDark"
 * 라이트 값은 WBS 1.4에서 이미 확정했던 원래 플랫 팔레트를 그대로 재사용한 것 — 새로 디자인하지 않음.
 */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        /**
         * WBS 1.8: 나눔고딕. RN은 굵기별로 별도 폰트 파일/이름을 쓰므로
         * font-bold 유틸(fontWeight:'700')만으로는 실제로 굵어 보이지 않는다 —
         * 반드시 font-nanum-bold / font-nanum-extrabold 클래스로 폰트 자체를 바꿔야 함.
         */
        sans: ['NanumGothic_400Regular'],
        'nanum-bold': ['NanumGothic_700Bold'],
        'nanum-extrabold': ['NanumGothic_800ExtraBold'],
      },
      colors: {
        // 라이트(기본) — WBS 1.4 팔레트 재사용
        bg: '#FAF8F2',
        surface: '#FFFFFF',
        surface2: '#F3EFE2',
        line: '#E3DFD1',
        ink: '#26331F',
        muted: '#6E7C66',
        disabled: '#B9C2B2',
        onAccent: '#F7F1E0',
        // 다크 — WBS 1.5 네온 리뉴얼
        bgDark: '#101410',
        surfaceDark: '#181D17',
        surface2Dark: '#20261F',
        lineDark: '#2B322A',
        inkDark: '#F5F7F2',
        mutedDark: '#A9B3A5',
        disabledDark: '#5C6459',
        onAccentDark: '#0A0F09',
        // 포인트 컬러: 라이트=차분한 톤(DEFAULT), 다크=네온 톤
        green: {
          DEFAULT: '#436437',
          neon: '#5FC639',
          bright: '#75D553',
        },
        gold: {
          DEFAULT: '#D4AF37',
          neon: '#EFC94D',
          bright: '#F7D464',
        },
      },
      borderRadius: {
        card: '16px',
      },
    },
  },
  plugins: [],
};
