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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';
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
import { type SwingMarks } from '../store/useSwingStore';
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
/**
 * 힌트는 "무엇을 찾는지"만 말한다 (2026-07-31 기획·디자인 리뷰 반영).
 *
 * 이전엔 1단계만 "클럽이 움직이기 시작하는 지점"(무엇), 2·3단계는 "느리게 재생하며
 * 찾아보세요"(어떻게)로 초점이 섞여 있었다. 조작법은 힌트가 아니라 버튼 옆 상시
 * 안내로 분리한다 — 단계마다 바뀌면 오히려 못 읽는다.
 */
const STEP_META: { key: keyof SwingMarks; title: string; hint: string }[] = [
  { key: 'start', title: '백스윙을 시작하는 순간', hint: '클럽이 처음 움직이기 시작하는 곳이에요' },
  { key: 'top', title: '클럽이 가장 높은 순간', hint: '올라간 클럽이 방향을 바꾸는 곳이에요' },
  { key: 'impact', title: '공에 맞는 순간', hint: '클럽 헤드가 공에 닿는 곳이에요' },
];

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
  const { colorScheme } = useColorScheme();
  const c = palette(colorScheme);
  const uiSounds = useSettingsStore((s) => s.uiSounds);
  const beepVolume = useSettingsStore((s) => s.beepVolume);

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

  const player = useVideoPlayer(videoUri ?? null, (p) => {
    if (!p) return;
    p.loop = false;
    p.muted = true;
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

  /** 프레임 단위 이동. 드래그로는 도달할 수 없는 정밀도를 여기서 확보한다. */
  const stepFrame = useCallback(
    (dir: -1 | 1) => {
      if (isPlaying) {
        player?.pause();
        setIsPlaying(false);
      }
      Haptics.selectionAsync().catch(() => {});
      // 순서 가드 — 이전 마크보다 앞으로는 못 가게 한다 (드래그 쪽 minSec 클램프와 동일 규칙).
      seekTo(Math.max(minSec, currentSec + dir * frameSec));
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
      영상 소리는 음소거돼 있어(player.muted) 겹칠 걱정이 없다.
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
    Alert.alert('마킹을 그만둘까요?', `지금까지 찍은 ${marked}개 지점이 사라져요.`, [
      { text: '계속하기', style: 'cancel' },
      { text: '그만두기', style: 'destructive', onPress: () => router.back() },
    ]);
  }, [marks, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmLeave();
      return true;
    });
    return () => sub.remove();
  }, [confirmLeave]);

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
          <IconButton label="뒤로" onPress={() => router.back()}>
            <IconChevronLeft color={c.ink} size={22} />
          </IconButton>
        </View>

        <View className="flex-1 px-s3 justify-center gap-s3">
          <Text
            {...koreanWrap}
            {...textScaling}
            accessibilityRole="header"
            className="font-kr-black text-h1 text-ink dark:text-inkDark leading-[32px]"
          >
            스윙 영상을 골라주세요
          </Text>
          <Caption>
            아무 영상이나 괜찮아요. 앱에서 느리게 돌려보며 시작·탑·임팩트 세 지점만 찍으면 템포가
            계산됩니다.
          </Caption>

          <View className="pt-s2">
            {loading ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <Button label="갤러리에서 영상 고르기" onPress={pickVideo} />
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
          label="마킹 그만두기"
          hint="지금까지 찍은 지점이 사라집니다"
          onPress={confirmLeave}
        >
          <IconChevronLeft color={c.ink} size={22} />
        </IconButton>
        <Text
          {...numeralScaling}
          accessibilityLabel={`3단계 중 ${step + 1}단계`}
          className="font-display-bold text-body text-ink dark:text-inkDark"
        >
          {step + 1} / 3
        </Text>
        <Pressable
          onPress={undo}
          accessibilityRole="button"
          accessibilityLabel={step === 0 ? '마킹 그만두기' : '직전 단계로 되돌리기'}
          hitSlop={14}
          style={{ minHeight: MIN_TOUCH, minWidth: 48 }}
          className="items-end justify-center"
        >
          <Text
            {...textScaling}
            className="font-kr-medium text-caption text-muted dark:text-mutedDark"
          >
            되돌리기
          </Text>
        </Pressable>
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

      {/* 현재 위치 / 배속 */}
      <View className="px-s3 flex-row items-center justify-between pb-s1">
        <View>
          <Text className="font-display-bold text-h2 text-ink dark:text-inkDark">
            {currentSec.toFixed(3)}초
          </Text>
          {/*
            2026-07-31 리뷰 반영: "프레임 428 · 240fps"에서 fps 표기를 뺐다.
            앱 전체가 일상어(리듬·템포·스윙)를 쓰는데 여기만 약어가 튀었고,
            fps는 일반 골퍼에게 의미가 없다. 정밀도는 결과 화면에서 간접 전달된다.
          */}
          <Caption>{frameNo}번째 프레임</Caption>
        </View>

        {/*
          2026-08-01 UI 정리 — 확대 컨트롤을 영상 밖으로 뺐다.
          영상 위에 배율 표시와 안내 배너를 얹었더니 **정작 봐야 할 스윙을 가렸다**(창업자 지적).
          골퍼는 보통 화면 중앙~하단에 잡히는데 거기가 딱 가려졌다.
          영상 영역은 완전히 비우고, 배율은 확대 중일 때만 이 줄에 작게 표시한다.
        */}
        {zoom > 1.02 && (
          <Pressable
            onPress={() => setZoom(1)}
            accessibilityRole="button"
            accessibilityLabel={`확대 ${zoom.toFixed(1)}배, 탭하면 원래 크기로`}
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
              해제
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
          accessibilityLabel="재생 배속"
          className="flex-row items-center gap-[6px]"
        >
          {RATES.map((r, i) => (
            <Pressable
              key={r}
              onPress={() => setRateIndex(i)}
              accessibilityRole="radio"
              accessibilityLabel={`${r}배속`}
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
          accessibilityLabel="영상 타임라인"
          accessibilityHint="좌우로 밀어 대략 맞춘 뒤 아래 프레임 버튼으로 조정하세요"
          accessibilityValue={{
            text: `${currentSec.toFixed(2)}초, ${frameNo}번째 프레임`,
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

          2026-08-06 접근성 (AOS 리뷰 A-1): "◀ 1프레임"은 TalkBack이 기호를
          이상하게 읽는다("검은 왼쪽 삼각형 1프레임"). 화면 글자는 그대로 두고
          읽히는 이름만 따로 준다.
        */}
        <View className="flex-row items-center justify-center gap-s2 py-s1">
          <Pressable
            onPress={() => stepFrame(-1)}
            accessibilityRole="button"
            accessibilityLabel="한 프레임 뒤로"
            style={{ minHeight: MIN_TOUCH }}
            className="px-s2 rounded-card justify-center bg-surface2 dark:bg-surface2Dark active:opacity-70"
          >
            <Text
              {...numeralScaling}
              className="font-display-bold text-body text-ink dark:text-inkDark"
            >
              ◀ 1프레임
            </Text>
          </Pressable>

          <Pressable
            onPress={togglePlay}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? '영상 일시정지' : '영상 재생'}
            style={{ minHeight: MIN_TOUCH }}
            className="px-s2 rounded-card justify-center bg-surface2 dark:bg-surface2Dark active:opacity-70"
          >
            <Text {...textScaling} className="font-kr-bold text-body text-ink dark:text-inkDark">
              {isPlaying ? '일시정지' : '재생'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => stepFrame(1)}
            accessibilityRole="button"
            accessibilityLabel="한 프레임 앞으로"
            style={{ minHeight: MIN_TOUCH }}
            className="px-s2 rounded-card justify-center bg-surface2 dark:bg-surface2Dark active:opacity-70"
          >
            <Text
              {...numeralScaling}
              className="font-display-bold text-body text-ink dark:text-inkDark"
            >
              1프레임 ▶
            </Text>
          </Pressable>
        </View>

        {/*
          조작 안내를 상시 노출로 분리 (2026-07-31 리뷰 반영).
          단계별 힌트에 섞여 있으면 단계가 바뀔 때마다 문구가 달라져 오히려 안 읽힌다.
        */}
        <Text
          {...koreanWrap}
          {...textScaling}
          className="font-kr-medium text-caption text-muted dark:text-mutedDark text-center pb-[2px]"
        >
          막대를 밀어 대략 맞춘 뒤, 버튼으로 한 프레임씩 조정하세요{'\n'}
          영상은 두 손가락으로 확대할 수 있어요
        </Text>

        {/* 구간 요약 */}
        <View className="flex-row justify-between pb-s1">
          {STEP_META.map((m, i) => (
            <View key={m.key} className="items-center">
              <Caption>{['시작', '탑', '임팩트'][i]}</Caption>
              <Text className="font-display text-caption text-ink dark:text-inkDark pt-[2px]">
                {marks[m.key] !== undefined ? `${marks[m.key]!.toFixed(3)}s` : '— —'}
              </Text>
            </View>
          ))}
        </View>

        <Button
          label={
            step === 2 ? '여기가 임팩트예요' : step === 1 ? '여기가 탑이에요' : '여기가 시작이에요'
          }
          onPress={markHere}
          className="mb-s2"
        />
      </View>
    </SafeAreaView>
  );
}
