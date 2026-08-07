/**
 * 사운드 팩 & 어드레스 대기 (2026-08-01 창업자 요청, WBS 2.8)
 *
 * ## 왜 필요한가
 *
 * 1) **사운드 팩** — 비프음 하나만으로는 오래 못 듣는다. 연습장 소음 속에서
 *    잘 들리는 소리가 사람마다 다르고, 취향도 갈린다.
 *
 * 2) **어드레스 대기** — 창업자 지적: "스윙 영상을 보면 알겠지만 한 번 스윙 이전에
 *    셋업하는 시간이 길다." 실제로 골퍼는 어드레스를 잡고 몇 초 뒤에 백스윙을 시작한다.
 *    그런데 메트로놈은 켜자마자 바로 도니까, 사용자가 준비되기 전에 첫 사이클이 지나간다.
 *    → 재생을 누르면 **카운트인 드럼이 먼저 울리고**, 끝나면 템포 루프가 시작된다.
 *    마지막 박을 강하게 쳐서 "이제 시작" 신호가 되게 했다.
 *
 * ## 파일 구조
 *
 * 오디오는 `assets/audio/`에 사전 렌더링해 둔다(PLANNING.md 6절 — JS 타이머로
 * 비프를 스케줄링하지 않고 네이티브 loop에 위임하는 방침). 팩 × 템포 조합이라
 * 파일 수가 늘지만, 개당 114KB로 전체 1.4MB 수준이라 감당 가능하다.
 */

/**
 * 2026-08-01 재편 — 비프·클릭 폐기 (WBS 2.18)
 *
 * "연습 소리가 브랜드 톤앤매너와 안 맞는다"는 지적을 측정으로 확인했다.
 * 비프(660Hz)와 클릭(1800Hz)은 전형적인 **가전 알림음 대역**이라, 자연 소재와
 * 절제를 지향하는 브랜드와 정면으로 충돌했다. 게다가 팩마다 조율이 제각각
 * (E5/A6/G#4/B2/E4)이라 팩을 바꾸면 음색이 아니라 **음 자체가 바뀌었다.**
 *
 * 이제 전부 **E3(164.81Hz) 한 음** 위에 음색만 다르게 얹는다.
 * 자세한 근거와 생성 로직은 `scripts/generate-sound-packs.py` 주석 참고.
 */
import {
  BASE_SWING_SEC,
  DEFAULT_SWING_SPEED,
  getSwingSpeed,
  type SwingSpeedId,
} from '../tempo/swingSpeeds';

export type SoundPackId = 'wood' | 'string' | 'drum' | 'rhythm';

/* ───────────────────────── 루프 구조 (진실의 출처) ───────────────────────── */

/**
 * ⚠️ 2026-08-07 — 상수에서 **함수로** 바뀌었다 (사운드 품질 Phase 1).
 *
 * 이전에는 오디오가 파일 하나(스윙 1.1초 / 사이클 2.0초)뿐이었고, 속도는
 * `player.setPlaybackRate()`로 늘려 썼다. 그래서 길이가 상수 하나로 족했다.
 *
 * 그 구조를 버렸다. 이유는 [[사운드품질-진단과개선계획-2026-08-07]]에 있는데
 * 한 줄로 줄이면 이렇다 —
 *
 *   배속이 0.825 / 0.917 / 1.031 / 1.179 였다. **1.0이 하나도 없다.**
 *   즉 사용자는 원본 파일을 한 번도 듣지 못했고, `shouldCorrectPitch`가
 *   켜져 있어 항상 **위상 보코더**를 거쳤다. 위상 보코더가 가장 못 다루는
 *   신호가 트랜지언트 뾰족한 타악기다 — 어택이 뭉개지고 프리에코가 낀다.
 *   "저가형으로 들린다"의 가장 큰 단일 원인이었다.
 *
 * 이제 속도마다 오디오를 따로 렌더링한다. 따라서 **루프 길이가 속도에 따라
 * 달라지고**, 링 애니메이션·샷 사이클·임팩트 진동이 전부 이 함수를 통해야 한다.
 *
 * ⚠️ `cycleSec`의 공식은 `scripts/generate-sound-packs.py`의 `cycle_for()`와
 * **반드시 같아야 한다.** 어긋나면 진행 점이 소리와 다른 속도로 돈다
 * (2026-08-01에 비슷한 사고가 있었다 — AOS 리뷰 V-4).
 */
/**
 * 기준 사이클 길이 — `generate-sound-packs.py`의 `BASE_CYCLE`과 같아야 한다.
 *
 * ⚠️ 기준 스윙 길이(`BASE_SWING_SEC`)는 여기 다시 적지 않고 `swingSpeeds.ts`에서
 * 가져온다. 같은 숫자를 두 곳에 두면 언젠가 어긋나고, 이 저장소는 실제로
 * 그 사고를 한 번 겪었다(AOS 리뷰 V-4).
 */
export const BASE_CYCLE_SEC = 2.0;

/** 이 속도에서 백스윙 시작 → 임팩트까지 몇 초인가. */
export function swingSec(speedId: SwingSpeedId): number {
  return getSwingSpeed(speedId).swingSec;
}

/** 이 속도에서 루프 한 바퀴가 몇 초인가. 파이썬 `cycle_for()`와 같은 공식. */
export function cycleSec(speedId: SwingSpeedId): number {
  return (BASE_CYCLE_SEC * swingSec(speedId)) / BASE_SWING_SEC;
}

export function cycleMs(speedId: SwingSpeedId): number {
  return cycleSec(speedId) * 1000;
}

/** 임팩트 진동을 소리에 맞춰 예약할 때 쓴다. */
export function impactAtMs(speedId: SwingSpeedId): number {
  return swingSec(speedId) * 1000;
}

export type SoundPack = {
  id: SoundPackId;
  label: string;
  description: string;
  /**
   * 박자를 깔아주는 층이 있는가 (2026-08-01 신설).
   * true인 팩은 마커음 3개 외에 일정한 펄스가 더 들린다.
   */
  hasPulse?: boolean;
  /**
   * 무료 티어에서 쓸 수 있는가 (2026-08-06, Premium 게이팅).
   *
   * [[v1.0-출시사양]]의 Premium 3종 중 하나가 "사운드팩 전체"다.
   * 무료로 여는 건 **기본팩(나무) 하나** — 이 팩이 곧 브랜드 사운드라
   * 무료 사용자도 제품의 소리 정체성은 온전히 경험한다. 나머지 3종은
   * 취향·환경에 맞춘 선택지이므로 유료로 둔다.
   */
  free?: boolean;
};

export const SOUND_PACKS: SoundPack[] = [
  {
    id: 'wood',
    label: '나무',
    description: '나무를 두드리는 소리 — 가장 자연스러워요',
    free: true,
  },
  { id: 'string', label: '현', description: '뜯는 현 — 여운이 남아 리듬이 이어져요' },
  { id: 'drum', label: '북', description: '낮은 타격 — 시끄러운 실내에서도 잘 들려요' },
  {
    id: 'rhythm',
    label: '리듬',
    description: '현이 세 지점을, 북이 그 사이 박자를 잡아줍니다',
    hasPulse: true,
  },
];

/** 무료 티어의 기본 사운드팩 — 체험이 끝나면 여기로 되돌린다 */
export const FREE_SOUND_PACK: SoundPackId = 'wood';

export function isPackFree(id: SoundPackId): boolean {
  return SOUND_PACKS.find((p) => p.id === id)?.free === true;
}
/**
 * 템포 × 사운드팩 × **스윙 속도** 조합 오디오.
 *
 * ⚠️ 2026-08-07: 속도 축이 새로 생겨 12개 → **48개**가 됐다.
 * 배속 재생을 없앤 대가다(위 `cycleSec` 주석 참고). 번들이 1.4MB → 9.6MB
 * 늘어나는데, 위상 보코더를 경로에서 빼는 값으로는 싸다고 판단했다.
 *
 * `require`는 정적 경로만 받으므로 전부 나열한다(번들러 제약).
 * 이 표는 `scripts/generate-sound-packs.py`가 만드는 파일명과 1:1로 맞아야 한다:
 *   `{비율}__{팩}__{속도}.wav`
 */
const LOOPS: Record<string, Record<SoundPackId, Record<SwingSpeedId, unknown>>> = {
  'preset-3-1': {
    wood: {
      s133: require('../../assets/audio/tempo_3_1__wood__s133.wav'),
      s120: require('../../assets/audio/tempo_3_1__wood__s120.wav'),
      s107: require('../../assets/audio/tempo_3_1__wood__s107.wav'),
      s093: require('../../assets/audio/tempo_3_1__wood__s093.wav'),
    },
    string: {
      s133: require('../../assets/audio/tempo_3_1__string__s133.wav'),
      s120: require('../../assets/audio/tempo_3_1__string__s120.wav'),
      s107: require('../../assets/audio/tempo_3_1__string__s107.wav'),
      s093: require('../../assets/audio/tempo_3_1__string__s093.wav'),
    },
    drum: {
      s133: require('../../assets/audio/tempo_3_1__drum__s133.wav'),
      s120: require('../../assets/audio/tempo_3_1__drum__s120.wav'),
      s107: require('../../assets/audio/tempo_3_1__drum__s107.wav'),
      s093: require('../../assets/audio/tempo_3_1__drum__s093.wav'),
    },
    rhythm: {
      s133: require('../../assets/audio/tempo_3_1__rhythm__s133.wav'),
      s120: require('../../assets/audio/tempo_3_1__rhythm__s120.wav'),
      s107: require('../../assets/audio/tempo_3_1__rhythm__s107.wav'),
      s093: require('../../assets/audio/tempo_3_1__rhythm__s093.wav'),
    },
  },
  'preset-2-5-1': {
    wood: {
      s133: require('../../assets/audio/tempo_2_5_1__wood__s133.wav'),
      s120: require('../../assets/audio/tempo_2_5_1__wood__s120.wav'),
      s107: require('../../assets/audio/tempo_2_5_1__wood__s107.wav'),
      s093: require('../../assets/audio/tempo_2_5_1__wood__s093.wav'),
    },
    string: {
      s133: require('../../assets/audio/tempo_2_5_1__string__s133.wav'),
      s120: require('../../assets/audio/tempo_2_5_1__string__s120.wav'),
      s107: require('../../assets/audio/tempo_2_5_1__string__s107.wav'),
      s093: require('../../assets/audio/tempo_2_5_1__string__s093.wav'),
    },
    drum: {
      s133: require('../../assets/audio/tempo_2_5_1__drum__s133.wav'),
      s120: require('../../assets/audio/tempo_2_5_1__drum__s120.wav'),
      s107: require('../../assets/audio/tempo_2_5_1__drum__s107.wav'),
      s093: require('../../assets/audio/tempo_2_5_1__drum__s093.wav'),
    },
    rhythm: {
      s133: require('../../assets/audio/tempo_2_5_1__rhythm__s133.wav'),
      s120: require('../../assets/audio/tempo_2_5_1__rhythm__s120.wav'),
      s107: require('../../assets/audio/tempo_2_5_1__rhythm__s107.wav'),
      s093: require('../../assets/audio/tempo_2_5_1__rhythm__s093.wav'),
    },
  },
  'preset-3-5-1': {
    wood: {
      s133: require('../../assets/audio/tempo_3_5_1__wood__s133.wav'),
      s120: require('../../assets/audio/tempo_3_5_1__wood__s120.wav'),
      s107: require('../../assets/audio/tempo_3_5_1__wood__s107.wav'),
      s093: require('../../assets/audio/tempo_3_5_1__wood__s093.wav'),
    },
    string: {
      s133: require('../../assets/audio/tempo_3_5_1__string__s133.wav'),
      s120: require('../../assets/audio/tempo_3_5_1__string__s120.wav'),
      s107: require('../../assets/audio/tempo_3_5_1__string__s107.wav'),
      s093: require('../../assets/audio/tempo_3_5_1__string__s093.wav'),
    },
    drum: {
      s133: require('../../assets/audio/tempo_3_5_1__drum__s133.wav'),
      s120: require('../../assets/audio/tempo_3_5_1__drum__s120.wav'),
      s107: require('../../assets/audio/tempo_3_5_1__drum__s107.wav'),
      s093: require('../../assets/audio/tempo_3_5_1__drum__s093.wav'),
    },
    rhythm: {
      s133: require('../../assets/audio/tempo_3_5_1__rhythm__s133.wav'),
      s120: require('../../assets/audio/tempo_3_5_1__rhythm__s120.wav'),
      s107: require('../../assets/audio/tempo_3_5_1__rhythm__s107.wav'),
      s093: require('../../assets/audio/tempo_3_5_1__rhythm__s093.wav'),
    },
  },
};

/**
 * 프리셋 id + 사운드팩 + 스윙 속도 → 실제 오디오 파일.
 *
 * 알 수 없는 값(구버전 저장값 등)은 조용히 기본으로 떨어진다 — 소리가 안 나는
 * 것보다 다른 소리가 나는 편이 낫다.
 */
export function loopAudio(
  presetId: string,
  pack: SoundPackId,
  speedId: SwingSpeedId
): unknown {
  const byPack = LOOPS[presetId] ?? LOOPS['preset-3-1'];
  const bySpeed = byPack[pack] ?? byPack[FREE_SOUND_PACK];
  return bySpeed[speedId] ?? bySpeed[DEFAULT_SWING_SPEED];
}

/**
 * 미리듣기 (2026-08-01 창업자 요청 — 설정에서 탭하면 바로 소리를 듣는다)
 *
 * 루프 파일을 그대로 쓰지 않고 별도 짧은 파일을 두는 이유: 루프는 앞뒤에 휴식이
 * 들어 있어 탭한 뒤 소리가 나기까지 뜸을 들이고, 2초로 길다. 미리듣기는
 * 시작·탑·임팩트 3박만 1.5초 안에 빠르게 들려준다.
 */
const PREVIEWS: Record<SoundPackId, unknown> = {
  wood: require('../../assets/audio/preview_wood.wav'),
  string: require('../../assets/audio/preview_string.wav'),
  drum: require('../../assets/audio/preview_drum.wav'),
  rhythm: require('../../assets/audio/preview_rhythm.wav'),
};

export const PREVIEW_MS = 1500;

export function previewAudio(pack: SoundPackId): unknown {
  // 구버전 저장값(beep/click)이 들어와도 조용히 기본 팩으로 떨어진다.
  return PREVIEWS[pack] ?? PREVIEWS.wood;
}

/* ───────────────────────── 샷 간격 ───────────────────────── */

/**
 * 샷 간격 (2026-08-01 전면 재설계 — 창업자 지적 + @golf-coach 검토)
 *
 * ## 무엇이 잘못돼 있었나
 *
 * 창업자 지적: "3초·5초·8초는 매우 짧게 느껴진다. 실내 연습장에서 공이 올라오고,
 * 세팅하고, 치고, 결과를 보는 한 사이클이 꽤 길다."
 *
 * 확인해보니 **문제는 숫자가 아니라 구조**였다. 기존 '어드레스 대기'는
 * **루프가 시작되기 전 딱 한 번** 울리는 카운트인이었다. 그 뒤로는 2초 사이클이
 * 무한 반복된다. 즉 **두 번째 스윙부터는 대기 시간이 아예 없다.**
 *
 *   기존:  [카운트인 5초] → [스윙 2초] → [스윙 2초] → [스윙 2초] → …
 *   필요:  [대기] → [카운트인] → [스윙] → [대기] → [카운트인] → [스윙] → …
 *
 * 기존 구조는 공 없이 하는 **빈 스윙 전용**이었고, 실제로 공을 치는 상황은
 * 애초에 지원한 적이 없었다.
 *
 * ## @golf-coach — 실내 연습장 1샷 사이클
 *
 *   티업기가 공을 올림      2~4초
 *   클럽 잡고 그립·정렬     3~5초
 *   어드레스·왜글           5~12초
 *   스윙·피니시             ~2초
 *   결과 확인(탄도·거리)    3~8초
 *   ─────────────────────────────
 *   합계                    약 15~30초
 *
 * 창업자 체감이 정확했다. 3~8초로는 어드레스조차 다 잡지 못한다.
 *
 * ## 부수 효과 — 이건 편의 기능이 아니라 훈련 도구다
 *
 * 연습장에서 가장 흔한 나쁜 습관이 "생각 없이 빨리 치는 것"이다. 간격을 강제하면
 * 프리샷 루틴이 자연히 만들어진다. 매 샷 직전 카운트인이 "지금 어드레스"라는
 * 신호가 되므로, 간격 자체가 루틴을 훈련시킨다.
 */

/** 0 = 연속(빈 스윙). 그 외는 한 샷에서 다음 샷까지의 전체 시간(초). */
export type ShotIntervalSec = 0 | 15 | 25 | 40;

export const SHOT_INTERVALS: {
  value: ShotIntervalSec; label: string; hint: string;
  /**
   * 무료 티어에서 쓸 수 있는가 (2026-08-06, Premium 게이팅).
   *
   * [[v1.0-출시사양]]의 Premium 항목은 "어드레스 대기시간 **커스텀**"이다.
   * 그래서 두 가지 기본 모드는 무료로 연다 — 빈 스윙(연속)과 기본 간격(25초).
   * 이 둘만으로도 앱의 핵심 훈련 루프가 온전히 돌아간다. 유료로 두는 건
   * "내 타석 사이클에 맞게 조절하는" 부분이다.
   */
  free?: boolean;
}[] = [
  { value: 0,  label: '연속',  hint: '공 없이 빈 스윙을 반복할 때', free: true },
  { value: 15, label: '15초',  hint: '공이 빨리 올라오는 타석' },
  { value: 25, label: '25초',  hint: '기본 — 결과를 확인하고 다시 준비할 여유', free: true },
  { value: 40, label: '40초',  hint: '프리샷 루틴을 온전히 지킬 때' },
];

/** 무료 티어의 기본 샷 간격 — 체험이 끝나면 여기로 되돌린다 */
export const FREE_SHOT_INTERVAL: ShotIntervalSec = 25;

export function isIntervalFree(v: ShotIntervalSec): boolean {
  return SHOT_INTERVALS.find((s) => s.value === v)?.free === true;
}

/* 매 샷 직전 울리는 카운트인 */
/**
 * 2026-08-01: 3초 → **5초** (창업자 요청).
 * 3초로는 클럽을 잡고 정렬까지 하기에 짧다. 마지막 2박을 강하게 쳐서
 * "이제 시작"이 분명해지게 했다.
 */
export const COUNT_IN_SEC = 5;
const COUNT_IN = require('../../assets/audio/countin_5s.wav');

export function countInAudio(): unknown {
  return COUNT_IN;
}
