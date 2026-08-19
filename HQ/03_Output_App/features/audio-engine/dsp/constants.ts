/**
 * 런타임 합성 상수 — `scripts/generate-sound-packs.py`와 값을 반드시 맞춰야 한다.
 *
 * ⚠️ 이 파일과 파이썬 스크립트 사이에 상수가 어긋나면 "프리셋 오디오"와
 * "실측 스윙 오디오"의 음정·음량·공간감이 달라진다. 값을 바꿀 땐 두 곳을
 * 함께 바꿀 것 — 이 저장소가 이미 겪은 사고 패턴이다(AOS 리뷰 V-4, cycleSec 어긋남).
 */
import type { SoundPackId } from '../soundPacks';
export type { SoundPackId } from '../soundPacks';

export const SR = 44100;

/**
 * 기준 사이클 길이 — `soundPacks.ts`의 `BASE_CYCLE_SEC`, `generate-sound-packs.py`의
 * `BASE_CYCLE`과 같아야 한다.
 *
 * ⚠️ `soundPacks.ts`에서 값을 import하지 않고 여기 다시 적는 이유: `dsp/` 모듈은
 * (통합 단계에서) `soundPacks.ts`가 호출하게 될 예정이라, 반대 방향으로 값을
 * 가져오면 순환 참조가 생긴다. 상수 하나를 두 곳에 두는 대가를 감수하는 대신
 * 순환 의존성을 피한다 — 이 프로젝트가 이미 파이썬/TS 두 곳에 상수를 복제하고
 * 주석으로 동기화를 지키는 것과 같은 패턴이다.
 */
export const BASE_CYCLE_SEC = 2.0;

/** 훈련 마커 3음정 — E4 → A4 → B4 (2026-08-08, §5 사운드-아이덴티티). */
export const MARKER_E4 = 329.63;
export const MARKER_A4 = 440.0;
export const MARKER_B4 = 493.88;

/** 북(리듬 팩 박자 층)의 기음 — E1, E3의 2옥타브 아래. */
export const DRUM_E1 = 41.2;

/** 목표 라우드니스 (근사 LUFS) — 루프 재생용. */
export const LOOP_LUFS_TARGET = -18.0;

/** 아주 짧은 방 잔향 — 훈련 신호라 보수적으로. */
export const REVERB_RT60 = 0.13;
export const REVERB_WET = 0.12;

/** 들리지 않을 만큼 낮은 룸톤 — '진폭이 정확히 0인 구간'을 없애는 용도뿐. */
export const ROOM_TONE_DB = -80.0;

export const CEILING_DBTP = -1.0;

/** 백스윙을 3등분한 펄스 층에서 쓰는 픽업 박자 수 (리듬 팩). */
export const PICKUP_BEATS = 2;

/** 팩별 (start, top, impact) 주파수 — 현재 4팩 전부 동일(E4/A4/B4). */
export const MARKER_FREQS: Record<SoundPackId, [number, number, number]> = {
  wood: [MARKER_E4, MARKER_A4, MARKER_B4],
  string: [MARKER_E4, MARKER_A4, MARKER_B4],
  mallet: [MARKER_E4, MARKER_A4, MARKER_B4],
  rhythm: [MARKER_E4, MARKER_A4, MARKER_B4],
};

/** 팩 id → 박자 층(pulse layer)이 있는가. */
export const PACK_HAS_PULSE: Record<SoundPackId, boolean> = {
  wood: false,
  string: false,
  mallet: false,
  rhythm: true,
};
