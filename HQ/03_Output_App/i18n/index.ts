/**
 * i18n — 한국어/영어 (2026-08-08, mytempo 글로벌 출시 준비)
 *
 * 리소스는 빌드에 정적으로 번들되므로(JSON import) 네트워크 없이 즉시 쓸 수 있다.
 * 초기 언어는 기기 로캘로 동기 결정한다 — AsyncStorage 복원(비동기)을 기다리면
 * 첫 프레임이 잘못된 언어로 뜬다. 사용자가 명시적으로 고른 값은
 * `store/languageSync.ts`가 복원 완료 시점에 다시 적용한다.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// 정적 import가 아니라 require + try/catch를 쓴다 — expo-localization의 네이티브 모듈이
// (예: Expo Go 실기기의 SDK 불일치) 없으면 이 모듈 평가 시점에 즉시 throw되고, 그건
// 최상위 import라서 어디서도 못 잡고 앱 부팅 전체가 죽는다(2026-08-08 실기기에서 재현).
// require는 함수 호출이라 try/catch로 감쌀 수 있어 같은 실패를 "언어 자동감지만 실패"로 격리한다.
// eslint-disable-next-line @typescript-eslint/no-var-requires
let Localization: typeof import('expo-localization') | null = null;
try {
  Localization = require('expo-localization');
} catch (error) {
  console.warn(
    '[마이템포] expo-localization 네이티브 모듈을 찾을 수 없습니다 — 기기 로캘 자동감지 없이 진행합니다.',
    error,
  );
}

import commonKo from './locales/ko/common.json';
import commonEn from './locales/en/common.json';
import domainKo from './locales/ko/domain.json';
import domainEn from './locales/en/domain.json';
import onboardingKo from './locales/ko/onboarding.json';
import onboardingEn from './locales/en/onboarding.json';
import homeKo from './locales/ko/home.json';
import homeEn from './locales/en/home.json';
import settingsKo from './locales/ko/settings.json';
import settingsEn from './locales/en/settings.json';
import practiceKo from './locales/ko/practice.json';
import practiceEn from './locales/en/practice.json';
import markingKo from './locales/ko/marking.json';
import markingEn from './locales/en/marking.json';
import resultKo from './locales/ko/result.json';
import resultEn from './locales/en/result.json';
import presetsKo from './locales/ko/presets.json';
import presetsEn from './locales/en/presets.json';
import historyKo from './locales/ko/history.json';
import historyEn from './locales/en/history.json';
import mySwingsKo from './locales/ko/mySwings.json';
import mySwingsEn from './locales/en/mySwings.json';
import tabsKo from './locales/ko/tabs.json';
import tabsEn from './locales/en/tabs.json';

export const SUPPORTED_LANGUAGES = ['ko', 'en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  ko: {
    common: commonKo,
    domain: domainKo,
    onboarding: onboardingKo,
    home: homeKo,
    settings: settingsKo,
    practice: practiceKo,
    marking: markingKo,
    result: resultKo,
    presets: presetsKo,
    history: historyKo,
    mySwings: mySwingsKo,
    tabs: tabsKo,
  },
  en: {
    common: commonEn,
    domain: domainEn,
    onboarding: onboardingEn,
    home: homeEn,
    settings: settingsEn,
    practice: practiceEn,
    marking: markingEn,
    result: resultEn,
    presets: presetsEn,
    history: historyEn,
    mySwings: mySwingsEn,
    tabs: tabsEn,
  },
};

/**
 * 기기 로캘 → 지원 언어. 한국어가 아니면 전부 영어로 떨어진다(2개 언어만 지원).
 * Localization이 없으면(네이티브 모듈 미탑재) 감지를 포기하고 한국어로 시작한다 —
 * 이 앱의 1차 시장이 한국이라 자동감지 실패의 기본값으로 가장 안전하다.
 */
export function detectDeviceLanguage(): SupportedLanguage {
  const code = Localization?.getLocales()[0]?.languageCode;
  return code === 'en' ? 'en' : 'ko';
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: Object.keys(resources.ko),
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
