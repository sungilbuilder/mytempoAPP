// ESLint 9 플랫 설정.
// eslint-config-expo 가 Expo/React Native/TypeScript/import 규칙을 모두 포함한다.
// eslint-config-prettier 는 서식 관련 규칙을 꺼서 Prettier 와 충돌하지 않게 한다(항상 마지막).
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

// expoConfig 내부에서 TS 파일 스코프에 등록된 플러그인 인스턴스를 꺼내 재사용한다.
// 별도로 require 하면 인스턴스가 갈려 규칙 덮어쓰기가 동작하지 않는다.
const tsPlugin = expoConfig.find((c) => c.plugins && c.plugins['@typescript-eslint'])?.plugins[
  '@typescript-eslint'
];

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'android/**',
      'ios/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'scripts/**', // 파이썬 도구
      '*.html',
    ],
  },

  ...expoConfig,

  {
    rules: {
      // 오디오 타이밍·영상 시크 코드에서 console 은 실기기 디버깅 수단이라
      // 전면 금지하지 않되, 정리 대상임을 드러낸다.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // @typescript-eslint 플러그인은 expoConfig 안에서 TS 파일에만 등록된다.
  // 같은 스코프에서 규칙을 덮어써야 하므로 플러그인 인스턴스를 그대로 재사용한다.
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.d.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // 미사용 변수는 오류로 승격하되, _ 접두사는 의도적 미사용으로 허용
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },

  // 개발 전용 계측 도구 — console 출력이 이 파일들의 존재 이유다.
  // 프로덕션 코드가 아니고 __DEV__ 가드 안에서만 돌기 때문에 규칙을 끈다.
  {
    files: ['features/debug/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },

  // 테스트 파일 — jest 전역(describe/it/expect/jest)을 인식시킨다.
  {
    files: ['**/__tests__/**/*.{ts,tsx,js}', '**/*.test.{ts,tsx,js}', 'jest.setup.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
    rules: {
      // 테스트에서는 non-null 단언이 가독성을 높이는 쪽이라 허용한다.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  prettierConfig,
];
