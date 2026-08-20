import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { palette } from '../constants/theme';
import {
  Button,
  Caption,
  IconButton,
  IconCheck,
  IconChevronLeft,
  LockBadge,
  Segmented,
  numeralScaling,
  textScaling,
} from '../components/ui';
import {
  TEMPO_PRESETS,
  isPresetFree,
  ratioToBackswingPercent,
  type TempoPresetCategory,
} from '../features/tempo/presets';
import { usePracticeStore } from '../store/usePracticeStore';
import { useEntitlement } from '../store/useEntitlementStore';

/**
 * 세그먼트 순서 = 화면에 보이는 순서.
 *
 * 2026-08-20: "전체" 탭을 없앴다 — 드라이버·아이언 3종(여유롭게/고르게/길게)과
 * 어프로치·퍼팅(프리미엄 잠금)이 한 목록에 섞여 보이면 "템포 바꾸기"가 원래
 * 약속한 "3종 프리셋"(홈 화면 캡션)과 어긋나 보인다는 창업자 지적. 기본값을
 * driver_iron으로 두어 진입 즉시 3종만 보이게 하고, 어프로치·퍼팅은 별개 탭으로
 * 분리해 접근 경로는 그대로 유지한다(T-39 프리미엄 진입점 유지).
 */
type CategoryFilter = TempoPresetCategory;
const CATEGORY_FILTERS: CategoryFilter[] = ['driver_iron', 'approach', 'putting'];

/**
 * 프리셋 — "템포 고르기"
 *
 * 시안 근거: Premium "프리셋"
 *   왜: 선택된 카드에만 테두리+그림자를 줘 다른 카드와 위계를 분리 →
 *   선택 실수로 인한 이탈을 줄인다. 선택엔 체크 마이크로 인터랙션.
 *
 * 탭이 아니라 홈에서 "템포 바꾸기"로 들어오는 화면이다 —
 * 매번 고르는 화면이 아니라 한 번 고르고 마는 화면이라서.
 *
 * ⚠️ 2026-08-19 (T-39) — 카테고리 세그먼트 + 프리미엄 잠금 추가.
 * 어프로치·퍼팅이 신규 프리미엄 축으로 들어오며 드라이버·아이언과 한 목록에
 * 섞이게 됐다. 잠금은 `settings.tsx`의 사운드팩·샷 간격과 같은 패턴을 그대로
 * 따른다 — 잠긴 카드도 목록엔 보이되(감추지 않는다), 탭해도 선택되지 않고
 * `LockBadge`로 표시한다. [[T-39-어프로치퍼팅-프리미엄-프리셋]] 참고.
 */
export default function PresetsScreen() {
  const router = useRouter();
  const { t } = useTranslation(['presets', 'common', 'domain']);
  const { colorScheme } = useColorScheme();
  const c = palette(colorScheme);
  const source = usePracticeStore((s) => s.source);
  const selectPreset = usePracticeStore((s) => s.selectPreset);
  const { full } = useEntitlement();
  const [category, setCategory] = useState<CategoryFilter>('driver_iron');

  const selectedId = source?.kind === 'preset' ? source.presetId : null;
  const visiblePresets = TEMPO_PRESETS.filter((p) => p.category === category);
  const anyLocked = TEMPO_PRESETS.some((p) => !isPresetFree(p)) && !full;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bgDark" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-s3 pt-s1 pb-s2">
        <IconButton label={t('common:back')} onPress={() => router.back()}>
          <IconChevronLeft color={c.ink} size={22} />
        </IconButton>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          {...textScaling}
          accessibilityRole="header"
          className="font-kr-bold text-h1 text-ink dark:text-inkDark"
        >
          {t('presets:title')}
        </Text>
        <Caption className="pt-[6px]">{t('presets:subtitle')}</Caption>

        <View className="pt-s3">
          <Segmented
            options={CATEGORY_FILTERS.map((f) => ({
              value: f,
              label: t(`presets:category.${f}`),
            }))}
            value={category}
            onChange={setCategory}
            a11yLabel={t('presets:categoryGroupA11y')}
          />
        </View>

        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t('presets:radioGroupA11y')}
          className="gap-[12px] pt-s3"
        >
          {visiblePresets.map((preset) => {
            const locked = !full && !isPresetFree(preset);
            const active = preset.id === selectedId && !locked;
            const backPct = ratioToBackswingPercent(preset);
            const alias = t(`domain:character.${preset.characterId}.label`);
            const description = t(`domain:presets.${preset.id}.description`);

            return (
              <Pressable
                key={preset.id}
                onPress={() => {
                  if (!locked) selectPreset(preset.id);
                }}
                accessibilityRole="radio"
                accessibilityLabel={`${alias}, ${preset.ratioLabel}, ${description}${
                  locked ? t('presets:premiumSuffix') : ''
                }`}
                accessibilityHint={locked ? t('presets:lockedHint') : undefined}
                accessibilityState={{ checked: active, selected: active, disabled: locked }}
                className={`rounded-lg p-s2 active:opacity-85 ${
                  active
                    ? 'bg-surface dark:bg-surfaceDark border-2 border-primary dark:border-primary-neon'
                    : 'bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark'
                }`}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-s2">
                    <View className="flex-row items-center gap-[8px]">
                      <Text
                        {...textScaling}
                        className="font-kr-bold text-h2 text-ink dark:text-inkDark"
                      >
                        {alias}
                      </Text>
                      {locked && <LockBadge />}
                      {active && (
                        <View className="w-[20px] h-[20px] rounded-pill items-center justify-center bg-primary dark:bg-primary-neon">
                          <IconCheck color={c.onPrimary} size={13} />
                        </View>
                      )}
                    </View>
                    <Caption className="pt-[4px]">{description}</Caption>
                  </View>
                  <Text
                    {...numeralScaling}
                    className="font-display-bold text-[26px] text-ink dark:text-inkDark"
                  >
                    {preset.ratioLabel}
                  </Text>
                </View>

                {/* 비율 미니 바 — 그린(백스윙) : 골드(다운스윙) */}
                <View className="flex-row h-[8px] rounded-pill overflow-hidden mt-s2 bg-track dark:bg-trackDark">
                  <View
                    style={{ width: `${backPct}%`, backgroundColor: c.primary }}
                    className="h-full"
                  />
                  <View style={{ flex: 1, backgroundColor: c.accent }} className="h-full" />
                </View>
              </Pressable>
            );
          })}
        </View>
        {anyLocked && <Caption className="pt-s3">{t('presets:freeNote')}</Caption>}
      </ScrollView>

      {/*
        2026-08-06 라벨 수정 (AOS 리뷰 U-5)

        카드를 탭하는 순간 `selectPreset()`이 이미 적용되므로 뒤로 나가도 결과가 같다.
        즉 이 버튼은 실제로 "연습 화면으로 이동"만 한다. 라벨을 동작에 맞춘다 —
        선택과 확정이 이중 경로처럼 보이면 사용자는 "눌러야 저장되나?"를 고민한다.
      */}
      <View className="px-s3 pb-s2">
        <Button
          label={t('presets:startButton.label')}
          a11yHint={t('presets:startButton.hint')}
          onPress={() => router.replace('/practice')}
        />
      </View>
    </SafeAreaView>
  );
}
