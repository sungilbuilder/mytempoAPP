import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, BackHandler, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { palette } from '../constants/theme';
import { TempoRing } from '../components/TempoRing';
import {
  Caption,
  IconButton,
  IconClose,
  IconPlay,
  IconStop,
  koreanWrap,
  numeralScaling,
  textScaling,
} from '../components/ui';
import { Toast, useToast } from '../components/Toast';
import { Metronome } from '../features/audio-engine/metronome';
import { playCue, releaseCues } from '../features/audio-engine/cues';
import {
  COUNT_IN_SEC,
  countInAudio,
  cycleMs,
  cycleSec,
  impactAtMs,
} from '../features/audio-engine/soundPacks';
import { useGatedShotInterval, useGatedSoundPack } from '../features/premium/useGatedSettings';
import { useActiveTempo } from '../features/tempo/useActiveTempo';
import { formatRatio } from '../features/tempo/character';
import {
  SWING_SPEEDS,
  getSwingSpeed,
  recommendSwingSpeed,
  swingBreakdown,
  type SwingSpeedId,
} from '../features/tempo/swingSpeeds';
import { useSwingStore } from '../store/useSwingStore';
import { usePracticeStore } from '../store/usePracticeStore';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  MIN_RECORD_SEC,
  NSM_SWING_THRESHOLD,
  useHistoryStore,
  toDateKey,
} from '../store/useHistoryStore';

/**
 * 연습 — 화면 전체가 하나의 메트로놈.
 *
 * 시안 근거: Premium "연습 — 재생 중"
 *   왜: 이 앱의 유일한 "브랜드 순간". 글로우·펄스가 있는 재생 버튼은
 *   스크린샷/영상 공유 시 가장 먼저 기억되는 요소가 된다.
 *
 * 탭이 아니라 전체화면이다 — 재생 중엔 탭바가 보일 이유가 없다.
 * 화면을 나갈 때 연습 시간이 10초를 넘었으면 기록에 자동 저장한다.
 */
export default function PracticeScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = palette(colorScheme);

  const tempo = useActiveTempo();
  const swingSpeed = usePracticeStore((s) => s.swingSpeed);
  const setSwingSpeed = usePracticeStore((s) => s.setSwingSpeed);
  /**
   * ⚠️ 2026-08-07: 여기 있던 `rate`(재생 배속)가 사라졌다.
   * 이제 속도는 **어느 오디오 파일을 로드하는가**로만 표현된다.
   * 배속 재생이 음질을 망치고 있었기 때문이다 — `swingSpeeds.ts` 주석 참고.
   */
  const speed = getSwingSpeed(swingSpeed);
  const isPlaying = usePracticeStore((s) => s.isPlaying);
  const setIsPlaying = usePracticeStore((s) => s.setIsPlaying);

  const beepVolume = useSettingsStore((s) => s.beepVolume);
  const hapticOnImpact = useSettingsStore((s) => s.hapticOnImpact);
  const keepAwakeEnabled = useSettingsStore((s) => s.keepAwake);
  const uiSounds = useSettingsStore((s) => s.uiSounds);
  /**
   * 2026-08-06: 저장값이 아니라 **지금 쓸 수 있는 값**을 읽는다.
   * 체험이 끝난 사용자가 유료 팩·간격을 계속 쓰지 않도록 하되,
   * 저장값 자체는 지우지 않는다(결제하면 그대로 돌아온다).
   */
  const soundPack = useGatedSoundPack();
  const shotIntervalSec = useGatedShotInterval();
  const addSession = useHistoryStore((s) => s.addSession);
  /** 마킹으로 저장해둔 내 스윙 — 템포 추천의 유일한 근거 (2026-08-01) */
  const swings = useSwingStore((s) => s.swings);

  const metronomeRef = useRef<Metronome | null>(null);
  /**
   * 로드 effect가 쓰는 최신 콜백들 (2026-08-07 신설).
   *
   * 로드 effect는 파일 위쪽에 있고 두 함수는 아래쪽에서 정의된다. 그렇다고
   * effect 의존성에 함수를 넣으면 **함수가 새로 만들어질 때마다 오디오가
   * 통째로 재로드**되므로, 렌더 중에 ref로 흘려보낸다(대입은 각 정의 바로 뒤).
   * effect 콜백은 렌더가 끝난 뒤 실행되니 항상 최신값을 본다.
   */
  const onSwingSignalRef = useRef<(lateSec?: number) => void>(() => {});
  const startPlaybackRef = useRef<(m: Metronome) => Promise<void>>(async () => {});
  const [elapsedSec, setElapsedSec] = useState(0);
  const [swingCount, setSwingCount] = useState(0);
  const { message: toastMessage, show: showToast } = useToast();

  /**
   * 화면을 닫을 때 참조할 최신값들.
   *
   * `close()`가 뒤로가기 리스너와 X 버튼 양쪽에서 불리는데, 리스너는 등록 시점의
   * 클로저를 붙든다. 상태를 그대로 읽으면 **연습 시작 직후의 0값**으로 저장돼
   * 세션이 통째로 사라진다. 값은 ref로 넘긴다.
   */
  const elapsedRef = useRef(0);
  const swingCountRef = useRef(0);
  useEffect(() => {
    elapsedRef.current = elapsedSec;
  }, [elapsedSec]);
  useEffect(() => {
    swingCountRef.current = swingCount;
  }, [swingCount]);

  /**
   * 연습 중 화면 자동 잠금 방지 (설정에서 끌 수 있음).
   *
   * useKeepAwake 훅을 쓰지 않는 이유: 훅은 태그만 바꿀 뿐 "끄기"가 안 된다
   * (undefined를 넘겨도 기본 태그로 여전히 활성화된다). 설정 토글을 실제로
   * 반영하려면 activate/deactivate를 직접 호출해야 한다.
   */
  useEffect(() => {
    const TAG = 'mytempo-practice';
    if (!keepAwakeEnabled) return;
    activateKeepAwakeAsync(TAG).catch(() => {});
    return () => {
      deactivateKeepAwake(TAG).catch?.(() => {});
    };
  }, [keepAwakeEnabled]);

  /* ── 오디오 로드/해제 ─────────────────────────────── */
  useEffect(() => {
    const m = new Metronome();
    metronomeRef.current = m;
    let cancelled = false;

    (async () => {
      try {
        await m.configureAudioMode();
        // 2026-08-01: 사운드 팩 / 2026-08-07: 스윙 속도까지 반영한 오디오를 쓴다.
        if (cancelled) return;
        await m.load(tempo.audioFileFor(soundPack, swingSpeedRef.current), beepVolume);
        if (cancelled) return;
        m.setOnCycle(onSwingSignalRef.current);
        /*
          재생 중이었다면 이어서 다시 튼다 (2026-08-07 신설).

          속도를 바꾸면 **다른 파일**을 로드해야 하므로 이 effect가 다시 돈다.
          이전(배속 재생)에는 끊김 없이 그 자리에서 빨라지거나 느려졌는데,
          이제는 로드 시간만큼 짧은 공백이 생긴다. 위상 보코더를 없앤 값으로는
          받아들일 만한 대가라고 봤다 — 속도 변경은 연습 중 자주 하는 조작이
          아니고, 어차피 다음 사이클 첫 박부터 새 속도가 맞는 편이 자연스럽다.

          ⚠️ `swingCount`는 리셋되지 않는다(React 상태라 재로드와 무관하다).
          NSM의 원천 데이터라 여기서 초기화되면 지표가 어긋난다.
        */
        if (isPlayingRef.current) await startPlaybackRef.current(m);
      } catch (e) {
        console.warn('[마이템포] 메트로놈 로드 실패', e);
      }
    })();

    return () => {
      cancelled = true;
      m.unload();
      metronomeRef.current = null;
    };
    // 연습 대상·사운드 팩·**스윙 속도**가 바뀌면 다시 로드해야 한다.
  }, [tempo.presetIdForAudio, soundPack, swingSpeed]);

  // 볼륨은 재로드 없이 반영
  useEffect(() => {
    metronomeRef.current?.setVolume(beepVolume);
  }, [beepVolume]);

  /* ── 재생 중 경과 시간 ─────────────────────────────
     ⚠️ 이 effect는 **isPlaying만** 의존한다 (2026-08-06, AOS 리뷰 Q-4).
     이전엔 rate·hapticOnImpact가 deps에 있어서, 재생 중 진동을 끄거나 속도를
     바꾸면 effect가 통째로 재생성되며 카운트 위상이 초기화됐다.
     경과 시간과 스윙 카운트를 서로 다른 effect로 분리해 그 연결을 끊는다. */
  useEffect(() => {
    if (!isPlaying) return;

    const startedAt = Date.now();
    const baseElapsed = elapsedRef.current;

    const tick = setInterval(() => {
      setElapsedSec(baseElapsed + Math.floor((Date.now() - startedAt) / 1000));
    }, 500);

    return () => clearInterval(tick);
  }, [isPlaying]);

  /* ── 설정을 ref로 읽어 effect 재생성을 막는다 ──
     `swingSpeedRef`·`shotIntervalRef`·`isPlayingRef`는 2026-08-07 신설이다.
     속도를 바꾸면 오디오를 다시 로드해야 하는데(배속 재생 제거), 재로드 뒤
     재생을 이어붙이려면 로드 effect가 이 값들을 알아야 한다. 상태를 직접
     의존성에 넣으면 재생/정지할 때마다 오디오가 통째로 재로드된다. */
  const hapticRef = useRef(hapticOnImpact);
  const uiSoundsRef = useRef(uiSounds);
  const volumeRef = useRef(beepVolume);
  const swingSpeedRef = useRef(swingSpeed);
  const shotIntervalRef = useRef(shotIntervalSec);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    hapticRef.current = hapticOnImpact;
    uiSoundsRef.current = uiSounds;
    volumeRef.current = beepVolume;
    swingSpeedRef.current = swingSpeed;
    shotIntervalRef.current = shotIntervalSec;
    isPlayingRef.current = isPlaying;
  }, [hapticOnImpact, uiSounds, beepVolume, swingSpeed, shotIntervalSec, isPlaying]);

  const impactTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 스윙 신호 1회 처리 — 카운트 + 임팩트 진동 예약. (2026-08-06)
   *
   * 오디오 엔진이 루프 경계를 잡을 때마다 부른다. `lateSec`은 "경계로부터 이미
   * 지난 시간"이라, 임팩트까지 남은 시간을 그만큼 빼서 예약하면 **매 사이클마다
   * 오디오 기준으로 다시 맞춰진다.** 예전 자유 실행 타이머와 달리 오차가
   * 누적되지 않는 게 핵심이다.
   */
  const onSwingSignal = useCallback((lateSec = 0) => {
    setSwingCount((n) => {
      const next = n + 1;
      /*
        NSM 완료(20스윙) 순간 확인음 (2026-08-06, T-24)

        딱 한 번만 울린다. "여기까지 하면 한 세션"이라는 감각을 소리로 심는
        장치인데, [[KPI-노스스타]]의 완료 기준과 사용자가 느끼는 완료가 같은
        지점이어야 지표가 실제 경험을 대변한다.

        ⚠️ 축하하지 않는다. 연습 도중에 울리므로 소리가 크거나 리듬을 만들면
        사용자가 그 소리에 스윙을 맞추려 든다. 가장 조용한 큐를 쓴다.
      */
      if (next === NSM_SWING_THRESHOLD && uiSoundsRef.current) {
        playCue('complete', volumeRef.current);
      }
      return next;
    });
    if (!hapticRef.current) return;

    if (impactTimer.current) clearTimeout(impactTimer.current);
    /*
      2026-08-07: 배속으로 나누던 계산이 사라졌다. 이제 파일 자체가 그 속도로
      렌더링돼 있으므로 임팩트 시각은 속도에서 바로 나온다.
    */
    const delay = impactAtMs(swingSpeedRef.current) - lateSec * 1000;
    if (delay <= 0) {
      // 이미 임팩트가 지났으면 굳이 늦게 울리지 않는다 — 틀린 신호가 없느니만 못하다.
      return;
    }
    impactTimer.current = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }, delay);
  }, []);
  onSwingSignalRef.current = onSwingSignal;

  /**
   * 재생 시작 한 곳으로 모으기 (2026-08-07 신설).
   *
   * 재생 버튼과 **속도 변경 후 재로드** 두 경로에서 똑같이 불린다.
   * 이전에는 재생 경로가 `toggle()` 안에만 있었는데, 이제 재로드 뒤에도
   * 이어서 틀어야 해서 분기가 두 곳으로 갈라질 뻔했다. 모드(연속/샷 사이클)를
   * 고르는 규칙이 두 곳에 있으면 언젠가 어긋난다.
   */
  const startPlayback = useCallback(async (m: Metronome) => {
    const speedId = swingSpeedRef.current;
    if (shotIntervalRef.current > 0) {
      /**
       * 샷 사이클 모드 (2026-08-01 재설계)
       *
       * [대기] → [카운트인 5초] → [스윙 신호] 를 계속 반복한다.
       * 공을 치는 상황에서는 한 샷의 전체 사이클이 15~40초라, 스윙 신호만
       * 2초마다 울려서는 쓸 수가 없다. 자세한 근거는 soundPacks.ts 주석 참고.
       */
      m.startShotCycle({
        countInFile: countInAudio(),
        countInSec: COUNT_IN_SEC,
        intervalSec: shotIntervalRef.current,
        // 2026-08-07: 루프 길이가 속도마다 다르므로 상수가 아니라 함수로 구한다
        swingCycleSec: cycleSec(speedId),
        /* 샷 모드에서도 카운트·진동 경로를 하나로 유지한다 (2026-08-06) */
        onSwing: () => onSwingSignalRef.current(0),
      });
    } else {
      // 연속(빈 스윙) — 네이티브 루프에 맡긴다
      await m.play();
    }
  }, []);
  startPlaybackRef.current = startPlayback;

  /** 오디오 엔진에 카운트 콜백을 물린다. 재생 중 갈아끼워도 카운트는 유지된다. */
  useEffect(() => {
    metronomeRef.current?.setOnCycle(onSwingSignal);
  }, [onSwingSignal, soundPack, swingSpeed, tempo.presetIdForAudio]);

  useEffect(
    () => () => {
      if (impactTimer.current) clearTimeout(impactTimer.current);
      // 확인음 플레이어가 남아 있으면 해제한다 (expo-audio는 자동 해제되지 않는다)
      releaseCues();
    },
    [],
  );

  /**
   * ── 재생/정지 ──────────────────────────────────────
   * 연타 가드 (2026-07-31 추가): toggle()이 매번 await를 거치는데, 그 사이에
   * 다시 탭하면 오디오 엔진의 실제 재생 상태와 화면의 isPlaying이 어긋날 수 있었다.
   * 처리 중에는 추가 탭을 무시한다(버튼을 비활성화하지 않고 조용히 무시하는 이유:
   * 버튼이 깜빡이며 비활성화되는 것보다 그냥 무시하는 쪽이 손맛이 자연스럽다).
   */
  const togglingRef = useRef(false);
  async function toggle() {
    if (togglingRef.current) return;
    const m = metronomeRef.current;
    if (!m) return;
    togglingRef.current = true;
    try {
      if (isPlaying) {
        await m.stop();
        if (impactTimer.current) clearTimeout(impactTimer.current);
        setIsPlaying(false);
      } else {
        // 모드 분기는 startPlayback 한 곳에 있다 (2026-08-07)
        await startPlayback(m);
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('[마이템포] 재생 토글 실패', e);
    } finally {
      togglingRef.current = false;
    }
  }

  /**
   * 스윙 속도 변경 (2026-08-01 · 2026-08-07 개편)
   *
   * 상태만 바꾸면 된다. 로드 effect가 `swingSpeed`를 의존성으로 두고 있어서
   * **그 속도로 렌더링된 파일**을 다시 로드하고, 재생 중이었다면 이어서 튼다.
   *
   * ⚠️ 이전에는 `setRate()` 한 줄이었고 재생이 끊기지 않았다. 그 매끄러움의
   * 대가가 위상 보코더였다 — 사용자가 듣는 모든 소리가 타임스트레치를 거쳤다.
   * 여기서 짧은 공백을 감수하고 원본 음질을 얻는 쪽으로 바꿨다.
   * (`swingSpeeds.ts` / [[사운드품질-진단과개선계획-2026-08-07]] 참고)
   */
  function changeSpeed(id: SwingSpeedId) {
    setSwingSpeed(id);
  }

  /**
   * 백그라운드 전환 시 자동 정지 (2026-07-31 추가).
   *
   * 재생 중 앱을 백그라운드로 보내면 오디오는 계속 돌지만 elapsedSec는 JS
   * setInterval이라 백그라운드에서 스로틀링돼 화면에 표시되는 시간과 실제
   * 재생 시간이 어긋난다. 연습 앱 특성상 "몰래 백그라운드에서 계속 도는" 이점이
   * 없으므로, 정확도·배터리 양쪽을 위해 백그라운드 진입 시 그냥 멈춘다.
   */
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && isPlaying) {
        metronomeRef.current?.stop();
        setIsPlaying(false);
      }
    });
    return () => sub.remove();
  }, [isPlaying]);

  /* ── 화면을 나갈 때 기록 저장 ───────────────────────── */
  /**
   * 연습 종료의 **유일한 경로**. (2026-08-06 재작성, AOS 리뷰 U-1)
   *
   * ## 무엇이 문제였나 — 안드로이드 뒤로가기가 이 함수를 통째로 우회했다
   *
   * 정지·기록저장·홈복귀를 전부 이 함수가 하는데, 좌상단 X 버튼에만 걸려 있었다.
   * 코드베이스 전체에 `BackHandler`가 0건이었다. 그래서 시스템 뒤로가기로 나가면
   *   · 세션이 기록되지 않는다 → **D30 리텐션 데이터가 소리 없이 사라진다**
   *   · `isPlaying`이 true로 남아 다음 진입 시 재생하려면 두 번 눌러야 한다
   *   · `router.back()`이 결과 화면으로 되돌아간다(2026-08-01에 고쳤던 그 문제)
   *
   * 한국 안드로이드 사용자의 화면 종료 제1수단이 뒤로가기라, 실질적으로는
   * **버그가 있는 쪽이 주 경로**였다.
   *
   * ⚠️ 중복 호출 가드가 필요하다. 뒤로가기를 연타하면 이 함수가 두 번 돌아
   * 같은 연습이 세션 2개로 저장될 수 있다.
   */
  const closingRef = useRef(false);
  /** 10초 미만 안내를 이미 띄웠는가 — 두 번째 시도는 그냥 내보낸다(화면에 갇히지 않게) */
  const warnedRef = useRef(false);
  const close = useCallback(async () => {
    if (closingRef.current) return;
    closingRef.current = true;

    await metronomeRef.current?.stop();
    if (impactTimer.current) clearTimeout(impactTimer.current);
    setIsPlaying(false);

    const durationSec = elapsedRef.current;
    const totalSwings = swingCountRef.current;
    const completed = totalSwings >= NSM_SWING_THRESHOLD;

    /**
     * 저장 기준 이원화 (2026-08-06, AOS 리뷰 P-3).
     *
     * `durationSec >= 10` = 히스토리에 남길 값어치가 있는가 (스트릭·기록 화면용)
     * `swingCount >= 20`  = NSM "완료"인가 (D30 게이트 판정용)
     *
     * 둘은 서로 다른 축이라 OR로 묶는다. 짧고 굵게 20스윙을 친 세션이
     * 시간 기준에 걸려 통째로 버려지면 NSM 원천 데이터에 구멍이 생긴다.
     */
    if (durationSec >= MIN_RECORD_SEC || completed) {
      addSession({
        id: `session-${Date.now()}`,
        date: toDateKey(new Date()),
        durationSec,
        swingCount: totalSwings,
        completed,
        countSource: 'audio',
        ratio: tempo.ratio,
        sourceLabel: tempo.isOwnSwing ? '내 스윙' : tempo.label,
      });
    } else if (durationSec > 0 && !warnedRef.current) {
      /*
        기록하지 않을 때 조용히 넘어가지 않는다 (AOS 리뷰 U-4).
        "했는데 안 남았다"는 스트릭 앱에서 신뢰 문제다.
        단, 안내는 한 번만 — 두 번째로 나가려 하면 그대로 내보낸다.
      */
      warnedRef.current = true;
      showToast(`${MIN_RECORD_SEC}초 넘게 연습해야 기록에 남아요`);
      closingRef.current = false;
      return;
    }

    /*
      2026-08-01 창업자 지적: "연습하기 갔다가 정지를 누르니 스윙 등록 화면으로 돌아온다."
      router.back()은 **직전 화면**으로 돌아가는데, 마킹 → 결과 → 연습 경로로 들어왔다면
      그 직전이 결과 화면이라 방금 끝낸 등록 흐름으로 되돌아가 버린다.
      연습을 마친 뒤 갈 곳은 언제나 홈이다.
    */
    router.replace('/(tabs)');
  }, [addSession, router, setIsPlaying, showToast, tempo.isOwnSwing, tempo.label, tempo.ratio]);

  /**
   * 안드로이드 시스템 뒤로가기 → `close()`로 흘려보낸다. (2026-08-06)
   *
   * `true`를 돌려주면 "이 이벤트를 우리가 처리했다"는 뜻이라 기본 동작
   * (router.back())이 실행되지 않는다. 즉 뒤로가기가 X 버튼과 **완전히 같은 일**을 한다.
   *
   * 10초 미만일 때 화면에 갇히는 문제는 `close()` 안의 `warnedRef`가 처리한다 —
   * 안내는 한 번만 띄우고, 두 번째 시도부터는 그대로 내보낸다.
   */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);

  const mm = String(Math.floor(elapsedSec / 60)).padStart(1, '0');
  const ss = String(elapsedSec % 60).padStart(2, '0');
  /**
   * 2026-08-06 (AOS 리뷰 V-1): 골드 위 텍스트는 팔레트의 `onAccent` 토큰을 쓴다.
   * 이전엔 여기서 `colorScheme === 'dark' ? c.onPrimary : '#FFFFFF'`로 직접 조합했고,
   * 라이트에서 **1.93:1** — 야외에서 앱의 주 버튼이 안 보이는 값이었다.
   */
  const onAccentText = c.onAccent;
  /** 지금 속도·비율에서 백스윙/다운스윙이 각각 몇 초인지 (2026-08-01) */
  const breakdown = swingBreakdown(speed, tempo.ratio);
  /**
   * 저장된 내 스윙에서 계산한 추천 단계 (2026-08-01).
   * 마킹 이력이 없으면 null — 그 경우 추천 UI 자체가 나타나지 않는다.
   * (근거 없이 추천하느니 아무 말도 하지 않는 편이 낫다)
   */
  const recommendation = useMemo(() => recommendSwingSpeed(swings), [swings]);

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bgDark" edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View className="flex-row items-center justify-between px-s3 pt-s1">
        <IconButton
          label="연습 마치기"
          hint="연습을 끝내고 기록을 저장한 뒤 홈으로 돌아갑니다"
          onPress={close}
        >
          <IconClose color={c.muted} size={22} />
        </IconButton>
        <Text
          {...textScaling}
          className="font-kr-medium text-caption text-muted dark:text-mutedDark"
        >
          {tempo.isOwnSwing ? '내 스윙' : '기준 리듬'} · {tempo.label}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      {/*
        2026-08-06: 하단 컨트롤을 ScrollView로 감쌌다 (AOS 리뷰 U-3).

        `result.tsx`는 2026-08-01에 "내용이 넘쳐 버튼과 겹친다"는 이유로 이미
        ScrollView로 바꿨는데, 이 화면은 **결과 화면보다 요소가 더 많다**
        (재생 버튼 + 샷간격 안내 + 속도 4버튼 + 구간 설명 + 추천 카드).
        작은 기기나 시스템 글꼴 확대 상태에서 추천 카드가 화면 밖으로 밀려난다.
        5060 페르소나 제품에서 글꼴 확대는 예외 상황이 아니다.

        링은 스크롤 콘텐츠 안에 두되 최소 높이를 줘서, 평소엔 지금과 똑같이 보이고
        공간이 부족할 때만 스크롤이 생기게 한다.
      */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 링 — 화면의 주인공 */}
        <View className="items-center justify-center py-s2" style={{ minHeight: 380 }}>
          <Caption className="pb-s2">BACKSWING : DOWNSWING</Caption>
          <TempoRing
            ratio={tempo.ratio}
            size={266}
            playing={isPlaying}
            /* 2026-08-07: 배속이 사라졌다. 링 주기는 속도별 루프 길이 그 자체다. */
            cycleMs={cycleMs(swingSpeed)}
            colors={{ primary: c.primary, accent: c.accent, track: c.track, dot: c.ink }}
          >
            {/* 2026-08-01: 홈과 동일하게 색 출처를 팔레트로 통일 (링 안 숫자 실종 대응) */}
            <Text
              {...numeralScaling}
              accessibilityLabel={`템포 비율 ${formatRatio(tempo.ratio)}`}
              className="font-display-bold text-[60px]"
              style={{ color: c.ink }}
            >
              {formatRatio(tempo.ratio)}
            </Text>
          </TempoRing>

          {/* 구간 라벨 */}
          <View className="flex-row gap-s3 pt-s3">
            <View className="flex-row items-center gap-[6px]">
              <View
                className="w-[8px] h-[8px] rounded-pill"
                style={{ backgroundColor: c.primary }}
              />
              <Caption>백스윙 시작</Caption>
            </View>
            <View className="flex-row items-center gap-[6px]">
              <View
                className="w-[8px] h-[8px] rounded-pill"
                style={{ backgroundColor: c.accent }}
              />
              <Caption>임팩트</Caption>
            </View>
          </View>

          {/*
            2026-08-06: 스윙 횟수를 시간과 나란히 보여준다.
            NSM의 단위가 스윙 횟수인데 화면은 분(minutes)만 말하고 있었다(AOS 리뷰 P-6).
            지표와 화면이 다른 것을 세면 사용자도 우리도 같은 것을 보지 못한다.
            `accessibilityLiveRegion`으로 TalkBack이 변화를 조용히 읽어준다.
          */}
          <Text
            {...koreanWrap}
            {...textScaling}
            accessibilityLiveRegion="polite"
            className="font-kr-medium text-caption text-muted dark:text-mutedDark pt-s3"
          >
            {elapsedSec > 0 ? `${mm}분 ${ss}초 · ${swingCount}스윙` : '아직 시작 전이에요'}
          </Text>
        </View>

        {/* 하단 컨트롤 — 주 버튼은 항상 같은 자리 */}
        <View className="px-s3 pb-s2">
          <Pressable
            onPress={toggle}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? '연습 정지' : '연습 재생'}
            accessibilityHint={
              isPlaying ? '메트로놈 소리를 멈춥니다' : '선택한 템포로 소리가 반복 재생됩니다'
            }
            accessibilityState={{ busy: isPlaying }}
            className="flex-row items-center justify-center gap-[8px] bg-accent dark:bg-accent-neon rounded-lg py-s3 active:opacity-85"
            style={{
              minHeight: 56,
              shadowColor: c.accent,
              shadowOpacity: 0.45,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}
          >
            {isPlaying ? (
              <IconStop color={onAccentText} size={22} />
            ) : (
              <IconPlay color={onAccentText} size={22} />
            )}
            <Text {...textScaling} className="font-kr-bold text-h2" style={{ color: onAccentText }}>
              {isPlaying ? '정지' : '재생'}
            </Text>
          </Pressable>

          {/*
          샷 간격 모드 안내 (2026-08-01)
          이 모드는 소리가 오랫동안 안 나는 구간이 있어서, 설명이 없으면
          "고장 났나" 싶어진다. 그래서 재생 전후 모두 상시 노출한다.
        */}
          {shotIntervalSec > 0 && (
            <Text
              {...koreanWrap}
              {...textScaling}
              className="font-kr-medium text-caption text-muted dark:text-mutedDark text-center pt-s1"
            >
              {`${shotIntervalSec}초마다 한 번 · 카운트인 ${COUNT_IN_SEC}초가 울리면 어드레스`}
            </Text>
          )}

          {/*
          스윙 속도 (2026-08-01 — 기존 "느리게 / 1.0x / 빠르게" 배속 스테퍼를 대체)

          바꾼 이유: 이전엔 "1.0x"라는 숫자만 보여줬는데, 이건 골퍼에게 아무 의미가
          없다. 0.9x가 내 스윙에 어떤 영향인지 알 수 없기 때문이다. 이제는 **스윙
          하나가 몇 초에 끝나는가**를 그대로 보여준다. 비율(3:1)은 그대로 두고
          절대 속도만 바뀐다는 점이 화면에서 바로 읽혀야 한다. (features/tempo/swingSpeeds.ts)
        */}
          <View className="pt-s3">
            <Caption className="text-center pb-[8px]">
              스윙 속도 — 빠른 게 더 좋은 건 아니에요
            </Caption>
            <View className="flex-row gap-[6px]">
              {SWING_SPEEDS.map((s) => {
                const active = s.id === swingSpeed;
                const isPick = s.id === recommendation?.speed.id;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => changeSpeed(s.id)}
                    accessibilityRole="radio"
                    accessibilityLabel={`스윙 속도 ${s.label}${isPick ? ', 내 템포 추천' : ''}`}
                    accessibilityState={{ checked: active, selected: active }}
                    className={`flex-1 items-center justify-center py-[10px] rounded-card ${
                      active
                        ? 'bg-primary dark:bg-primary-neon'
                        : 'bg-surface2 dark:bg-surface2Dark'
                    } active:opacity-80`}
                    style={[
                      { minHeight: 56 },
                      /* 추천 단계는 선택돼 있지 않아도 테두리로 표시해 눈에 띄게 한다 */
                      !active && isPick ? { borderWidth: 1, borderColor: c.accent } : null,
                    ]}
                  >
                    {/* 초를 주인공으로 — 형용사가 아니라 사실이 먼저 읽혀야 한다 */}
                    <Text
                      {...numeralScaling}
                      className="font-display-bold text-body"
                      style={{ color: active ? c.onPrimary : c.ink }}
                    >
                      {s.label}
                    </Text>
                    <Text
                      {...numeralScaling}
                      className="font-kr-medium text-[11px] pt-[2px]"
                      style={{ color: active ? c.onPrimary : c.muted }}
                    >
                      {isPick ? '내 템포' : s.nickname}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/*
            선택한 속도에서 백스윙·다운스윙이 각각 몇 초인지 사실대로 보여준다.
            "왜 이 속도를 골랐는지"를 스스로 설명할 수 있게 하는 장치다.
          */}
            <Text
              {...koreanWrap}
              {...textScaling}
              className="font-kr-medium text-caption text-muted dark:text-mutedDark text-center pt-s2"
            >
              {`백스윙 ${breakdown.backswingSec.toFixed(2)}초 · 다운스윙 ${breakdown.downswingSec.toFixed(2)}초`}
            </Text>

            {/*
            추천 안내 (2026-08-01)

            추천은 "네가 도달해야 할 목표"가 아니라 **측정된 네 스윙에 가장 가까운
            출발점**이다. 그래서 근거가 된 실측값을 반드시 함께 보여준다 —
            숫자를 감추고 "이게 당신에게 맞아요"라고만 하면 근거 없는 단정이 된다.
          */}
            {recommendation && recommendation.speed.id !== swingSpeed && (
              <Pressable
                onPress={() => changeSpeed(recommendation.speed.id)}
                accessibilityRole="button"
                accessibilityLabel={`내 스윙은 ${recommendation.measuredSec.toFixed(2)}초입니다. 추천 속도 ${recommendation.speed.label}로 맞추기`}
                style={{ minHeight: 48 }}
                className="mt-s2 rounded-card border border-line dark:border-lineDark px-s2 py-[10px] justify-center active:opacity-70"
              >
                <Text
                  {...koreanWrap}
                  {...textScaling}
                  className="font-kr-medium text-caption text-muted dark:text-mutedDark text-center"
                >
                  {`내 스윙은 ${recommendation.measuredSec.toFixed(2)}초예요 · 탭하면 ${recommendation.speed.label}로 맞춰요`}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>

      <Toast message={toastMessage} />
    </SafeAreaView>
  );
}
