import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { palette } from '../constants/theme';
import { TempoRing } from '../components/TempoRing';
import { Caption, IconClose, IconPlay, IconStop, koreanWrap } from '../components/ui';
import { Metronome } from '../features/audio-engine/metronome';
import { COUNT_IN_SEC, countInAudio } from '../features/audio-engine/soundPacks';
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
import { useHistoryStore, toDateKey } from '../store/useHistoryStore';

/** 배속 1.0 기준 한 사이클(백스윙+다운스윙) 길이 — 오디오 루프 파일 길이와 맞춘 값 */
/**
 * 한 사이클 길이 (ms). **오디오 파일의 실제 길이와 반드시 일치해야 한다.**
 *
 * 2026-08-01 수정: 이전엔 2600이었는데 실제 루프 파일은 1.328초여서 스윙 카운트가
 * 계속 어긋나 있었다. 오디오를 2.0초 구조(백스윙+다운스윙 1.1초 + 휴식 0.9초)로
 * 재생성하면서 이 값도 맞춘다.
 */
const CYCLE_MS = 2000;

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
   * 배속은 스윙 속도에서 파생시킨다 — 상태로 따로 들고 있지 않는다.
   * (둘 다 상태로 두면 재시작 시 서로 어긋난다. usePracticeStore 주석 참고)
   */
  const speed = getSwingSpeed(swingSpeed);
  const rate = speed.rate;
  const isPlaying = usePracticeStore((s) => s.isPlaying);
  const setIsPlaying = usePracticeStore((s) => s.setIsPlaying);

  const beepVolume = useSettingsStore((s) => s.beepVolume);
  const hapticOnImpact = useSettingsStore((s) => s.hapticOnImpact);
  const keepAwakeEnabled = useSettingsStore((s) => s.keepAwake);
  const soundPack = useSettingsStore((s) => s.soundPack);
  const shotIntervalSec = useSettingsStore((s) => s.shotIntervalSec);
  const addSession = useHistoryStore((s) => s.addSession);
  /** 마킹으로 저장해둔 내 스윙 — 템포 추천의 유일한 근거 (2026-08-01) */
  const swings = useSwingStore((s) => s.swings);

  const metronomeRef = useRef<Metronome | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [swingCount, setSwingCount] = useState(0);

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
        // 2026-08-01: 사운드 팩을 반영한 오디오를 쓴다.
        if (!cancelled) await m.load(tempo.audioFileFor(soundPack), beepVolume);
      } catch (e) {
        console.warn('[마이템포] 메트로놈 로드 실패', e);
      }
    })();

    return () => {
      cancelled = true;
      m.unload();
      metronomeRef.current = null;
    };
    // 연습 대상이나 사운드 팩이 바뀌면 다시 로드해야 한다.
  }, [tempo.presetIdForAudio, soundPack]);

  // 볼륨은 재로드 없이 반영
  useEffect(() => {
    metronomeRef.current?.setVolume(beepVolume);
  }, [beepVolume]);

  /* ── 재생 중 경과 시간 / 스윙 카운트 / 임팩트 진동 ── */
  useEffect(() => {
    if (!isPlaying) return;

    const startedAt = Date.now();
    const baseElapsed = elapsedSec;

    const tick = setInterval(() => {
      setElapsedSec(baseElapsed + Math.floor((Date.now() - startedAt) / 1000));
    }, 500);

    /*
      샷 모드에서는 스윙이 15~40초에 한 번만 일어나므로 사이클 타이머로 세면 안 된다.
      실제 스윙 재생 시점에 오디오 엔진이 onSwing을 불러주므로 거기서 센다.
    */
    if (shotIntervalSec > 0) {
      return () => clearInterval(tick);
    }

    const cycleMs = CYCLE_MS / Math.max(0.1, rate);
    const cycle = setInterval(() => {
      setSwingCount((n) => n + 1);
      if (hapticOnImpact) {
        // 오디오 루프와 별개로 도는 JS 타이머라 완전히 동기화되진 않는다.
        // 정밀 동기화는 오디오 엔진 재설계(WBS 2.0)와 함께 다뤄야 한다.
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    }, cycleMs);

    return () => {
      clearInterval(tick);
      clearInterval(cycle);
    };
  }, [isPlaying, rate, hapticOnImpact, shotIntervalSec]);

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
        setIsPlaying(false);
      } else if (shotIntervalSec > 0) {
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
          intervalSec: shotIntervalSec,
          swingCycleSec: CYCLE_MS / 1000,
          rate,
          onSwing: () => {
            setSwingCount((n) => n + 1);
            if (hapticOnImpact) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            }
          },
        });
        setIsPlaying(true);
      } else {
        // 연속(빈 스윙) — 기존처럼 네이티브 루프에 맡긴다
        await m.play(rate);
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('[마이템포] 재생 토글 실패', e);
    } finally {
      togglingRef.current = false;
    }
  }

  /**
   * 스윙 속도 변경 (2026-08-01)
   *
   * 재생 중에 눌러도 끊기지 않고 그 자리에서 빨라지거나 느려진다.
   * 오디오를 새로 로드하지 않고 배속만 바꾸기 때문이다 — 비율은 파일 안에
   * 이미 박혀 있어 배속을 곱해도 그대로 보존된다.
   */
  async function changeSpeed(id: SwingSpeedId) {
    setSwingSpeed(id);
    await metronomeRef.current?.setRate(getSwingSpeed(id).rate);
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
  async function close() {
    await metronomeRef.current?.stop();
    setIsPlaying(false);

    // 10초 미만은 "연습했다"고 보기 어려워 기록하지 않는다.
    if (elapsedSec >= 10) {
      addSession({
        id: `session-${Date.now()}`,
        date: toDateKey(new Date()),
        durationSec: elapsedSec,
        swingCount,
        ratio: tempo.ratio,
        sourceLabel: tempo.isOwnSwing ? '내 스윙' : tempo.label,
      });
    }
    /*
      2026-08-01 창업자 지적: "연습하기 갔다가 정지를 누르니 스윙 등록 화면으로 돌아온다."
      router.back()은 **직전 화면**으로 돌아가는데, 마킹 → 결과 → 연습 경로로 들어왔다면
      그 직전이 결과 화면이라 방금 끝낸 등록 흐름으로 되돌아가 버린다.
      연습을 마친 뒤 갈 곳은 언제나 홈이다.
    */
    router.replace('/(tabs)');
  }

  const mm = String(Math.floor(elapsedSec / 60)).padStart(1, '0');
  const ss = String(elapsedSec % 60).padStart(2, '0');
  const onAccentText = colorScheme === 'dark' ? c.onPrimary : '#FFFFFF';
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
        <Pressable onPress={close} hitSlop={14}>
          <IconClose color={c.subtle} size={22} />
        </Pressable>
        <Text className="font-kr-medium text-caption text-muted dark:text-mutedDark">
          {tempo.isOwnSwing ? '내 스윙' : '기준 리듬'} · {tempo.label}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      {/* 링 — 화면의 주인공 */}
      <View className="flex-1 items-center justify-center">
        <Caption className="pb-s2">BACKSWING : DOWNSWING</Caption>
        <TempoRing
          ratio={tempo.ratio}
          size={266}
          playing={isPlaying}
          rate={rate}
          cycleMs={CYCLE_MS}
          colors={{ primary: c.primary, accent: c.accent, track: c.track, dot: c.ink }}
        >
          {/* 2026-08-01: 홈과 동일하게 색 출처를 팔레트로 통일 (링 안 숫자 실종 대응) */}
          <Text className="font-display-bold text-[60px]" style={{ color: c.ink }}>
            {formatRatio(tempo.ratio)}
          </Text>
        </TempoRing>

        {/* 구간 라벨 */}
        <View className="flex-row gap-s3 pt-s3">
          <View className="flex-row items-center gap-[6px]">
            <View className="w-[8px] h-[8px] rounded-pill" style={{ backgroundColor: c.primary }} />
            <Caption>백스윙 시작</Caption>
          </View>
          <View className="flex-row items-center gap-[6px]">
            <View className="w-[8px] h-[8px] rounded-pill" style={{ backgroundColor: c.accent }} />
            <Caption>임팩트</Caption>
          </View>
        </View>

        <Text {...koreanWrap} className="font-kr-medium text-caption text-subtle dark:text-subtleDark pt-s3">
          {elapsedSec > 0 ? `${mm}분 ${ss}초 · ${swingCount}스윙` : '아직 시작 전이에요'}
        </Text>
      </View>

      {/* 하단 컨트롤 — 주 버튼은 항상 같은 자리 */}
      <View className="px-s3 pb-s2">
        <Pressable
          onPress={toggle}
          className="flex-row items-center justify-center gap-[8px] bg-accent dark:bg-accent-neon rounded-lg py-s3 active:opacity-85"
          style={{
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
          <Text className="font-kr-bold text-h2" style={{ color: onAccentText }}>
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
            className="font-kr-medium text-caption text-subtle dark:text-subtleDark text-center pt-s1"
          >
            {`${shotIntervalSec}초마다 한 번 · 카운트인 5초가 울리면 어드레스`}
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
                  className={`flex-1 items-center py-[10px] rounded-card ${
                    active ? 'bg-primary dark:bg-primary-neon' : 'bg-surface2 dark:bg-surface2Dark'
                  } active:opacity-80`}
                  style={
                    /* 추천 단계는 선택돼 있지 않아도 테두리로 표시해 눈에 띄게 한다 */
                    !active && isPick ? { borderWidth: 1, borderColor: c.accent } : undefined
                  }
                >
                  {/* 초를 주인공으로 — 형용사가 아니라 사실이 먼저 읽혀야 한다 */}
                  <Text
                    className="font-display-bold text-body"
                    style={{ color: active ? onAccentText : c.ink }}
                  >
                    {s.label}
                  </Text>
                  <Text
                    className="font-kr-medium text-[11px] pt-[2px]"
                    style={{ color: active ? onAccentText : c.muted }}
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
            className="font-kr-medium text-caption text-subtle dark:text-subtleDark text-center pt-s2"
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
              className="mt-s2 rounded-card border border-line dark:border-lineDark px-s2 py-[10px] active:opacity-70"
            >
              <Text
                {...koreanWrap}
                className="font-kr-medium text-caption text-subtle dark:text-subtleDark text-center"
              >
                {`내 스윙은 ${recommendation.measuredSec.toFixed(2)}초예요 · 탭하면 ${recommendation.speed.label}로 맞춰요`}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
