import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { palette } from '../constants/theme';
import { TempoRing } from '../components/TempoRing';
import { Caption, MIN_TOUCH, koreanWrap, numeralScaling, textScaling } from '../components/ui';
import {
  SLOWMO_HINT,
  characterForRatio,
  formatRatioWithPrecision,
  formatSeconds,
  precisionForFps,
} from '../features/tempo/character';
import { recommendSwingSpeed } from '../features/tempo/swingSpeeds';
import { playCue } from '../features/audio-engine/cues';
import { computeTempo, useSwingStore } from '../store/useSwingStore';
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
function defaultName(): string {
  const d = new Date();
  return `${d.getMonth() + 1}월 스윙`;
}

export default function ResultScreen() {
  const router = useRouter();
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
  const character = characterForRatio(ratio);

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

  const [name, setName] = useState(defaultName());
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
      name: name.trim() || defaultName(),
      marks,
      backswingSec,
      downswingSec,
      ratio,
      videoUri,
      sourceFps,
      createdAt: new Date().toISOString(),
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
        2026-08-01: View → ScrollView.
        추천 카드와 버튼이 늘면서 내용이 화면을 넘쳐 하단 버튼과 겹쳤다
        (창업자 스크린샷에서 '저장만 하기'와 '이름 붙이기'가 겹쳐 보인 문제).
        작은 화면·큰 글씨 설정에서도 안전하도록 스크롤을 연다.
      */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 8 }}
        keyboardShouldPersistTaps="handled"
      >
        <Caption>내 스윙 템포</Caption>

        <View className="items-center pt-s3">
          <TempoRing
            ratio={ratio}
            size={220}
            colors={{ primary: c.primary, accent: c.accent, track: c.track, dot: c.ink }}
          >
            <Text
              {...numeralScaling}
              accessibilityLabel={`측정 결과 ${display.text}`}
              className="font-display-bold text-ink dark:text-inkDark"
              style={{ fontSize: precision === 'coarse' ? 42 : 52 }}
            >
              {display.text}
            </Text>
            {display.tolerance && (
              <Text
                {...numeralScaling}
                accessibilityLabel={`오차 범위 ${display.tolerance}`}
                className="font-display text-caption text-muted dark:text-mutedDark pt-[2px]"
              >
                {display.tolerance}
              </Text>
            )}
          </TempoRing>

          <Text
            {...numeralScaling}
            accessibilityLabel={`백스윙 ${backswingSec.toFixed(2)}초, 다운스윙 ${downswingSec.toFixed(2)}초`}
            className="font-kr-medium text-caption text-muted dark:text-mutedDark pt-s2"
          >
            {formatSeconds(backswingSec)} : {formatSeconds(downswingSec)}
          </Text>
        </View>

        {/* 성향 한 줄 */}
        <View className="bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-lg p-s2 mt-s4">
          <Text {...textScaling} className="font-kr-bold text-body text-ink dark:text-inkDark">
            {character.headline}
          </Text>
          <Caption className="pt-[4px]">{character.detail}</Caption>
        </View>

        {suspicious && (
          <Caption className="pt-s2">
            다운스윙 구간이 매우 짧게 찍혔어요. 마킹을 다시 확인해보는 걸 권합니다.
          </Caption>
        )}

        {/*
          내 템포 추천 (2026-08-01, WBS 2.12)

          실측값을 **감추지 않고 그대로 보여준 다음** 가장 가까운 단계를 말한다.
          "당신에게는 이게 맞아요"라고만 하면 근거 없는 단정이 되기 때문이다.
          범위 밖이면 그 사실도 숨기지 않는다 — 억지로 맞다고 하는 것보다 낫다.
        */}
        {pick && (
          <View className="bg-surface2 dark:bg-surface2Dark rounded-card p-s2 mt-s2">
            <Text
              {...koreanWrap}
              className="font-kr-medium text-caption text-ink dark:text-inkDark"
            >
              {pick.outOfRange
                ? `스윙 전체가 ${pick.measuredSec.toFixed(2)}초예요. 준비된 단계 중에서는 ${pick.speed.label}가 가장 가깝지만 차이가 있는 편이에요.`
                : `스윙 전체가 ${pick.measuredSec.toFixed(2)}초예요. ${pick.speed.label} 단계로 연습하면 지금 리듬 그대로 익힐 수 있어요.`}
            </Text>
            <Caption className="pt-[6px]">
              빠른 속도가 더 좋은 속도는 아니에요. 사람마다 맞는 속도가 다릅니다.
            </Caption>
          </View>
        )}

        {/*
          슬로모 촬영 안내 (2026-07-31 신설)
          창업자 확정: 온보딩이나 마킹 진입이 아니라 **결과 화면에서만** 노출한다.
          촬영 fps가 낮아 정밀도가 떨어질 때만 맥락적으로 뜨므로, 필요 없는 사용자를
          방해하지 않고 강요처럼 읽히지도 않는다. "원하면 더 정확해진다"는 안내다.
        */}
        {display.canImprove && (
          <View className="bg-surface2 dark:bg-surface2Dark rounded-card p-s2 mt-s2">
            <Caption>{SLOWMO_HINT}</Caption>
          </View>
        )}

        {/* 이름 붙이기 */}
        <View className="pt-s3">
          <Caption className="pb-[6px]">이름 붙이기</Caption>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="7월 드라이버"
            /* 2026-08-06: placeholder도 읽어야 하는 글자다 — subtle(3.19:1) → muted(5.55:1) */
            placeholderTextColor={c.muted}
            maxLength={20}
            returnKeyType="done"
            accessibilityLabel="스윙 이름"
            {...textScaling}
            className="bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-card px-s2 py-s2 font-kr-medium text-body text-ink dark:text-inkDark"
          />
          {/*
            20자 제한(2026-07-31 추가) — 제한이 없으면 my-swings/history 리스트에서
            이름이 길 때 카드 레이아웃(숫자·성향 라벨과 한 줄에 배치)이 깨질 수 있었다.
          */}
        </View>
      </ScrollView>

      {/*
        하단 액션 (2026-08-01 — 버튼 1개에서 2개로 분리)

        무엇이 적용되는지 버튼 안에 그대로 적는다. 이전엔 "이 템포로 바로 연습"
        한 줄이라 비율이 바뀌는지 속도가 바뀌는지 알 수 없었다.
        내 리듬 그대로 하는 쪽을 위에 둔다 — 기준을 강요하지 않는다.
      */}
      <View className="px-s3 pb-s2 gap-[8px]">
        {/*
          2026-08-01: 상하 → 좌우 배치 (창업자 요청 "지금은 상하라서 더 보기 어려워").
          두 선택지가 **대등한 갈래**라 위아래로 쌓으면 위가 정답처럼 읽힌다.
          나란히 두면 비교해서 고르는 화면이 된다.
        */}
        <View className="flex-row gap-[8px]">
          <Pressable
            onPress={() => save('mine')}
            accessibilityRole="button"
            accessibilityLabel={`내 스윙 그대로 등록하고 연습하기. 비율 ${display.text}, 속도 ${pick ? pick.speed.label : '기본'}`}
            style={{ minHeight: MIN_TOUCH }}
            className="flex-1 rounded-card items-center justify-center py-s2 px-[6px] bg-primary dark:bg-primary-neon active:opacity-80"
          >
            <Text
              {...koreanWrap}
              {...textScaling}
              className="font-kr-bold text-body text-onPrimary dark:text-onPrimaryDark text-center"
            >
              내 스윙 그대로
            </Text>
            <Text
              {...textScaling}
              className="font-kr-medium text-caption text-onPrimary dark:text-onPrimaryDark opacity-80 pt-[3px] text-center"
            >
              {`${display.text} · ${pick ? pick.speed.label : '기본'}`}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => save('reference')}
            accessibilityRole="button"
            accessibilityLabel="3대 1 기준 리듬으로 연습하기. 속도는 내 스윙에 맞춘 값을 유지합니다"
            style={{ minHeight: MIN_TOUCH }}
            className="flex-1 rounded-card items-center justify-center py-s2 px-[6px] bg-surface2 dark:bg-surface2Dark border border-line dark:border-lineDark active:opacity-80"
          >
            <Text
              {...koreanWrap}
              {...textScaling}
              className="font-kr-bold text-body text-ink dark:text-inkDark text-center"
            >
              3:1 리듬으로
            </Text>
            <Text
              {...textScaling}
              className="font-kr-medium text-caption text-muted dark:text-mutedDark pt-[3px] text-center"
            >
              {pick ? `속도 ${pick.speed.label} 유지` : '비율만 기준으로'}
            </Text>
          </Pressable>
        </View>

        {/* 2026-08-06 용어 통일: 스윙은 "등록"한다 (AOS 리뷰 B-2) */}
        <Pressable
          onPress={() => save('saveOnly')}
          accessibilityRole="button"
          accessibilityLabel="등록만 하고 연습은 나중에"
          style={{ minHeight: MIN_TOUCH }}
          className="items-center justify-center py-s2 active:opacity-70"
        >
          <Text
            {...textScaling}
            className="font-kr-medium text-body text-muted dark:text-mutedDark"
          >
            등록만 하기
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
