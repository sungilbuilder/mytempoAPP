import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { palette } from '../constants/theme';
import {
  Caption,
  IconButton,
  IconCheck,
  IconChevronLeft,
  LockBadge,
  Logo,
  MIN_TOUCH,
  Segmented,
  Switch,
  numeralScaling,
  textScaling,
} from '../components/ui';
import { useSettingsStore, type ThemeMode } from '../store/useSettingsStore';
import { useLanguageStore, type LanguagePref } from '../store/useLanguageStore';
import {
  CUSTOM_SHOT_INTERVAL_MAX,
  CUSTOM_SHOT_INTERVAL_MIN,
  SHOT_INTERVALS,
  SOUND_PACKS,
} from '../features/audio-engine/soundPacks';
import { playCue } from '../features/audio-engine/cues';
import { useSoundPreview } from '../features/audio-engine/useSoundPreview';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { useEntitlement } from '../store/useEntitlementStore';

/**
 * 설정 — 화면 · 소리/진동 · 접근성
 *
 * 시안 근거: Premium "설정"
 *   왜: 접근성(글자 크기)을 상단 근처에 둬 5060 사용자 이탈을 막으면서도
 *   20-30대에겐 과하게 노출되지 않는 위치에 배치.
 *
 * 모든 값은 AsyncStorage에 저장되어 앱을 재시작해도 유지된다(WBS 3.1a).
 */
function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between py-s2" style={{ minHeight: MIN_TOUCH }}>
      <View className="flex-1 pr-s2">
        <Text {...textScaling} className="font-kr-medium text-body text-ink dark:text-inkDark">
          {label}
        </Text>
        {hint ? <Caption className="pt-[2px]">{hint}</Caption> : null}
      </View>
      {children}
    </View>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="pt-s3">
      <Caption className="pb-[6px]">{title}</Caption>
      <View className="bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-lg px-s2">
        {children}
      </View>
    </View>
  );
}

/**
 * 샷 간격 직접 입력 (2026-08-09 신설)
 *
 * [[v1.0-출시사양]] Premium §2 "어드레스 대기시간 커스텀"은 스펙에만 있고 코드로는
 * 없던 항목이었다 — 프리셋 4종(soundPacks.ts SHOT_INTERVALS) 밖의 임의 초 값을
 * 프리미엄 사용자에게 열어준다. 재생 엔진(metronome.ts startShotCycle)이 이미
 * 임의의 초 값을 안전하게 처리하므로(하한 500ms 클램프) 새 프리셋을 추가하는 게
 * 아니라 값 자체를 그대로 저장소에 흘려보낸다.
 *
 * 타이핑 중간값("2" → "20")이 그대로 적용되지 않도록, 커밋은 blur(엔터/포커스
 * 아웃) 시점에만 하고 그 사이엔 로컬 텍스트만 갱신한다.
 */
function CustomShotIntervalRow({
  value,
  locked,
  onCommit,
  c,
}: {
  value: number;
  locked: boolean;
  onCommit: (v: number) => void;
  c: ReturnType<typeof palette>;
}) {
  const { t } = useTranslation(['settings', 'common']);
  const isCustomSelected = !SHOT_INTERVALS.some((s) => s.value === value);
  const [text, setText] = useState(isCustomSelected ? String(value) : '');

  // 다른 화면(온보딩 등)에서 값이 바뀌어 돌아와도 표시값이 어긋나지 않게 한다.
  useEffect(() => {
    if (isCustomSelected) setText(String(value));
  }, [value, isCustomSelected]);

  function commit() {
    const n = Math.round(Number(text));
    if (!Number.isFinite(n) || text === '') {
      setText(isCustomSelected ? String(value) : '');
      return;
    }
    const clamped = Math.min(CUSTOM_SHOT_INTERVAL_MAX, Math.max(CUSTOM_SHOT_INTERVAL_MIN, n));
    setText(String(clamped));
    onCommit(clamped);
  }

  const label = t('settings:shotIntervalGroup.custom.label');
  const hint = t('settings:shotIntervalGroup.custom.hint', {
    min: CUSTOM_SHOT_INTERVAL_MIN,
    max: CUSTOM_SHOT_INTERVAL_MAX,
  });

  return (
    <Row label={label} hint={hint}>
      <View className="flex-row items-center gap-[8px]">
        {locked && <LockBadge />}
        <TextInput
          value={text}
          editable={!locked}
          onChangeText={(s) => setText(s.replace(/[^0-9]/g, ''))}
          onEndEditing={commit}
          onSubmitEditing={commit}
          placeholder={t('settings:shotIntervalGroup.custom.placeholder')}
          placeholderTextColor={c.muted}
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={3}
          accessibilityLabel={`${label}, ${hint}${locked ? t('settings:soundPackGroup.premiumSuffix') : ''}`}
          accessibilityState={{ disabled: locked }}
          {...numeralScaling}
          className={`w-[48px] text-right font-kr-medium text-body py-[2px] border-b ${
            locked
              ? 'text-muted dark:text-mutedDark border-line dark:border-lineDark'
              : 'text-ink dark:text-inkDark border-line dark:border-lineDark'
          }`}
        />
        <Caption>{t('settings:shotIntervalGroup.custom.unit')}</Caption>
        {isCustomSelected && !locked ? (
          <IconCheck color={c.primary} size={20} />
        ) : (
          <View className="w-[20px]" />
        )}
      </View>
    </Row>
  );
}

const VOLUME_STEPS = [0.4, 0.6, 0.8, 1.0];

export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation(['settings', 'common', 'domain']);
  const { colorScheme } = useColorScheme();
  const c = palette(colorScheme);

  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const beepVolume = useSettingsStore((s) => s.beepVolume);
  const setBeepVolume = useSettingsStore((s) => s.setBeepVolume);
  const hapticOnImpact = useSettingsStore((s) => s.hapticOnImpact);
  const toggleHaptic = useSettingsStore((s) => s.toggleHaptic);
  const keepAwake = useSettingsStore((s) => s.keepAwake);
  const toggleKeepAwake = useSettingsStore((s) => s.toggleKeepAwake);
  const uiSounds = useSettingsStore((s) => s.uiSounds);
  const toggleUiSounds = useSettingsStore((s) => s.toggleUiSounds);
  const soundPack = useSettingsStore((s) => s.soundPack);
  const setSoundPack = useSettingsStore((s) => s.setSoundPack);
  const shotIntervalSec = useSettingsStore((s) => s.shotIntervalSec);
  const setShotInterval = useSettingsStore((s) => s.setShotInterval);
  const playPreview = useSoundPreview();
  // fontScale은 v1 UI에서 제외 — 아래 접근성 섹션 주석 참고 (WBS 1.13)
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);
  const { full: hasFullAccess, trialActive, trialDaysLeft } = useEntitlement();

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bgDark" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-s3 pt-s1 pb-s1">
        <IconButton label={t('settings:backA11y')} onPress={() => router.back()}>
          <IconChevronLeft color={c.ink} size={22} />
        </IconButton>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          {...textScaling}
          accessibilityRole="header"
          className="font-kr-bold text-h1 text-ink dark:text-inkDark"
        >
          {t('settings:title')}
        </Text>

        <Group title={t('settings:screenGroup')}>
          <Row label={t('settings:theme.label')}>
            <View className="w-[190px]">
              <Segmented<ThemeMode>
                value={themeMode}
                onChange={setThemeMode}
                a11yLabel={t('settings:theme.label')}
                options={[
                  { value: 'light', label: t('settings:theme.light') },
                  { value: 'dark', label: t('settings:theme.dark') },
                  { value: 'auto', label: t('settings:theme.auto') },
                ]}
              />
            </View>
          </Row>
        </Group>

        <Group title={t('settings:languageGroup')}>
          <Row label={t('settings:language.label')}>
            <View className="w-[220px]">
              <Segmented<LanguagePref>
                value={language}
                onChange={setLanguage}
                a11yLabel={t('settings:language.label')}
                options={[
                  { value: 'auto', label: t('settings:language.auto') },
                  { value: 'ko', label: t('settings:language.ko') },
                  { value: 'en', label: t('settings:language.en') },
                ]}
              />
            </View>
          </Row>
        </Group>

        <Group title={t('settings:soundGroup')}>
          <Row label={t('settings:volume.label')} hint={`${Math.round(beepVolume * 100)}%`}>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={t('settings:volume.label')}
              className="flex-row gap-[6px]"
            >
              {VOLUME_STEPS.map((v) => {
                const active = Math.abs(v - beepVolume) < 0.01;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setBeepVolume(v)}
                    accessibilityRole="radio"
                    accessibilityLabel={t('common:percent', { value: Math.round(v * 100) })}
                    accessibilityState={{ checked: active, selected: active }}
                    style={{ minHeight: 44 }}
                    className={`w-[42px] rounded-sm items-center justify-center ${
                      active
                        ? 'bg-primary dark:bg-primary-neon'
                        : 'bg-surface2 dark:bg-surface2Dark'
                    }`}
                  >
                    <Text
                      {...numeralScaling}
                      className="font-display text-caption"
                      style={{ color: active ? c.onPrimary : c.muted }}
                    >
                      {Math.round(v * 100)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Row>

          <View className="h-[1px] bg-line dark:bg-lineDark" />

          <Row label={t('settings:haptic.label')} hint={t('settings:haptic.hint')}>
            <Switch
              label={t('settings:haptic.label')}
              value={hapticOnImpact}
              onPress={toggleHaptic}
            />
          </Row>

          <View className="h-[1px] bg-line dark:bg-lineDark" />

          {/*
            확인음 (2026-08-06, T-24)
            메트로놈 볼륨과 **다른 축**이라 별도 토글이다. 소리는 켜두고 싶지만
            등록할 때마다 나는 확인음은 싫은 경우가 실제로 있다.
          */}
          <Row label={t('settings:uiSounds.label')} hint={t('settings:uiSounds.hint')}>
            <Switch
              label={t('settings:uiSounds.label')}
              value={uiSounds}
              onPress={() => {
                toggleUiSounds();
                // 켜는 순간 어떤 소리인지 바로 들려준다 — 설명보다 빠르다
                if (!uiSounds) playCue('saved', beepVolume);
              }}
            />
          </Row>

          <View className="h-[1px] bg-line dark:bg-lineDark" />

          <Row label={t('settings:keepAwake.label')} hint={t('settings:keepAwake.hint')}>
            <Switch
              label={t('settings:keepAwake.label')}
              value={keepAwake}
              onPress={toggleKeepAwake}
            />
          </Row>
        </Group>

        {/* 사운드 팩 (2026-08-01, 창업자 요청 / 2026-08-06 게이팅) */}
        <Group title={t('settings:soundPackGroup.title')}>
          {SOUND_PACKS.map((p, i) => {
            const locked = !hasFullAccess && !p.free;
            const selected = soundPack === p.id;
            const label = t(`domain:soundPacks.${p.id}.label`);
            const description = t(`domain:soundPacks.${p.id}.description`);
            return (
              <View key={p.id}>
                {i > 0 && <View className="h-[1px] bg-line dark:bg-lineDark" />}
                {/*
                  탭하면 선택과 동시에 **바로 들려준다** (2026-08-01 창업자 요청).
                  고르기 전에 어떤 소리인지 알 수 없던 문제를 없앤다.

                  ⚠️ 2026-08-06: 잠긴 팩도 **미리듣기는 된다.** 선택만 안 될 뿐이다.
                  무엇을 사는지 못 들어보게 하면 결제 판단을 할 수가 없고,
                  들려주는 데 드는 비용이 없다.
                */}
                <Pressable
                  onPress={() => {
                    if (!locked) setSoundPack(p.id);
                    playPreview(p.id, beepVolume);
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={`${label}, ${description}${locked ? t('settings:soundPackGroup.premiumSuffix') : ''}`}
                  accessibilityHint={
                    locked
                      ? t('settings:soundPackGroup.previewOnlyHint')
                      : t('settings:soundPackGroup.practiceWithThisHint')
                  }
                  accessibilityState={{ checked: selected, selected, disabled: locked }}
                  className="active:opacity-70"
                >
                  <Row label={label} hint={description}>
                    <View className="flex-row items-center gap-[8px]">
                      {/*
                        박자 층이 있는 팩만 표시 (2026-08-01).
                        다른 팩은 소리 색깔만 다르지만 이 팩은 **구조가 다르다** —
                        고르기 전에 그 차이를 알 수 있어야 한다.
                      */}
                      {p.hasPulse && (
                        <View
                          className="px-[6px] py-[2px] rounded-sm"
                          style={{ backgroundColor: c.accent }}
                        >
                          {/* 2026-08-06: 골드 배지 위 흰색은 1.93:1이었다 (AOS 리뷰 V-1) */}
                          <Text
                            {...textScaling}
                            className="font-kr-bold text-[10px]"
                            style={{ color: c.onAccent }}
                          >
                            {t('domain:soundPacks.pulseBadge')}
                          </Text>
                        </View>
                      )}
                      {locked && <LockBadge />}
                      <Text
                        {...textScaling}
                        className="font-kr-medium text-caption text-muted dark:text-mutedDark"
                      >
                        {t('settings:soundPackGroup.listenLabel')}
                      </Text>
                      {selected && !locked ? (
                        <IconCheck color={c.primary} size={20} />
                      ) : (
                        <View className="w-[20px]" />
                      )}
                    </View>
                  </Row>
                </Pressable>
              </View>
            );
          })}
          {!hasFullAccess && (
            <>
              <View className="h-[1px] bg-line dark:bg-lineDark" />
              <View className="py-s2">
                <Caption>{t('settings:soundPackGroup.freeNote')}</Caption>
              </View>
            </>
          )}
        </Group>

        {/*
          샷 간격 (2026-08-01 전면 재설계 — 창업자 지적 + @golf-coach 검토)

          기존 "어드레스 대기(3/5/8초)"는 **루프 시작 전 딱 한 번** 울리는 카운트인이라,
          두 번째 스윙부터는 대기 시간이 아예 없었다. 즉 공 없이 하는 빈 스윙 전용이었다.
          실내 연습장 1샷 사이클은 공이 올라오고·셋업하고·치고·결과를 보는 데
          약 15~30초가 걸린다. 이제 간격을 사이클 안에 넣는다.
          자세한 근거는 features/audio-engine/soundPacks.ts 주석 참고.
        */}
        <Group title={t('settings:shotIntervalGroup.title')}>
          {SHOT_INTERVALS.map((d, i) => {
            const locked = !hasFullAccess && !d.free;
            const selected = shotIntervalSec === d.value;
            const label = t(`domain:shotIntervals.${d.value}.label`);
            const hint = t(`domain:shotIntervals.${d.value}.hint`);
            return (
              <View key={d.value}>
                {i > 0 && <View className="h-[1px] bg-line dark:bg-lineDark" />}
                <Pressable
                  onPress={() => {
                    if (!locked) setShotInterval(d.value);
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={`${label}, ${hint}${locked ? t('settings:soundPackGroup.premiumSuffix') : ''}`}
                  accessibilityState={{ checked: selected, selected, disabled: locked }}
                  className="active:opacity-70"
                >
                  <Row label={label} hint={hint}>
                    <View className="flex-row items-center gap-[8px]">
                      {locked && <LockBadge />}
                      {selected && !locked ? (
                        <IconCheck color={c.primary} size={20} />
                      ) : (
                        <View className="w-[20px]" />
                      )}
                    </View>
                  </Row>
                </Pressable>
              </View>
            );
          })}
          <View className="h-[1px] bg-line dark:bg-lineDark" />
          <CustomShotIntervalRow
            value={shotIntervalSec}
            locked={!hasFullAccess}
            onCommit={setShotInterval}
            c={c}
          />
          <View className="h-[1px] bg-line dark:bg-lineDark" />
          <View className="py-s2">
            <Caption>{t('settings:shotIntervalGroup.note')}</Caption>
          </View>
        </Group>

        {/*
          체험·플랜 안내 (2026-08-06)

          숨기지 않고 한 자리에 사실만 적는다. [[브랜드-가이드]]의 "과장 금지 ·
          팩트 기반"에 맞추려면 여기서 파는 말을 하지 않는 편이 낫다 —
          무엇이 열려 있고 무엇이 아닌지만 말한다.
        */}
        <Group title={t('settings:planGroup.title')}>
          <Row
            label={
              hasFullAccess
                ? trialActive
                  ? t('settings:planGroup.trialActive')
                  : t('settings:planGroup.premium')
                : t('settings:planGroup.free')
            }
            hint={
              trialActive
                ? trialDaysLeft > 0
                  ? t('settings:planGroup.trialDaysLeft', { count: trialDaysLeft })
                  : t('settings:planGroup.trialEndsToday')
                : hasFullAccess
                  ? t('settings:planGroup.premiumHint')
                  : t('settings:planGroup.freeHint')
            }
          >
            <View className="w-[20px]" />
          </Row>
        </Group>

        {/*
          "글자 크기" 설정을 v1에서 뺐다 (2026-08-01).

          이유: 토글은 있었지만 `fontScaleValue()`가 **어디에도 적용되지 않은**
          죽은 기능이었다. 눌러도 화면이 전혀 바뀌지 않으면서 상태 변경만 일으켜,
          실기기에서 리렌더 폭풍의 방아쇠가 됐다(창업자 제보).

          제대로 만들려면 화면 전역의 텍스트가 배율을 따르게 해야 하는데,
          현재 글자 크기가 Tailwind className(text-h1 등)에 하드코딩돼 있어
          토큰 구조부터 손봐야 한다. 절반만 동작하는 접근성 기능은 없느니만
          못하므로, 제대로 구현할 때까지 노출하지 않는다. (WBS 1.13)

          `useSettingsStore.fontScale`과 `fontScaleValue()`는 그대로 남겨둔다 —
          저장된 값이 있는 사용자를 깨뜨리지 않기 위함이고, 구현 시 바로 쓴다.
        */}

        <Group title={t('settings:aboutGroup.title')}>
          <Pressable
            onPress={() => {
              resetOnboarding();
              router.replace('/onboarding');
            }}
            accessibilityRole="button"
            accessibilityLabel={t('settings:aboutGroup.replayOnboardingLabel')}
            accessibilityHint={t('settings:aboutGroup.replayOnboardingA11yHint')}
            className="active:opacity-70"
          >
            <Row
              label={t('settings:aboutGroup.replayOnboardingLabel')}
              hint={t('settings:aboutGroup.replayOnboardingHint')}
            >
              <Text
                {...textScaling}
                importantForAccessibility="no"
                className="font-kr-medium text-body text-muted dark:text-mutedDark"
              >
                ›
              </Text>
            </Row>
          </Pressable>
        </Group>

        {/*
          오픈소스 폰트 라이선스 고지.
          2026-07-31 폰트를 나눔고딕 → Noto Sans KR + Space Grotesk로 교체하면서 문구도 함께 갱신했다.
          (법무 지적사항: 실제로 적용되지 않은 폰트를 고지하면 사실과 불일치하게 된다)
        */}
        {/*
          브랜드 푸터 (2026-07-31 추가)
          설정 화면 최하단은 사용자가 스크롤 끝까지 내려온 자리라 브랜드를 조용히 각인시키기 좋다.
          워드마크를 적극 노출하되 subtle 톤으로 — 기능을 방해하지 않는 선에서.
        */}
        <View className="pt-s4 items-center gap-[10px]">
          <Logo size={20} color={c.primary} accentColor={c.accent} />
          <View className="items-center">
            <Caption>{t('settings:fontLicense')}</Caption>
            <Caption className="pt-[4px]">v0.1.0</Caption>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
