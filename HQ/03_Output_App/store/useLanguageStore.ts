/**
 * 언어 설정 — 'auto'는 기기 로캘을 따르고, 'ko'/'en'은 사용자가 명시적으로 고정한 값.
 * AsyncStorage에 영속된다(설정 화면 "언어" 토글, WBS T-05).
 */
import { create } from 'zustand';
import { persisted } from './persist';

export type LanguagePref = 'auto' | 'ko' | 'en';

type LanguageState = {
  language: LanguagePref;
  setLanguage: (language: LanguagePref) => void;
};

export const useLanguageStore = create<LanguageState>()(
  persisted<LanguageState>('language', (set) => ({
    language: 'auto',
    setLanguage: (language) => set({ language }),
  })),
);
