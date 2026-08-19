import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  PanResponder,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { palette } from '../constants/theme';
import {
  Button,
  Caption,
  IconButton,
  IconChevronLeft,
  MIN_TOUCH,
  koreanWrap,
  numeralScaling,
  textScaling,
} from '../components/ui';
import { playCue } from '../features/audio-engine/cues';
import type { SwingMarks } from '../store/useSwingStore';
import { useSettingsStore } from '../store/useSettingsStore';

/** 재생 배속 프리셋 — 임팩트 구간이 워낙 짧아 0.25배속이 기본 작업 속도가 된다. */
const RATES = [1, 0.5, 0.25] as const;

/**
 * 확대 배율 범위 (2026-08-01 창업자 요청)
 *
 * 라운딩 중에는 멀리서 찍는 경우가 많아 스윙이 화면에서 작게 잡힌다. 그 상태로는
 * 임팩트 프레임을 눈으로 판별하기 어렵다 — 프레임 정밀도를 아무리 높여도
 * "어디가 임팩트인지 안 보이면" 소용이 없다.
 *
 * 처음엔 1x/1.5x/2x/3x 버튼으로 만들었는데, 창업자가 **두 손가락으로 늘리고 줄이는**
 * 방식을 원해서 연속 배율로 바꿨다.
 *
 * TODO(미구현): 원래는 프리셋 버튼도 함께 남기기로 했다 — 정확한 배율로 빠르게
 * 돌아가고 싶을 때가 있고, 한 손으로 조작할 때도 필요하다(아래 615~617행 주석 참조).
 * 현재 프리셋 버튼 UI 가 없어 `ZOOM_PRESETS = [1, 2, 3]` 상수가 死코드로 남아 있었고
 * 린트 도입 시 제거했다. 버튼을 붙일 때 상수도 함께 되살릴 것.
 */
const ZOOM_MIN = 1;
const ZOOM_MAX = 5;

/** 두 손가락 사이 거리 */
function touchDistance(touches: { pageX: number; pageY: number }[]) {
  const [a, b] = touches;
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

/**
 * fps를 모를 때 쓰는 보수적 기본값.
 * 프레임 이동 버튼의 이동 폭 계산에만 쓰이며, 비율 계산에는 영향을 주지 않는다
 * (비율은 항상 초 단위로 계산된다).
 */
const FALLBACK_FPS = 30;

type Step = 0 | 1 | 2;
/** STEP_META(힌트 문구 설계 배경 포함)는 t()가 필요해 컴포넌트 내부로 이동했다 — 아래 MarkingScreen 참고. */

/** 각 단계가 등장하는 간격(ms) — 1 → 2 → 3이 또렷이 순서대로 읽히도록 넉넉하게 둔다. */
const STEP_STAGGER_MS = 650;

/**
 * 첫 등록자용 1·2·3 안내 카드 — 하나씩 순서대로 등장 (2026-08-08 네 번째 재작업)
 *
 * ## 지금까지의 시도와 왜 또 바꿨는가
 *
 * 1차: 350ms 간격 페이드인 — 너무 빨라 "사라졌다"는 피드백.
 * 2차: 간격을 늘리고 라벨을 `Animated.Text`의 fontSize로 애니메이션 — 배지
 *     숫자는 보이는데 라벨만 계속 안 보인다는 피드백.
 * 3차: `Animated.Text`를 걷어내고 라벨을 평범한 `Text`(애니메이션 없음)로
 *     바꿨다. 그런데도 **여전히 숫자만 보이고 라벨은 안 보인다** — 즉
 *     `Animated.Text`가 원인이 아니었다. 두 시도에서 유일하게 계속 같았던
 *     조건은 "라벨 Text에 `flex-1`을 주고, 그 부모가 `Animated.View`"였다.
 *
 *     RN 플렉스박스에서 `flex: 1` 자식은 부모가 **확정된 너비**를 가져야
 *     "남는 공간"을 계산해 채울 수 있다. 원래(애니메이션 붙이기 전) 코드는
 *     이 줄이 평범한 `View className="flex-row items-center gap-[12px]"`
 *     였고 정상 동작했다 — 그 `View`는 부모(`View className="gap-[10px]"`)의
 *     기본 stretch로 화면 너비를 그대로 물려받았다. 그런데 이 줄을
 *     `Animated.View`로 바꾸면서 너비를 명시하지 않았고, 애니메이션
 *     style(opacity/transform)만 준 상태에서 `flex-1` 자식이 너비 0으로
 *     찌부러졌을 가능성이 크다 — 배지(고정 32px)는 이 계산에 안 걸리니
 *     항상 보이고, 라벨만 항상 안 보인 것과 정확히 들어맞는다.
 *
 * 4차(지금): 애니메이션 담당과 레이아웃 담당을 분리했다. 바깥
 * `Animated.View`는 `width: '100%'`만 갖고 opacity·scale만 맡는다(레이아웃에
 * 관여하지 않는 순수 래퍼). 안쪽은 원래 정상 동작했던 구조 그대로
 * `View className="flex-row items-center gap-[12px]"` — flex-1 라벨을
 * 포함해 전부 원본과 동일하다.
 */
function StepItem({
  index,
  n,
  label,
  surfaceColor,
  textColor,
}: {
  index: number;
  n: string;
  label: string;
  surfaceColor: string;
  textColor: string;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.82);

  useEffect(() => {
    const delay = index * STEP_STAGGER_MS;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
    );
    // "큰 글씨로 보여달라"는 요청 — 카드 전체가 크게 나타났다가 정착한다.
    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1.25, { duration: 260, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [index, opacity, scale]);

  const wrapperStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  /*
    ⚠️ className은 Animated.View에 직접 걸지 않는다 — nativewind-setup.ts가
    등록한 cssInterop과 reanimated 애니메이션 style을 같은 컴포넌트에 함께
    쓰면 애니메이션이 화면에 반영되지 않는 사례가 있었다. 바깥 래퍼는 순수
    style 객체로만 구성하고, className이 필요한 레이아웃/텍스트는 전부
    안쪽의 평범한 View/Text에 맡긴다.
  */
  return (
    <Animated.View style={[{ width: '100%' }, wrapperStyle]}>
      <View className="flex-row items-center gap-[12px]">
        <View
          className="w-[32px] h-[32px] rounded-pill items-center justify-center"
          style={{ backgroundColor: surfaceColor }}
        >
          <Text
            {...numeralScaling}
            className="font-display-bold text-body"
            style={{ color: textColor }}
          >
            {n}
          </Text>
        </View>
        <Text
          {...koreanWrap}
          {...textScaling}
          className="font-kr-bold text-body flex-1"
          style={{ color: textColor }}
        >
          {label}
        </Text>
      </View>
    </Animated.View>
  );
}

/**
 * 내 스윙 — 영상 마킹 (PLANNING.md Feature B, WBS 2.2~2.5)
 *
 * 2026-07-31 창업자 확정(안 A)으로 실제 영상 연동 구현.
 *
 * ## 설계의 핵심 — 왜 배속과 프레임 버튼이 "있으면 좋은 기능"이 아닌가
 *
 * 3:1 템포에서 다운스윙은 30fps 기준 8프레임뿐이다. 임팩트를 한 프레임만 잘못
 * 찍어도 비율이 2.66~3.42로 흔들린다. 슬로우 재생으로 사용자 오차를 없애면
 * ±0.19까지 줄지만, 그래도 3.0과 3.2는 구분되지 않는다.
 *
 * 게다가 드래그만으로는 애초에 정확히 찍을 수가 없다 — 240fps 3초 영상이면
 * 화면 폭 350px에서 1프레임이 0.5px다. 손가락으로 찍을 수 없는 크기다.
 *
 * 그래서 이 화면은 **드래그로 대략 맞추고 → 프레임 버튼으로 미세 조정**하는
 * 2단 구조를 강제한다. 배속은 그 과정에서 눈으로 확인하기 위한 것이다.
 *
 * 정밀도의 정직한 표시는 결과 화면에서 처리한다(features/tempo/character.ts).
 */
export default function MarkingScreen() {
  const router = useRouter();
  const { t } = useTranslation(['marking', 'common']);
  const { colorScheme } = useColorScheme();
  const c = palette(colorScheme);
  const uiSounds = useSettingsStore((s) => s.uiSounds);
  const beepVolume = useSettingsStore((s) => s.beepVolume);

  /**
   * 힌트는 "무엇을 찾는지"만 말한다 (2026-07-31 기획·디자인 리뷰 반영).
   *
   * 이전엔 1단계만 "클럽이 움직이기 시작하는 지점"(무엇), 2·3단계는 "느리게 재생하며
   * 찾아보세요"(어떻게)로 초점이 섞여 있었다. 조작법은 힌트가 아니라 버튼 옆 상시
   * 안내로 분리한다 — 단계마다 바뀌면 오히려 못 읽는다.
   *
   * t()를 써야 해서 컴포넌트 내부로 이동했다(원래는 모듈 최상단 상수였다).
   */
  const STEP_META: { key: keyof SwingMarks; title: string; hint: string }[] = [
    {
      key: 'start',
      title: t('marking:stepMeta.start.title'),
      hint: t('marking:stepMeta.start.hint'),
    },
    { key: 'top', title: t('marking:stepMeta.top.title'), hint: t('marking:stepMeta.top.hint') },
    {
      key: 'impact',
      title: t('marking:stepMeta.impact.title'),
      hint: t('marking:stepMeta.impact.hint'),
    },
  ];

  /**
   * 오디오 세션 설정 (2026-08-08 신설).
   *
   * ⚠️ 이 화면은 지금까지 오디오 세션을 한 번도 설정한 적이 없었다 —
   * `setAudioModeAsync`를 부르는 곳은 `Metronome.configureAudioMode()`
   * (연습 화면)뿐이었다. 그래서 연습 화면을 한 번도 거치지 않고 곧장 이
   * 화면으로 들어오는 경로(온보딩 → 첫 스윙 등록)에서는, 마킹 확인음
   * (`playCue('mark', …)`)이 **아직 설정되지 않은 기본 오디오 세션** 위에서
   * 재생된다. 이 상태에서 무음 스위치가 켜져 있으면 소리가 안 나거나,
   * 영상을 처음 재생하는 순간에야 세션이 우연히 갱신돼 그 뒤로만 소리가
   * 들리는 식의 비일관적인 동작이 생길 수 있다 — "시작 마킹은 소리가
   * 안 나는데 탑·임팩트는 난다"는 제보와 맞아떨어진다(시작은 슬로모
   * 재생 없이 스크럽만으로 찍는 경우가 많아, 영상 재생으로 세션이 갱신되기
   * 전에 첫 마킹음이 나가 버린다).
   *
   * 화면 진입 즉시(사용자가 첫 지점을 찍기 훨씬 전에) `playsInSilentMode: true`로
   * 세션을 명시적으로 잡아둬서, 어떤 순서로 조작하든 확인음이 항상 들리게 한다.
   *
   * ⚠️ 2026-08-09 추가 — 위 수정 이후에도 "시작만 무음" 제보가 재현됐다. 원인은
   * `setAudioModeAsync`가 세션 **카테고리**만 정하고 **활성화(activate)는 하지 않는다**는
   * 점이었다(expo-audio 네이티브 구현 확인: iOS `setAudioMode()`는 `setActive`를 호출하지
   * 않고, `setIsAudioActiveAsync`와 각 플레이어의 `play()`만 호출한다). 연습 화면을 먼저
   * 거쳤다가 나온 세션은 `pause()` 뒤 자동 `deactivateSession()`으로 비활성 상태가
   * 남아있을 수 있는데, 카테고리 재설정만으로는 이걸 되살리지 못한다. `play()`가 내부적으로
   * 세션을 재활성화하긴 하지만, 그 활성화가 실패(throw)하면 `playCue`가 조용히 삼켜서
   * 첫 재생만 소리 없이 사라진다. `setIsAudioActiveAsync(true)`로 화면 진입 시 세션을
   * 명시적으로 활성화해 이 경로를 없앤다.
   */
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    })
      .then(() => setIsAudioActiveAsync(true))
      .catch(() => {});
  }, []);

  /**
   * 재마킹 진입 (2026-08-06 신설, AOS 리뷰 P-5)
   *
   * 저장된 스윙의 `videoUri`를 아무 데서도 쓰지 않고 있었다. 그래서 한 프레임을
   * 잘못 찍으면 **삭제한 뒤 갤러리에서 처음부터** 다시 해야 했는데, 마킹은 이 앱에서
   * 가장 비용이 큰 행위다(주석도 "몇 분이 든다"고 인정한다).
   *
   * 이 화면은 이미 `videoUri`만 있으면 동작하므로 파라미터만 열면 된다.
   * 저비용·고효용 — "내 스윙"에서 [다시 마킹]으로 들어온다.
   *
   * ⚠️ uri는 카메라롤 참조라 원본이 지워졌을 수 있다. 그 경우 플레이어가 길이를
   * 못 읽으므로 아래 `videoMissing`에서 안내하고 갤러리 선택으로 되돌린다.
   */
  const params = useLocalSearchParams<{ videoUri?: string }>();
  const [videoUri, setVideoUri] = useState<string | null>(params.videoUri || null);
  const [durationSec, setDurationSec] = useState(0);
  const [fps, setFps] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [rateIndex, setRateIndex] = useState(2); // 기본 0.25배속
  const [isPlaying, setIsPlaying] = useState(false);

  /** 확대 배율(연속값)과, 확대했을 때 영상 안에서 보고 있는 위치 (2026-08-01) */
  const [zoom, setZoom] = useState(1);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });

  const [step, setStep] = useState<Step>(0);
  const [currentSec, setCurrentSec] = useState(0);
  const [marks, setMarks] = useState<Partial<SwingMarks>>({});
  const trackWidth = useRef(1);

  /*
    2026-08-08 (사용자 테스트): 갤러리 영상 소리를 켠다.
    임팩트 순간의 "딱" 소리가 정확한 프레임을 찾는 실질적인 단서가 된다 —
    영상만 보고 판단하는 것보다 소리까지 들으면 훨씬 정확하다.
    마킹 확인음(playCue('mark', ...), 아래 markHere 참고)과 겹칠 가능성은 낮다 —
    마킹은 보통 영상을 일시정지한 상태에서 누르기 때문이다.
  */
  const player = useVideoPlayer(videoUri ?? null, (p) => {
    if (!p) return;
    p.loop = false;
    p.muted = false;
  });

  /**
   * ⚠️ 2026-08-01 수정 — 프레임 정확 탐색을 어떻게 얻는가
   *
   * 처음엔 `seekTolerance`/`scrubbingModeOptions`를 설정했는데, 그 API는 expo-video의
   * 최신 개발 버전에만 있고 **설치된 3.0.16에는 존재하지 않는다**(타입 에러로 확인).
   *
   * 다행히 3.0.16 문서가 더 나은 답을 준다:
   *   - `currentTime = x`  → **프레임 정확 탐색**. 디코딩 지연이 있을 수 있지만 정확하다
   *   - `seekBy(seconds)`  → 빠르지만 부정확 (버퍼 상황에 따라 요청과 다른 지점)
   *
   * 이 화면은 정확도가 전부이므로 **모든 이동을 `currentTime`으로 처리**한다.
   * `seekBy`는 쓰지 않는다 — 프레임 버튼이 한 프레임씩 정확히 움직여야 하기 때문이다.
   */

  const frameSec = 1 / (fps ?? FALLBACK_FPS);

  /* ── 영상 선택 ────────────────────────────────────── */
  const pickVideo = useCallback(async () => {
    try {
      setLoading(true);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setLoading(false);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) {
        setLoading(false);
        return;
      }
      const asset = result.assets[0];
      setVideoUri(asset.uri);
      // duration은 ms 단위로 온다. 없으면 플레이어에서 읽는다(아래 effect).
      if (asset.duration) setDurationSec(asset.duration / 1000);
      /**
       * fps는 ImagePicker가 직접 주지 않는다. 프레임 수/길이로 추정할 수 있으면
       * 그 값을, 아니면 undefined로 둔다 — undefined면 결과 화면이 가장 보수적인
       * 정밀도('약 3:1')로 표시하므로 잘못된 숫자를 보여줄 위험은 없다.
       */
      const maybeFps = (asset as { frameRate?: number }).frameRate;
      setFps(typeof maybeFps === 'number' && maybeFps > 0 ? Math.round(maybeFps) : undefined);
      // 새 영상이면 마킹 초기화
      setMarks({});
      setStep(0);
      setCurrentSec(0);
    } catch (e) {
      console.warn('[마이템포] 영상 선택 실패', e);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── 플레이어에서 길이·fps 보정 ───────────────────── */
  /**
   * 2026-08-01: fps를 플레이어에서 직접 읽는다.
   *
   * ImagePicker의 `asset.frameRate`는 플랫폼에 따라 안 오는 경우가 많다. 반면
   * expo-video는 `availableVideoTracks[].frameRate`로 **영상 트랙의 실제 fps**를
   * 알려준다 — 훨씬 믿을 만한 출처다. 슬로모(240fps)로 찍었는데 정수로만 표시되던
   * 문제를 이걸로 잡는다.
   *
   * 로딩 직후엔 트랙 정보가 아직 없을 수 있어 잠깐 기다렸다 읽는다.
   */
  useEffect(() => {
    if (!player || !videoUri) return;
    const t = setTimeout(() => {
      const d = player.duration;
      if (typeof d === 'number' && d > 0) setDurationSec(d);

      try {
        const track = player.availableVideoTracks?.[0];
        const rate = track?.frameRate;
        if (typeof rate === 'number' && rate > 0) setFps(Math.round(rate));
      } catch {
        // 트랙 정보를 못 읽으면 ImagePicker가 준 값(또는 undefined)을 그대로 둔다.
        // undefined면 결과 화면이 가장 보수적인 정밀도로 표시하므로 안전하다.
      }
    }, 600);
    return () => clearTimeout(t);
  }, [player, videoUri]);

  /* ── 재생 중 현재 위치 추적 ───────────────────────── */
  useEffect(() => {
    if (!player || !isPlaying) return;
    const id = setInterval(() => {
      const t = player.currentTime;
      if (typeof t === 'number') setCurrentSec(t);
    }, 50);
    return () => clearInterval(id);
  }, [player, isPlaying]);

  /* ── 배속 반영 ────────────────────────────────────── */
  useEffect(() => {
    if (!player) return;
    try {
      player.playbackRate = RATES[rateIndex];
    } catch {
      // 일부 기기에서 배속을 지원하지 않을 수 있다 — 조용히 무시하고 1배속으로 둔다.
    }
  }, [player, rateIndex]);

  /**
   * 순서 가드 — 임팩트를 탑보다 앞서 찍는 등 돌발 순서를 원천 차단한다.
   * 마킹은 반드시 시간 순서(시작 < 탑 < 임팩트)여야 한다.
   *
   * `seekTo`보다 먼저 선언한다 — 아래 `stepFrame`의 deps 배열이 이 값을
   * 참조하는데, deps는 useCallback 호출 시점에 바로 평가되므로 이 상수가
   * 그 시점 이전에 이미 초기화돼 있어야 한다(아니면 TDZ 에러).
   */
  const prevMarkSec = step > 0 ? marks[STEP_META[step - 1].key] : undefined;
  const minSec = prevMarkSec !== undefined ? prevMarkSec + frameSec : 0;

  /* ── 탐색 ─────────────────────────────────────────── */
  const seekTo = useCallback(
    (sec: number) => {
      if (!player || durationSec <= 0) return;
      const clamped = Math.min(durationSec, Math.max(0, sec));
      setCurrentSec(clamped);
      try {
        player.currentTime = clamped;
      } catch {
        // seek 실패는 조용히 무시 — 다음 조작에서 복구된다.
      }
    },
    [player, durationSec],
  );

  /**
   * 프레임 단위 이동. 드래그로는 도달할 수 없는 정밀도를 여기서 확보한다.
   * `frames`(2026-08-08 추가) — 1프레임 버튼 옆에 5프레임 버튼을 더해 큰 폭 이동도
   * 지원한다. 가드·탐색 로직은 그대로 재사용한다.
   */
  const stepFrame = useCallback(
    (dir: -1 | 1, frames: number = 1) => {
      if (isPlaying) {
        player?.pause();
        setIsPlaying(false);
      }
      Haptics.selectionAsync().catch(() => {});
      // 순서 가드 — 이전 마크보다 앞으로는 못 가게 한다 (드래그 쪽 minSec 클램프와 동일 규칙).
      seekTo(Math.max(minSec, currentSec + dir * frameSec * frames));
    },
    [currentSec, frameSec, isPlaying, minSec, player, seekTo],
  );

  const togglePlay = useCallback(() => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, [player, isPlaying]);

  /* ── 타임라인 드래그 ──────────────────────────────── */
  /**
   * 영상 확대/이동 제스처 (2026-08-01)
   *
   * - **두 손가락**: 벌리면 확대, 오므리면 축소 (핀치)
   * - **한 손가락**: 확대된 상태에서 보고 있는 위치 이동
   *
   * react-native-gesture-handler를 쓰지 않고 PanResponder로 직접 구현한 이유:
   * 새 네이티브 패키지를 넣으면 Expo Go를 벗어나 개발 빌드로 전환해야 하는데,
   * 지금은 실기기 확인 사이클을 짧게 유지하는 편이 중요하다.
   *
   * ⚠️ 이전 구현은 멀티터치를 고려하지 않아 두 손가락을 대면 RN이
   * "Cannot record touch end without a touch start" 경고를 쏟아냈다(창업자 로그로 확인).
   * 이제 터치 개수에 따라 분기하고, 손을 뗄 때 핀치 기준점을 초기화한다.
   */
  const zoomRef = useRef(zoom);
  const offsetRef = useRef(viewOffset);
  const offsetStart = useRef({ x: 0, y: 0 });
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef(1);

  useEffect(() => {
    zoomRef.current = zoom;
    offsetRef.current = viewOffset;
  }, [zoom, viewOffset]);

  const videoPan = useRef(
    PanResponder.create({
      // 두 손가락은 항상 받고, 한 손가락은 확대 상태에서만 받는다.
      onStartShouldSetPanResponder: (e) =>
        e.nativeEvent.touches.length === 2 || zoomRef.current > 1,
      onMoveShouldSetPanResponder: (e) => e.nativeEvent.touches.length === 2 || zoomRef.current > 1,

      onPanResponderGrant: (e) => {
        offsetStart.current = offsetRef.current;
        const t = e.nativeEvent.touches;
        pinchStartDist.current = t.length === 2 ? touchDistance(t) : null;
        pinchStartZoom.current = zoomRef.current;
      },

      onPanResponderMove: (e, g) => {
        const t = e.nativeEvent.touches;

        if (t.length === 2) {
          const d = touchDistance(t);
          // 손가락을 막 두 개로 늘린 순간이면 기준점부터 잡는다.
          if (pinchStartDist.current === null || pinchStartDist.current === 0) {
            pinchStartDist.current = d;
            pinchStartZoom.current = zoomRef.current;
            return;
          }
          const next = pinchStartZoom.current * (d / pinchStartDist.current);
          setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next)));
          return;
        }

        // 한 손가락 — 확대된 상태에서만 위치 이동
        if (zoomRef.current > 1) {
          const scale = zoomRef.current;
          // 배율이 클수록 같은 손가락 이동에 영상은 덜 움직여야 자연스럽다.
          const limit = 140 * (scale - 1);
          setViewOffset({
            x: Math.max(-limit, Math.min(limit, offsetStart.current.x + g.dx / scale)),
            y: Math.max(-limit, Math.min(limit, offsetStart.current.y + g.dy / scale)),
          });
        }
      },

      onPanResponderRelease: () => {
        pinchStartDist.current = null;
      },
      onPanResponderTerminate: () => {
        pinchStartDist.current = null;
      },
    }),
  ).current;

  /** 1배율로 돌아오면 보던 위치도 원래대로 */
  useEffect(() => {
    if (zoom <= 1 && (viewOffset.x !== 0 || viewOffset.y !== 0)) {
      setViewOffset({ x: 0, y: 0 });
    }
  }, [zoom, viewOffset.x, viewOffset.y]);

  /**
   * ⚠️ 2026-08-06 좌표 보정 (AOS 리뷰 U-2)
   *
   * 이전 계산은 `g.moveX / trackWidth`였다. `moveX`는 **화면 절대 좌표**인데
   * `trackWidth`는 좌우 패딩(`px-s3` = 24px)을 제외한 트랙 자체의 폭이다.
   * 트랙의 화면상 시작 X를 빼지 않아 **손가락과 스크러버가 계속 24px 어긋났다.**
   *
   * 폭 390px 기기에서 트랙 342px 기준 24px = 약 7%. 3초 영상이면 0.2초,
   * 30fps로 6프레임이다. 왼쪽 끝을 아무리 밀어도 0초에 닿지 못하는 것도 같은 원인.
   * 프레임 버튼이 있어 치명적이진 않았지만, **정확도가 존재 이유인 화면에서
   * 드래그가 처음부터 틀린 곳을 짚고 있었다.**
   *
   * `measureInWindow`로 트랙의 화면상 X를 잡아 빼준다. onLayout뿐 아니라 터치를
   * 잡는 순간에도 다시 재는 이유: 회전·글꼴 확대·스크롤로 위치가 바뀔 수 있고,
   * 그때 onLayout이 항상 다시 오지는 않는다.
   */
  const trackRef = useRef<View>(null);
  const trackX = useRef(0);
  const measureTrack = useCallback(() => {
    trackRef.current?.measureInWindow((x, _y, w) => {
      trackX.current = x;
      if (w > 0) trackWidth.current = w;
    });
  }, []);

  /** 화면 절대 X → 영상 시각(초) */
  const seekToPageX = useCallback((pageX: number) => {
    const rel = pageX - trackX.current;
    const ratio = Math.min(1, Math.max(0, rel / Math.max(1, trackWidth.current)));
    const sec = ratio * durationRef.current;
    seekRef.current(Math.max(minSecRef.current, sec));
  }, []);

  const seekToPageXRef = useRef(seekToPageX);
  const measureTrackRef = useRef(measureTrack);
  useEffect(() => {
    seekToPageXRef.current = seekToPageX;
    measureTrackRef.current = measureTrack;
  }, [seekToPageX, measureTrack]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (_, g) => {
        if (isPlayingRef.current) {
          playerRef.current?.pause();
          setIsPlaying(false);
        }
        measureTrackRef.current();
        // 트랙을 탭하면 그 자리로 바로 이동한다 — 끌기 시작 전에도 반응해야 자연스럽다.
        seekToPageXRef.current(g.x0);
      },
      onPanResponderMove: (_, g) => {
        seekToPageXRef.current(g.moveX);
      },
    }),
  ).current;

  // PanResponder는 생성 시점의 클로저를 붙들기 때문에 ref로 최신값을 넘긴다.
  const isPlayingRef = useRef(isPlaying);
  const playerRef = useRef(player);
  const durationRef = useRef(durationSec);
  const minSecRef = useRef(minSec);
  const seekRef = useRef(seekTo);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    playerRef.current = player;
    durationRef.current = durationSec;
    minSecRef.current = minSec;
    seekRef.current = seekTo;
  }, [isPlaying, player, durationSec, minSec, seekTo]);

  /* ── 마킹 ─────────────────────────────────────────── */
  function markHere() {
    // 순서 가드 — 프레임 버튼으로 이전 마크보다 앞까지 되돌아온 채로 확인을 누르는 경우를 막는다.
    if (currentSec < minSec) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    const meta = STEP_META[step];
    const next = { ...marks, [meta.key]: currentSec };
    setMarks(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    /*
      확인음 (2026-08-06, T-24)
      마킹은 화면을 뚫어져라 보는 작업이라 "찍혔다"는 확인이 시각으로만 오면
      눈이 한 번 더 일해야 한다. 짧은 나무 소리 한 번이 그 부담을 덜어준다.
    */
    if (uiSounds) playCue('mark', beepVolume);

    if (step < 2) {
      setStep((step + 1) as Step);
      // 다음 지점은 방금 찍은 곳보다 뒤에 있으므로 살짝 앞으로 이동시켜 둔다.
      seekTo(currentSec + frameSec * 2);
      return;
    }

    const full = next as SwingMarks;
    router.push({
      pathname: '/result',
      params: {
        start: String(full.start),
        top: String(full.top),
        impact: String(full.impact),
        videoUri: videoUri ?? '',
        // fps를 모르면 빈 문자열 → 결과 화면이 가장 보수적인 정밀도로 표시한다.
        fps: fps ? String(fps) : '',
      },
    });
  }

  /**
   * 마킹 도중 이탈 확인 (2026-08-06 신설, AOS 리뷰 U-1 부수 항목)
   *
   * 뒤로가기·헤더 버튼 어느 쪽으로 나가든 **작업 손실을 한 번 확인한다.**
   * 마킹은 영상을 프레임 단위로 훑는 작업이라 몇 분이 든다. 아무것도 안 찍었으면
   * 잃을 게 없으므로 묻지 않고 그냥 나간다 — 의미 없는 확인창은 방해일 뿐이다.
   */
  const confirmLeave = useCallback(() => {
    const marked = Object.keys(marks).length;
    if (marked === 0) {
      router.back();
      return;
    }
    Alert.alert(
      t('marking:discardAlert.title'),
      t('marking:discardAlert.body', { count: marked }),
      [
        { text: t('marking:discardAlert.continue'), style: 'cancel' },
        {
          text: t('marking:discardAlert.discard'),
          style: 'destructive',
          onPress: () => router.back(),
        },
      ],
    );
  }, [marks, router, t]);

  /*
    포커스 기반 구독 (2026-08-08 버그 수정).
    이전에는 mount/unmount에만 걸려 있어, 마킹 화면을 나가고도 스택에
    남아 있으면(예: 다른 화면을 push로 그 위에 띄운 경우) 리스너가 계속
    살아 있었다. hardwareBackPress는 화면 포커스를 모르는 전역 스택이라,
    포커스가 없는 마킹 화면의 리스너가 지금 보고 있는 다른 화면(예: 온보딩)의
    뒤로가기까지 가로채 "마킹을 그만둘까요?"가 엉뚱하게 떴다.
    useFocusEffect로 감싸 포커스를 잃으면 즉시 해제되게 한다.
  */
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        confirmLeave();
        return true;
      });
      return () => sub.remove();
    }, [confirmLeave]),
  );

  function undo() {
    if (step === 0) {
      confirmLeave();
      return;
    }
    const prev = (step - 1) as Step;
    const next = { ...marks };
    delete next[STEP_META[prev].key];
    setMarks(next);
    setStep(prev);
    const back = marks[STEP_META[prev].key];
    if (back !== undefined) seekTo(back);
  }

  const meta = STEP_META[step];
  const marked = STEP_META.map((m) => marks[m.key]);
  const frameNo = Math.round(currentSec * (fps ?? FALLBACK_FPS));

  /* ── 영상 선택 전 화면 ────────────────────────────── */
  if (!videoUri) {
    return (
      <SafeAreaView className="flex-1 bg-bg dark:bg-bgDark" edges={['top', 'bottom']}>
        <View className="flex-row items-center px-s3 pt-s1 pb-s2">
          <IconButton label={t('common:back')} onPress={() => router.back()}>
            <IconChevronLeft color={c.ink} size={22} />
          </IconButton>
        </View>

        <View className="flex-1 px-s3 justify-center gap-s3">
          <Text
            {...koreanWrap}
            {...textScaling}
            accessibilityRole="header"
            className="font-kr-black text-h1 text-ink dark:text-inkDark leading-[40px]"
          >
            {t('marking:pickVideoScreen.title')}
          </Text>

          {/*
            2026-08-08 (사용자 요청): 원래는 처음 등록하는 사람에게만 이 3단계
            카드를 보여주고, 한 번 등록해본 사람에게는 한 줄 캡션만 보여줬다.
            그런데 갤러리에서 영상을 고르기 전에 항상 3단계를 알려주고 싶다는
            요청에 따라 `hasSwings` 조건을 없애고 누구에게나 항상 보여준다.
            2026-08-08 추가: 세 항목이 한 번에 나타나면 온보딩이 한 페이지로
            다 보인다는 피드백에 따라 1→2→3 순차 등장으로 바꿨다(StepItem 참고).
          */}
          <View className="gap-[10px]">
            {[
              { n: '1', label: t('marking:pickVideoScreen.steps.1') },
              { n: '2', label: t('marking:pickVideoScreen.steps.2') },
              { n: '3', label: t('marking:pickVideoScreen.steps.3') },
            ].map((s, i) => (
              <StepItem
                key={s.n}
                index={i}
                n={s.n}
                label={s.label}
                surfaceColor={c.surface2}
                textColor={c.ink}
              />
            ))}
          </View>

          <View className="pt-s2">
            {loading ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <Button label={t('marking:pickVideoScreen.pickButton')} onPress={pickVideo} />
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ── 마킹 화면 ────────────────────────────────────── */
  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bgDark" edges={['top', 'bottom']}>
      {/* 헤더 — 진행 단계 + 되돌리기 상시 노출 */}
      <View className="flex-row items-center justify-between px-s3 pt-s1 pb-s2">
        <IconButton
          label={t('marking:header.leaveA11yLabel')}
          hint={t('marking:header.leaveA11yHint')}
          onPress={confirmLeave}
        >
          <IconChevronLeft color={c.ink} size={22} />
        </IconButton>
        <Text
          {...numeralScaling}
          accessibilityLabel={t('marking:header.stepIndicatorA11y', { step: step + 1 })}
          className="font-display-bold text-body text-ink dark:text-inkDark"
        >
          {step + 1} / 3
        </Text>
        <Pressable
          onPress={undo}
          accessibilityRole="button"
          accessibilityLabel={
            step === 0
              ? t('marking:header.undoA11yLabelFirst')
              : t('marking:header.undoA11yLabelOther')
          }
          hitSlop={14}
          style={{ minHeight: MIN_TOUCH, minWidth: 48 }}
          className="items-end justify-center"
        >
          <Text
            {...textScaling}
            className="font-kr-medium text-caption text-muted dark:text-mutedDark"
          >
            {t('marking:header.undo')}
          </Text>
        </Pressable>
      </View>

      {/*
        단계 스테퍼 (2026-08-08, 사용자 테스트 피드백).
        "지금 뭘 찍고 있는지 모르겠다"는 피드백에 따라 영상 아래에 있던 요약 행을
        영상 위, 제목 바로 위로 옮기고 현재 단계를 색으로 강조한다.
        완료: primary, 현재: accent(강조), 남은 단계: muted.
      */}
      <View className="flex-row px-s3 pb-s2">
        {STEP_META.map((m, i) => {
          const value = marks[m.key];
          const isCurrent = i === step;
          const isDone = value !== undefined;
          const stepColor = isCurrent ? c.accent : isDone ? c.primary : c.muted;
          return (
            <View key={m.key} className="items-center flex-1">
              <Text
                {...textScaling}
                className={isCurrent ? 'font-kr-black text-body' : 'font-kr-bold text-caption'}
                style={{ color: stepColor }}
              >
                {t(`marking:stepper.${m.key}`)}
              </Text>
              <Text
                {...numeralScaling}
                className={
                  isCurrent
                    ? 'font-display-bold text-body pt-[2px]'
                    : 'font-display text-caption pt-[2px]'
                }
                style={{ color: stepColor }}
              >
                {value !== undefined
                  ? t('marking:stepper.done')
                  : isCurrent
                    ? t('marking:stepper.current')
                    : '—'}
              </Text>
            </View>
          );
        })}
      </View>

      <View className="px-s3">
        <Text
          {...textScaling}
          accessibilityRole="header"
          className="font-kr-bold text-h1 text-ink dark:text-inkDark"
        >
          {meta.title}
        </Text>
        <Caption className="pt-[6px]">{meta.hint}</Caption>
      </View>

      {/*
        영상 — 확대/이동 지원 (2026-08-01)

        라운딩 중 멀리서 찍은 영상은 스윙이 화면에서 너무 작게 잡혀 임팩트 프레임을
        눈으로 판별할 수 없다. 프레임 정밀도를 아무리 높여도 안 보이면 소용이 없으므로
        확대를 넣는다.

        확대했을 때는 손가락으로 끌어서 볼 위치를 옮길 수 있다(1배율에서는 이동 불필요).
        핀치 줌 대신 버튼을 쓴 이유: react-native-gesture-handler가 설치돼 있지 않고,
        마킹 중에는 정확한 배율을 반복해서 오가는 편이 손맛이 더 낫다.
      */}
      <View className="flex-1 mx-s3 my-s2 rounded-lg overflow-hidden bg-black items-center justify-center">
        <View
          style={{
            width: '100%',
            height: '100%',
            transform: [
              { scale: zoom },
              { translateX: viewOffset.x },
              { translateY: viewOffset.y },
            ],
          }}
        >
          <VideoView
            player={player}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            nativeControls={false}
            /*
              2026-08-01: allowsFullscreen/allowsPictureInPicture는 deprecated라
              Metro 로그를 수백 줄씩 채우고 있었다(창업자 로그로 확인).
              현재 API인 fullscreenOptions로 교체한다.
            */
            fullscreenOptions={{ enable: false }}
          />
        </View>

        {/*
          제스처 전용 투명 레이어 (2026-08-01)

          핀치가 안 먹던 이유: `VideoView`는 네이티브 뷰라 터치를 자기가 가져가고
          부모의 PanResponder까지 올려주지 않는다. 그래서 **영상 위를 덮는 투명 View**에
          핸들러를 붙인다. 영상 자체는 탭할 일이 없으므로 가려도 손해가 없다.

          ⚠️ 확대 transform 바깥에 둔다 — 안에 두면 확대될수록 터치 좌표가 왜곡된다.
        */}
        <View
          {...videoPan.panHandlers}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
        />
      </View>

      {/*
        확대 배율 표시 (2026-08-08: 초·프레임 숫자를 뺐다 — 사용자 테스트에서
        "굳이 필요 없는 정밀 수치"로 지적됨. 확대 컨트롤만 남긴다.)

        2026-08-01 UI 정리 — 확대 컨트롤을 영상 밖으로 뺐다.
        영상 위에 배율 표시와 안내 배너를 얹었더니 **정작 봐야 할 스윙을 가렸다**(창업자 지적).
        골퍼는 보통 화면 중앙~하단에 잡히는데 거기가 딱 가려졌다.
        영상 영역은 완전히 비우고, 배율은 확대 중일 때만 이 줄에 작게 표시한다.
      */}
      <View className="px-s3 flex-row items-center justify-end pb-s1">
        {zoom > 1.02 && (
          <Pressable
            onPress={() => setZoom(1)}
            accessibilityRole="button"
            accessibilityLabel={t('marking:zoom.resetA11yLabel', { zoom: zoom.toFixed(1) })}
            hitSlop={12}
            style={{ minHeight: MIN_TOUCH }}
            className="flex-row items-center justify-center gap-[4px] bg-surface2 dark:bg-surface2Dark rounded-pill px-s1 active:opacity-70"
          >
            <Text
              {...numeralScaling}
              className="font-display-bold text-caption text-ink dark:text-inkDark"
            >
              {zoom.toFixed(1)}x
            </Text>
            <Text
              {...textScaling}
              className="font-kr-medium text-caption text-muted dark:text-mutedDark"
            >
              {t('marking:zoom.resetLabel')}
            </Text>
          </Pressable>
        )}

        {/*
          ⚠️ 2026-08-06 두 가지 수정 (AOS 리뷰 V-2 · A-4)

          ① `dark:bg-primaryNeon` → `dark:bg-primary-neon`
             토큰이 `primary.neon`이라 클래스는 하이픈이어야 한다. 코드베이스의
             다른 7곳은 전부 올바른데 여기 한 곳만 틀려 있었고, NativeWind는
             모르는 클래스를 조용히 무시하므로 **다크 모드에서 선택된 배속이
             배경과 구분되지 않았다**(2.74:1 → 의도했던 10.56:1).
             `tsc --noEmit`은 이런 종류를 잡지 못한다.

          ② 높이 30dp → 48dp. 마킹의 기본 작업 속도가 0.25배속이라 이 버튼은
             장식이 아니라 **핵심 조작**이다.
        */}
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('marking:rate.groupA11yLabel')}
          className="flex-row items-center gap-[6px]"
        >
          {RATES.map((r, i) => (
            <Pressable
              key={r}
              onPress={() => setRateIndex(i)}
              accessibilityRole="radio"
              accessibilityLabel={t('marking:rate.optionA11yLabel', { rate: r })}
              accessibilityState={{ checked: i === rateIndex, selected: i === rateIndex }}
              style={{ minHeight: MIN_TOUCH, minWidth: 44 }}
              className={`px-s1 rounded-card items-center justify-center ${
                i === rateIndex
                  ? 'bg-primary dark:bg-primary-neon'
                  : 'bg-surface2 dark:bg-surface2Dark'
              }`}
            >
              <Text
                {...numeralScaling}
                className="font-display-bold text-caption"
                style={{ color: i === rateIndex ? c.onPrimary : c.muted }}
              >
                {r}x
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 타임라인 스크러버 */}
      <View className="px-s3">
        <View
          ref={trackRef}
          {...pan.panHandlers}
          onLayout={(e) => {
            trackWidth.current = e.nativeEvent.layout.width;
            // 레이아웃이 확정된 뒤 화면상 X를 잡는다 (좌표 보정의 기준점)
            measureTrack();
          }}
          accessibilityRole="adjustable"
          accessibilityLabel={t('marking:timeline.a11yLabel')}
          accessibilityHint={t('marking:timeline.a11yHint')}
          accessibilityValue={{
            text: t('marking:timeline.a11yValue', { sec: currentSec.toFixed(2), frame: frameNo }),
          }}
          className="h-[48px] justify-center"
        >
          <View className="h-[6px] rounded-pill bg-track dark:bg-trackDark" />

          {/* 이미 찍은 지점 */}
          {marked.map((sec, i) =>
            sec === undefined || durationSec <= 0 ? null : (
              <View
                key={i}
                className="absolute w-[3px] h-[20px] rounded-pill"
                style={{
                  left: `${(sec / durationSec) * 100}%`,
                  backgroundColor: i === 2 ? c.accent : c.primary,
                }}
              />
            ),
          )}

          {/* 현재 위치 */}
          <View
            className="absolute w-[18px] h-[18px] rounded-pill border-2"
            style={{
              left: durationSec > 0 ? `${(currentSec / durationSec) * 100}%` : '0%',
              marginLeft: -9,
              backgroundColor: c.surface,
              borderColor: c.primary,
            }}
          />
        </View>

        {/*
          프레임 이동 + 재생 — 드래그로 도달할 수 없는 정밀도를 여기서 확보한다.

          2026-08-06 접근성 (AOS 리뷰 A-1): 화면 글자는 삼각형만 두고, 읽히는
          이름은 accessibilityLabel로 따로 준다 (TalkBack이 기호를 이상하게 읽어서).
          2026-08-08: "1프레임" 단어는 지우고 삼각형만 남겼다(사용자 테스트 —
          글자를 잘 안 읽는다는 피드백). 큰 폭 이동용 5프레임 버튼을 양 옆에 추가.
        */}
        <View className="flex-row items-center justify-center gap-[6px] py-s1">
          <Pressable
            onPress={() => stepFrame(-1, 5)}
            accessibilityRole="button"
            accessibilityLabel={t('marking:frameButtons.back5A11yLabel')}
            style={{ minHeight: MIN_TOUCH }}
            className="px-s1 rounded-card justify-center bg-surface2 dark:bg-surface2Dark active:opacity-70"
          >
            <Text
              {...numeralScaling}
              className="font-display-bold text-body text-ink dark:text-inkDark"
            >
              ◀◀
            </Text>
          </Pressable>

          <Pressable
            onPress={() => stepFrame(-1)}
            accessibilityRole="button"
            accessibilityLabel={t('marking:frameButtons.back1A11yLabel')}
            style={{ minHeight: MIN_TOUCH }}
            className="px-s2 rounded-card justify-center bg-surface2 dark:bg-surface2Dark active:opacity-70"
          >
            <Text
              {...numeralScaling}
              className="font-display-bold text-body text-ink dark:text-inkDark"
            >
              ◀
            </Text>
          </Pressable>

          <Pressable
            onPress={togglePlay}
            accessibilityRole="button"
            accessibilityLabel={
              isPlaying
                ? t('marking:frameButtons.pauseA11yLabel')
                : t('marking:frameButtons.playA11yLabel')
            }
            style={{ minHeight: MIN_TOUCH }}
            className="px-s2 rounded-card justify-center bg-surface2 dark:bg-surface2Dark active:opacity-70"
          >
            <Text {...textScaling} className="font-kr-bold text-body text-ink dark:text-inkDark">
              {isPlaying ? t('marking:frameButtons.pause') : t('marking:frameButtons.play')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => stepFrame(1)}
            accessibilityRole="button"
            accessibilityLabel={t('marking:frameButtons.forward1A11yLabel')}
            style={{ minHeight: MIN_TOUCH }}
            className="px-s2 rounded-card justify-center bg-surface2 dark:bg-surface2Dark active:opacity-70"
          >
            <Text
              {...numeralScaling}
              className="font-display-bold text-body text-ink dark:text-inkDark"
            >
              ▶
            </Text>
          </Pressable>

          <Pressable
            onPress={() => stepFrame(1, 5)}
            accessibilityRole="button"
            accessibilityLabel={t('marking:frameButtons.forward5A11yLabel')}
            style={{ minHeight: MIN_TOUCH }}
            className="px-s1 rounded-card justify-center bg-surface2 dark:bg-surface2Dark active:opacity-70"
          >
            <Text
              {...numeralScaling}
              className="font-display-bold text-body text-ink dark:text-inkDark"
            >
              ▶▶
            </Text>
          </Pressable>
        </View>

        {/*
          조작 안내를 상시 노출로 분리 (2026-07-31 리뷰 반영).
          2026-08-08: 문구를 한 줄로 축약 — 실질적인 해결은 버튼 자체를 키우고
          단계 스테퍼를 강조하는 쪽(위 STEP_META 스테퍼, 아래 프레임 버튼)이 맡는다.
        */}
        <Text
          {...koreanWrap}
          {...textScaling}
          className="font-kr-medium text-caption text-muted dark:text-mutedDark text-center pb-[6px]"
        >
          {t('marking:hintCaption')}
        </Text>

        <Button
          label={
            step === 2
              ? t('marking:markButton.impact')
              : step === 1
                ? t('marking:markButton.top')
                : t('marking:markButton.start')
          }
          onPress={markHere}
          className="mb-s2"
        />
      </View>
    </SafeAreaView>
  );
}
