import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { palette } from '../constants/theme';
import { TempoRing } from '../components/TempoRing';
import { Caption, MIN_TOUCH, koreanWrap, numeralScaling, textScaling } from '../components/ui';
import {
  characterForRatio,
  formatRatioWithPrecision,
  formatSeconds,
  precisionForFps,
} from '../features/tempo/character';
import { recommendSwingSpeed, swingSecLabel } from '../features/tempo/swingSpeeds';
import { playCue } from '../features/audio-engine/cues';
import { SWING_CLUBS, computeTempo, useSwingStore, type SwingClub } from '../store/useSwingStore';
import { usePracticeStore } from '../store/usePracticeStore';
import { useSettingsStore } from '../store/useSettingsStore';

/**
 * "기준 리듬"으로 쓸 프리셋. 비율이 3:1 근처로 모인다는 관찰이 반복 확인되는
 * 축이라, 대안을 제시한다면 여기서만 제시한다(속도는 근거가 없어 제시하지 않는다).
 */
const REFERENCE_PRESET_ID = 'preset-3-1';

/**
 * 결과 — 내 템포 저장
 *
 * 시안 근거: App UI ④ / Premium
 *   숫자 하나로 보상감을 주는 화면. 비율을 크게 보여주고,
 *   그 아래 성향 한 줄로 "내 리듬이 어떤 편인지"를 말로 바꿔준다.
 */
function defaultName(t: TFunction): string {
  const d = new Date();
  return t('result:nameSection.defaultName', { month: d.getMonth() + 1 });
}

export default function ResultScreen() {
  const router = useRouter();
  const { t } = useTranslation(['result', 'common', 'domain']);
  const { colorScheme } = useColorScheme();
  const c = palette(colorScheme);

  const params = useLocalSearchParams<{
    start?: string;
    top?: string;
    impact?: string;
    videoUri?: string;
    fps?: string;
  }>();

  /**
   * ⚠️ 2026-08-06 딥링크 방어 (AOS 리뷰 Q-3)
   *
   * 이전엔 파라미터가 없으면 개발용 더미값(top 0.56 / impact 0.74)으로 떨어졌다.
   * `mytempo://` scheme이 매니페스트에 선언돼 있어 **`mytempo://result`로 바로
   * 들어올 수 있고**, 그러면 아무도 측정하지 않은 "약 3:1" 가짜 결과가 만들어져
   * 저장까지 됐다. 실사용 빈도는 낮지만 사용자 데이터를 오염시키는 경로다.
   *
   * 마킹 값이 없으면 결과 화면이 존재할 이유가 없으므로 마킹 화면으로 보낸다.
   * (에러를 띄우지 않는 이유: 사용자 잘못이 아니고, 할 일이 명확하다)
   */
  const hasMarks =
    params.start !== undefined && params.top !== undefined && params.impact !== undefined;

  const marks = {
    start: Number(params.start ?? 0),
    top: Number(params.top ?? 0),
    impact: Number(params.impact ?? 0),
  };
  const { backswingSec, downswingSec, ratio, suspicious } = computeTempo(marks);

  /**
   * 표시 정밀도 (2026-07-31 신설)
   *
   * 30fps 영상은 다운스윙이 8프레임뿐이라 소수 첫째자리가 잡음이다. 게다가 노출 중
   * 클럽헤드가 약 67cm 이동해 임팩트 프레임 자체가 번진다. 그래서 fps가 낮으면
   * "약 3:1"처럼 정수로만 표시한다 — 없는 정밀도를 있는 척하지 않는다(창업자 확정).
   */
  const sourceFps = params.fps ? Number(params.fps) : undefined;
  const precision = precisionForFps(sourceFps && sourceFps > 0 ? sourceFps : undefined);
  const display = formatRatioWithPrecision(ratio, precision);
  const videoUri = params.videoUri || undefined;

  const [name, setName] = useState(defaultName(t));
  /**
   * 클럽 종류 (2026-08-07, T-06 피드백 — "내 스윙 관리" 방안).
   * 등록 시점에 알면 바로 붙이지만, 강제하지 않는다 — 안 고르면 미지정으로 저장되고
   * my-swings 목록에서 나중에 붙여도 된다.
   */
  const [club, setClub] = useState<SwingClub | null>(null);
  /**
   * 성향 한 줄 (2026-08-20 수정) — `characterForRatio()`의 임계값(2.75/3.25)은
   * 드라이버·아이언 풀스윙 전제라, 어프로치·퍼팅(2:1 근방)을 그 잣대로 재면
   * "고르게"(올리고 내리는 시간 차가 작다) 같은 안 맞는 문구가 나온다
   * (`character.ts` 2026-08-19 T-39 주석에 남아 있던 미해결 이슈). 클럽을
   * 어프로치·퍼팅으로 고르면 비율 계산 대신 그 클럽 전용 라벨을 직접 쓴다.
   */
  const character = club === 'approach' || club === 'putting' ? club : characterForRatio(ratio);
  /**
   * 템포 선택 (2026-08-08, 실기기 검증 — "등록하기 버튼이 없어서 헷갈림").
   *
   * 이전엔 "내 스윙 그대로"/"3:1 리듬으로"가 각각 누르는 즉시 등록+이동하는
   * 버튼이었다. 그 결과 "등록"이라는 말이 붙은 유일한 버튼이 맨 아래 텍스트인
   * [등록만 하기]뿐이라, 사용자가 그걸 눌러야 등록되는 줄 알고 거기로 몰렸다.
   * 이제 둘은 클럽 종류처럼 **고르기만 하는 선택지**이고, 실제 등록은 아래
   * 단 하나의 [등록하기] 버튼이 담당한다.
   */
  const [tempoMode, setTempoMode] = useState<'mine' | 'reference'>('mine');

  /**
   * 스크롤 완료 후 등록 가능 (2026-08-08, 사용자 테스트 피드백).
   *
   * "등록하기" 버튼이 위 스크롤 영역 밖의 고정 푸터라, 이름 붙이기·클럽 선택을
   * 보지 않고도 바로 누를 수 있었다 — 실제로 그렇게 눌러버리는 사용자가 많았다.
   * 버튼을 완전히 숨기면 2026-08-08 이전 버전에서 겪었던 "등록하기 버튼이 안
   * 보여서 헷갈림" 문제가 재발하므로, 숨기지 않고 **스크롤을 끝까지 내리기
   * 전엔 비활성 상태로 보여준다.** 화면이 이미 다 보이는 큰 기기에서는
   * 스크롤할 게 없으므로 처음부터 활성 상태다.
   */
  const [scrollLayoutHeight, setScrollLayoutHeight] = useState(0);
  const [scrollContentHeight, setScrollContentHeight] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const SCROLL_END_THRESHOLD = 24;
  const canRegister =
    scrollContentHeight <= scrollLayoutHeight + SCROLL_END_THRESHOLD ||
    scrollY + scrollLayoutHeight >= scrollContentHeight - SCROLL_END_THRESHOLD;

  const uiSounds = useSettingsStore((s) => s.uiSounds);
  const beepVolume = useSettingsStore((s) => s.beepVolume);
  const addSwing = useSwingStore((s) => s.addSwing);
  const selectSwing = usePracticeStore((s) => s.selectSwing);
  const selectPreset = usePracticeStore((s) => s.selectPreset);
  const setSwingSpeed = usePracticeStore((s) => s.setSwingSpeed);

  /**
   * 이 스윙에 맞는 속도 단계 (2026-08-01, WBS 2.12)
   *
   * 여기가 추천을 하기에 가장 좋은 자리다 — 방금 **자기 스윙을 직접 측정한 순간**이라
   * 근거가 눈앞에 있고, 바로 그 속도로 연습을 시작할 수 있다.
   *
   * ⚠️ 추천하는 건 "네가 도달해야 할 목표"가 아니라 **지금 네 몸이 내는 속도에 가장
   * 가까운 출발점**이다. 절대 속도는 사람마다 다르고, 일관되게 관찰되는 건 비율이지
   * "빠를수록 낫다"가 아니다. 근거 없는 목표를 제시하지 않는다.
   */
  const pick = recommendSwingSpeed([{ backswingSec, downswingSec }]);

  /**
   * 저장 후 어디로 갈지 (2026-08-01 창업자 피드백으로 3갈래로 분리)
   *
   * 창업자 지적: "'이 템포로 바로 연습' 말고 '1.07초 단계로 연습하기' 버튼이 따로
   * 있어야 할 것 같다." — 맞는 지적이었다. 기존 버튼 하나가 **비율과 속도를 동시에**
   * 바꾸고 있었는데, 화면에는 속도 얘기만 쓰여 있어서 무엇이 적용되는지 알 수 없었다.
   *
   * 이제 두 갈래가 실제로 다른 일을 한다.
   *   'mine'      = 내 비율 + 내 속도   → 방금 친 스윙을 그대로 재현
   *   'reference' = 3:1 비율 + 내 속도  → 속도는 그대로 두고 비율만 기준으로
   *
   * ⚠️ 왜 속도가 아니라 비율만 바꾸는 선택지를 주는가:
   * 절대 속도는 사람마다 달라 "더 빨라져야 한다"고 말할 근거가 없지만, **비율은
   * 3:1 근처로 모인다는 관찰이 반복해서 확인된다.** 근거가 있는 축에서만 대안을
   * 제시하는 것이다. 강요가 아니라 선택지로 두고, 내 리듬 그대로 하기를 먼저 놓는다.
   */
  function save(mode: 'mine' | 'reference' | 'saveOnly') {
    const id = `swing-${Date.now()}`;
    /*
      등록 완료 확인음 (2026-08-06, T-24)
      시그니처 사운드의 마지막 두 음(E3 → B4, 3:1)만 떼어 쓴다.
      로고를 축약해 쓰는 것이라 들을 때마다 브랜드가 강화된다.
      → scripts/generate-sound-packs.py §2-④
    */
    if (uiSounds) playCue('saved', beepVolume);
    addSwing({
      id,
      name: name.trim() || defaultName(t),
      marks,
      backswingSec,
      downswingSec,
      ratio,
      videoUri,
      sourceFps,
      createdAt: new Date().toISOString(),
      club: club ?? undefined,
    });

    if (mode === 'reference') selectPreset(REFERENCE_PRESET_ID);
    else selectSwing(id);

    // 연습하러 갈 때는 속도까지 맞춰준다.
    // 여기서 안 맞춰주면 사용자가 연습 화면에서 한 번 더 골라야 한다.
    if (pick && mode !== 'saveOnly') setSwingSpeed(pick.speed.id);

    if (mode === 'saveOnly') router.replace('/(tabs)/my-swings');
    else router.replace('/practice');
  }

  /* 훅을 전부 호출한 뒤에 분기한다 — 훅 순서가 조건에 따라 달라지면 안 된다 */
  if (!hasMarks) return <Redirect href="/marking" />;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bgDark" edges={['top', 'bottom']}>
      {/*
        2026-08-01: View → ScrollView (작은 화면·큰 글씨 설정에서도 안전하도록).
        2026-08-08: 실기기 검증 — "스크롤 없이 한눈에 보고 싶다"는 피드백으로
        내용 자체를 줄였다(추천 카드 문구 축약, 템포 버튼 2장 → 선택지+버튼 1개).
        showsVerticalScrollIndicator도 꺼서, 그래도 넘치는 아주 작은 화면·확대
        글꼴 설정에서 스크롤이 필요하더라도 막대가 시선을 끌지 않게 한다.
      */}
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onLayout={(e) => setScrollLayoutHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setScrollContentHeight(h)}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        /*
          2026-08-08: 등록하기 버튼이 끝까지 스크롤해도 안 켜진다는 제보 수정.
          `onScroll`은 32ms 쓰로틀이 걸려 있어, `scrollToEnd()`(아래 스크롤 힌트
          버튼)로 끝까지 이동해도 딱 맞아떨어지는 마지막 위치 이벤트가 누락될 수
          있었다 — 그 뒤로는 스크롤이 이미 끝이라 추가 onScroll이 안 와서 `scrollY`가
          영영 갱신되지 않았다. 드래그·모멘텀 스크롤이 실제로 멈추는 시점에도
          최종 위치를 한 번 더 반영한다.
        */
        onScrollEndDrag={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        onMomentumScrollEnd={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={32}
      >
        <Caption>{t('result:title')}</Caption>

        <View className="items-center pt-s2">
          <TempoRing
            ratio={ratio}
            size={200}
            colors={{ primary: c.primary, accent: c.accent, track: c.track, dot: c.ink }}
          >
            <Text
              {...numeralScaling}
              accessibilityLabel={t('result:measuredA11y', { value: display.text })}
              className="font-display-bold text-ink dark:text-inkDark"
              style={{ fontSize: precision === 'coarse' ? 40 : 48 }}
            >
              {display.text}
            </Text>
            {display.tolerance && (
              <Text
                {...numeralScaling}
                accessibilityLabel={t('result:toleranceA11y', { value: display.tolerance })}
                className="font-display text-caption text-muted dark:text-mutedDark pt-[2px]"
              >
                {display.tolerance}
              </Text>
            )}
          </TempoRing>

          <Text
            {...numeralScaling}
            accessibilityLabel={t('result:breakdownA11y', {
              backswing: backswingSec.toFixed(2),
              downswing: downswingSec.toFixed(2),
            })}
            className="font-kr-medium text-caption text-muted dark:text-mutedDark pt-s1"
          >
            {formatSeconds(backswingSec)} : {formatSeconds(downswingSec)}
          </Text>
        </View>

        {/* 성향 한 줄 */}
        <View className="bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-lg p-s2 mt-s3">
          <Text {...textScaling} className="font-kr-bold text-body text-ink dark:text-inkDark">
            {t(`domain:character.${character}.headline`)}
          </Text>
          <Caption className="pt-[4px]">{t(`domain:character.${character}.detail`)}</Caption>
        </View>

        {suspicious && <Caption className="pt-s2">{t('result:suspiciousWarning')}</Caption>}

        {/*
          내 템포 추천 (2026-08-01, WBS 2.12)
          실측값을 감추지 않고 그대로 보여준 다음 가장 가까운 단계를 말한다.
          2026-08-08: 화면 길이를 줄이려고 별도 캡션 한 줄(속도 우열 안내)을
          접었다 — 핵심 메시지("빠를수록 좋은 게 아니다")는 온보딩에서 이미
          전달되므로, 여기서는 매 등록마다 반복하지 않아도 된다.
        */}
        {pick && (
          <View className="bg-surface2 dark:bg-surface2Dark rounded-card p-s2 mt-s2">
            <Text
              {...koreanWrap}
              className="font-kr-medium text-caption text-ink dark:text-inkDark"
            >
              {t(
                pick.outOfRange
                  ? 'result:recommendation.outOfRange'
                  : 'result:recommendation.inRange',
                {
                  measured: pick.measuredSec.toFixed(2),
                  speed: t('domain:units.seconds', { value: swingSecLabel(pick.speed.swingSec) }),
                },
              )}
            </Text>
          </View>
        )}

        {/* 이름 붙이기 */}
        <View className="pt-s2">
          <Caption className="pb-[6px]">{t('result:nameSection.label')}</Caption>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('result:nameSection.placeholder')}
            /* 2026-08-06: placeholder도 읽어야 하는 글자다 — subtle(3.19:1) → muted(5.55:1) */
            placeholderTextColor={c.muted}
            maxLength={20}
            returnKeyType="done"
            accessibilityLabel={t('result:nameSection.a11yLabel')}
            {...textScaling}
            className="bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-card px-s2 py-s2 font-kr-medium text-body text-ink dark:text-inkDark"
          />
          {/*
            20자 제한(2026-07-31 추가) — 제한이 없으면 my-swings/history 리스트에서
            이름이 길 때 카드 레이아웃(숫자·성향 라벨과 한 줄에 배치)이 깨질 수 있었다.
          */}
        </View>

        {/*
          클럽 종류 (2026-08-07, T-06 피드백)
          강제하지 않는다 — 안 골라도 등록은 그대로 된다. 같은 걸 다시 탭하면 해제.
        */}
        <View className="pt-s2">
          <Caption className="pb-[6px]">{t('result:clubSection.label')}</Caption>
          <View className="flex-row gap-[6px]">
            {SWING_CLUBS.map((c2) => {
              const active = club === c2.id;
              const label = t(`domain:clubs.${c2.id}`);
              return (
                <Pressable
                  key={c2.id}
                  onPress={() => {
                    const next = active ? null : c2.id;
                    setClub(next);
                    /*
                      2026-08-20: 어프로치·퍼팅엔 무료 기준 리듬(3:1)이 없다 —
                      3:1은 드라이버·아이언 전용 관찰치다. "기준 리듬으로" 선택지
                      자체를 숨기므로, 이미 그쪽을 고른 상태에서 클럽을 바꾸면
                      선택을 "내 스윙 그대로"로 되돌려 숨겨진 상태값이 안 남게 한다.
                    */
                    if (next === 'approach' || next === 'putting') setTempoMode('mine');
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: active, selected: active }}
                  style={{ minHeight: MIN_TOUCH }}
                  className={`flex-1 items-center justify-center rounded-card px-s2 ${
                    active ? 'bg-primary dark:bg-primary-neon' : 'bg-surface2 dark:bg-surface2Dark'
                  } active:opacity-80`}
                >
                  <Text
                    {...textScaling}
                    className="font-kr-medium text-body"
                    style={{ color: active ? c.onPrimary : c.ink }}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/*
          템포 선택 — 2026-08-08 신설. 예전엔 이 자리의 두 버튼을 누르는 즉시
          등록+이동했다. 이제 클럽 종류와 같은 성격의 "선택"으로 바꾸고, 실제
          등록은 하단의 [등록하기] 버튼 하나로 모은다(아래 액션 영역 참고).
        */}
        <View className="pt-s2">
          <Caption className="pb-[6px]">{t('result:tempoSection.label')}</Caption>
          <View className="flex-row gap-[6px]">
            <Pressable
              onPress={() => setTempoMode('mine')}
              accessibilityRole="radio"
              accessibilityLabel={t('result:tempoSection.mine')}
              accessibilityState={{ checked: tempoMode === 'mine', selected: tempoMode === 'mine' }}
              style={{ minHeight: MIN_TOUCH }}
              className={`flex-1 items-center justify-center rounded-card px-s2 ${
                tempoMode === 'mine'
                  ? 'bg-primary dark:bg-primary-neon'
                  : 'bg-surface2 dark:bg-surface2Dark'
              } active:opacity-80`}
            >
              <Text
                {...textScaling}
                className="font-kr-medium text-body"
                style={{ color: tempoMode === 'mine' ? c.onPrimary : c.ink }}
              >
                {t('result:tempoSection.mine')}
              </Text>
            </Pressable>
            {/*
              2026-08-20: "기준 리듬으로"(3:1)는 드라이버·아이언 전용 — 3:1은
              그 두 클럽에서만 반복 관찰된 값이고, 어프로치·퍼팅의 근거 있는 비율은
              2:1([[T-39]] 조사)이라 다르다. 무료로 내보낼 수 있는 2:1 기준 리듬이
              아직 없으므로(카탈로그의 2:1은 프리미엄 전용), 어프로치·퍼팅을 고른
              동안엔 이 선택지 자체를 숨긴다 — 없는 근거를 있는 척 보여주지 않는다.
            */}
            {club !== 'approach' && club !== 'putting' && (
              <Pressable
                onPress={() => setTempoMode('reference')}
                accessibilityRole="radio"
                accessibilityLabel={t('result:tempoSection.referenceA11y')}
                accessibilityState={{
                  checked: tempoMode === 'reference',
                  selected: tempoMode === 'reference',
                }}
                style={{ minHeight: MIN_TOUCH }}
                className={`flex-1 items-center justify-center rounded-card px-s2 ${
                  tempoMode === 'reference'
                    ? 'bg-primary dark:bg-primary-neon'
                    : 'bg-surface2 dark:bg-surface2Dark'
                } active:opacity-80`}
              >
                <Text
                  {...textScaling}
                  className="font-kr-medium text-body"
                  style={{ color: tempoMode === 'reference' ? c.onPrimary : c.ink }}
                >
                  {t('result:tempoSection.referenceLabel')}
                </Text>
              </Pressable>
            )}
          </View>
          <Caption className="pt-[6px]">
            {tempoMode === 'mine'
              ? t('result:tempoSection.mineSummary', {
                  ratio: display.text,
                  speed: pick
                    ? t('domain:units.seconds', { value: swingSecLabel(pick.speed.swingSec) })
                    : t('result:tempoSection.defaultWord'),
                })
              : pick
                ? t('result:tempoSection.referenceSummaryWithSpeed', {
                    speed: t('domain:units.seconds', { value: swingSecLabel(pick.speed.swingSec) }),
                  })
                : t('result:tempoSection.referenceSummaryNoSpeed')}
          </Caption>
        </View>
      </ScrollView>

      {/*
        하단 액션 (2026-08-08 재설계 — "등록하기 버튼이 없어서 헷갈림")

        예전엔 여기 두 버튼("내 스윙 그대로"/"3:1 리듬으로")이 각각 누르는 즉시
        등록+이동을 겸했다. "등록"이란 말이 붙은 버튼이 맨 아래 텍스트뿐이라
        사용자가 등록하려면 그쪽을 눌러야 하는 줄 알고 몰렸다(실기기 피드백).
        이제 템포 선택(위 스크롤 영역의 라디오)과 등록 행위를 분리해서, 여기는
        **등록하기 버튼 하나**만 둔다 — 누르면 위에서 고른 템포로 저장하고
        연습으로 넘어간다.
      */}
      <View className="px-s3 pb-s2 gap-[8px]">
        {!canRegister && (
          <Pressable
            onPress={() => scrollRef.current?.scrollToEnd({ animated: true })}
            accessibilityRole="button"
            accessibilityLabel={t('result:scrollHint.a11y')}
            className="items-center pb-[2px]"
          >
            <Caption>{t('result:scrollHint.text')}</Caption>
          </Pressable>
        )}
        <Pressable
          onPress={() => canRegister && save(tempoMode)}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canRegister }}
          accessibilityLabel={
            !canRegister
              ? t('result:registerButton.a11yDisabled')
              : tempoMode === 'mine'
                ? t('result:registerButton.a11yMine', {
                    ratio: display.text,
                    speed: pick
                      ? t('domain:units.seconds', { value: swingSecLabel(pick.speed.swingSec) })
                      : t('result:tempoSection.defaultWord'),
                  })
                : t('result:registerButton.a11yReference')
          }
          style={{ minHeight: MIN_TOUCH, opacity: canRegister ? 1 : 0.4 }}
          className="rounded-card items-center justify-center py-s2 bg-primary dark:bg-primary-neon active:opacity-80"
        >
          <Text
            {...textScaling}
            className="font-kr-bold text-body text-onPrimary dark:text-onPrimaryDark"
          >
            {t('result:registerButton.label')}
          </Text>
        </Pressable>

        {/* 2026-08-06 용어 통일: 스윙은 "등록"한다 (AOS 리뷰 B-2) */}
        <Pressable
          onPress={() => canRegister && save('saveOnly')}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canRegister }}
          accessibilityLabel={t('result:saveOnlyButton.a11yLabel')}
          style={{ minHeight: MIN_TOUCH, opacity: canRegister ? 1 : 0.4 }}
          className="items-center justify-center py-s1 active:opacity-70"
        >
          <Text
            {...textScaling}
            className="font-kr-medium text-caption text-muted dark:text-mutedDark"
          >
            {t('result:saveOnlyButton.label')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
