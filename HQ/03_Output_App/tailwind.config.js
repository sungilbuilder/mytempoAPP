/**
 * 마이템포 디자인 토큰 — 2026-07-31 프리미엄 리디자인 반영
 *
 * 근거 시안: HQ/📑_02_Workspace/product_design/design-proposal-2026-07-31/
 *   - `MYTEMPO Premium.dc.html` (Turn 4) — 토큰(색·간격·라운드·타입) 원본
 *   - `MYTEMPO App UI.dc.html` (Turn 3) — 화면별 적용 예
 *
 * 규칙: 접두어 없음 = 라이트(기본), `dark:` 접두어 = 다크.
 *   예) className="bg-bg dark:bg-bgDark text-ink dark:text-inkDark"
 *
 * 이전 팔레트(#436437 / #D4AF37 / #FAF8F2)에서 톤을 다시 잡은 값이다.
 * 브랜드 정체성(그린+골드)은 유지하되 채도를 낮추고 먹색을 더 짙게 가져간다.
 */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        /**
         * RN은 굵기별로 별도 폰트 파일/이름을 쓰므로 font-bold 유틸(fontWeight:'700')만으로는
         * 한글이 실제로 굵어지지 않는다 — 반드시 아래 클래스로 폰트 자체를 바꿀 것.
         *
         * 본문/UI = Noto Sans KR, 숫자·라틴 디스플레이("3:1", "MYTEMPO") = Space Grotesk.
         * 시안(App UI / Renewal / Logos)이 실제로 이 두 폰트 조합으로 렌더링돼 있다.
         */
        sans: ['NotoSansKR_400Regular'],
        'kr-medium': ['NotoSansKR_500Medium'],
        'kr-bold': ['NotoSansKR_700Bold'],
        'kr-black': ['NotoSansKR_900Black'],
        display: ['SpaceGrotesk_500Medium'],
        'display-bold': ['SpaceGrotesk_700Bold'],
      },
      colors: {
        /* ───────── 라이트 (Turn 4 COLOR TOKENS) ───────── */
        bg: '#FBFAF6',
        surface: '#FFFFFF',
        surface2: '#F2F0E8',
        line: '#E7E4D9',
        ink: '#16211A',
        muted: '#5F6C5C',
        subtle: '#8A9382',
        track: '#F0EEE6',
        onPrimary: '#F2F5EE',
        /**
         * 골드(accent) 위 텍스트 (2026-08-06, AOS 리뷰 V-1).
         * 라이트에서 골드 위 흰색은 1.93:1로 AA의 절반도 안 된다 → 먹색 8.61:1.
         */
        onAccent: '#16211A',

        /* ───────── 다크 ───────── */
        bgDark: '#0D110D',
        surfaceDark: '#161C15',
        surface2Dark: '#222A20',
        lineDark: '#2C3629',
        inkDark: '#F2F5EE',
        /* 2026-08-06: #7E8A79는 surface2 위에서 4.08:1 미달이었다 → 4.81:1 */
        mutedDark: '#8A9782',
        subtleDark: '#5C6659',
        trackDark: '#232C21',
        onPrimaryDark: '#0A0F09',
        onAccentDark: '#0A0F09',

        /**
         * BRAND ROLES (Turn 4)
         * - primary: 리듬·안정. 이동/확정 액션 전부.
         * - accent(골드): 재생·성공·최고기록 전용. **화면당 최대 1곳**.
         * - warning: 의도적으로 없음 — 실패를 보여주지 않는 습관 앱이라 경고색이 브랜드와 충돌.
         */
        primary: {
          DEFAULT: '#3F6136',
          deep: '#2E4A24',
          soft: '#4A7040',
          neon: '#7ED45C',
          neonDim: '#4E8C39',
        },
        accent: {
          DEFAULT: '#D9B84A',
          deep: '#C9A431',
          neon: '#E9CE6C',
          neonDim: '#E4C863',
        },
      },
      borderRadius: {
        /* RADIUS 12 · 18 · 24 · 999 */
        sm: '12px',
        card: '18px',
        lg: '24px',
        pill: '999px',
      },
      spacing: {
        /* SPACING (8pt 그리드) 8 · 16 · 24 · 32 · 48 */
        s1: '8px',
        s2: '16px',
        s3: '24px',
        s4: '32px',
        s6: '48px',
      },
      fontSize: {
        /* TYPE — Hero 72/800 · H1 22/700 · Body 15/400 · Caption 12/500 */
        hero: ['72px', { lineHeight: '72px', letterSpacing: '-3px' }],
        h1: ['22px', { lineHeight: '30px', letterSpacing: '-0.4px' }],
        h2: ['18px', { lineHeight: '26px' }],
        body: ['15px', { lineHeight: '24px' }],
        caption: ['12px', { lineHeight: '18px' }],
      },
    },
  },
  plugins: [],
};
