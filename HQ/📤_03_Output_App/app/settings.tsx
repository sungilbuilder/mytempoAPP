import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { palette } from '../constants/theme';
import { Caption, IconCheck, IconChevronLeft, Logo, Segmented, Switch } from '../components/ui';
import { useSettingsStore, type ThemeMode } from '../store/useSettingsStore';
import { SHOT_INTERVALS, SOUND_PACKS } from '../features/audio-engine/soundPacks';
import { useSoundPreview } from '../features/audio-engine/useSoundPreview';
import { useOnboardingStore } from '../store/useOnboardingStore';

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
    <View className="flex-row items-center justify-between py-s2">
      <View className="flex-1 pr-s2">
        <Text className="font-kr-medium text-body text-ink dark:text-inkDark">{label}</Text>
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

const VOLUME_STEPS = [0.4, 0.6, 0.8, 1.0];

export default function SettingsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = palette(colorScheme);

  const themeMode = useSettingsStore((s) => s.themeMode);
  const setThemeMode = useSettingsStore((s) => s.setThemeMode);
  const beepVolume = useSettingsStore((s) => s.beepVolume);
  const setBeepVolume = useSettingsStore((s) => s.setBeepVolume);
  const hapticOnImpact = useSettingsStore((s) => s.hapticOnImpact);
  const toggleHaptic = useSettingsStore((s) => s.toggleHaptic);
  const keepAwake = useSettingsStore((s) => s.keepAwake);
  const toggleKeepAwake = useSettingsStore((s) => s.toggleKeepAwake);
  const soundPack = useSettingsStore((s) => s.soundPack);
  const setSoundPack = useSettingsStore((s) => s.setSoundPack);
  const shotIntervalSec = useSettingsStore((s) => s.shotIntervalSec);
  const setShotInterval = useSettingsStore((s) => s.setShotInterval);
  const playPreview = useSoundPreview();
  // fontScale은 v1 UI에서 제외 — 아래 접근성 섹션 주석 참고 (WBS 1.13)
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bgDark" edges={['top', 'bottom']}>
      <View className="flex-row items-center px-s3 pt-s1 pb-s1">
        <Pressable onPress={() => router.back()} hitSlop={14}>
          <IconChevronLeft color={c.ink} size={22} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}>
        <Text className="font-kr-bold text-h1 text-ink dark:text-inkDark">설정</Text>

        <Group title="화면">
          <Row label="테마">
            <View className="w-[190px]">
              <Segmented<ThemeMode>
                value={themeMode}
                onChange={setThemeMode}
                options={[
                  { value: 'light', label: '라이트' },
                  { value: 'dark', label: '다크' },
                  { value: 'auto', label: '자동' },
                ]}
              />
            </View>
          </Row>
        </Group>

        <Group title="소리 · 진동">
          <Row label="소리 크기" hint={`${Math.round(beepVolume * 100)}%`}>
            <View className="flex-row gap-[6px]">
              {VOLUME_STEPS.map((v) => {
                const active = Math.abs(v - beepVolume) < 0.01;
                return (
                  <Pressable
                    key={v}
                    onPress={() => setBeepVolume(v)}
                    className={`w-[38px] py-[7px] rounded-sm items-center ${
                      active
                        ? 'bg-primary dark:bg-primary-neon'
                        : 'bg-surface2 dark:bg-surface2Dark'
                    }`}
                  >
                    <Text
                      className="font-display text-caption"
                      style={{
                        color: active
                          ? colorScheme === 'dark'
                            ? c.onPrimary
                            : '#FFFFFF'
                          : c.muted,
                      }}
                    >
                      {Math.round(v * 100)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Row>

          <View className="h-[1px] bg-line dark:bg-lineDark" />

          <Row label="임팩트에 진동" hint="임팩트 소리에 맞춰 폰이 짧게 울립니다">
            <Switch value={hapticOnImpact} onPress={toggleHaptic} />
          </Row>

          <View className="h-[1px] bg-line dark:bg-lineDark" />

          <Row label="화면 항상 켜기" hint="연습 중 화면이 자동으로 꺼지지 않습니다">
            <Switch value={keepAwake} onPress={toggleKeepAwake} />
          </Row>
        </Group>

        {/* 사운드 팩 (2026-08-01, 창업자 요청) */}
        <Group title="연습 소리 — 탭하면 들어볼 수 있어요">
          {SOUND_PACKS.map((p, i) => (
            <View key={p.id}>
              {i > 0 && <View className="h-[1px] bg-line dark:bg-lineDark" />}
              {/*
                탭하면 선택과 동시에 **바로 들려준다** (2026-08-01 창업자 요청).
                고르기 전에 어떤 소리인지 알 수 없던 문제를 없앤다.
              */}
              <Pressable
                onPress={() => {
                  setSoundPack(p.id);
                  playPreview(p.id, beepVolume);
                }}
                className="active:opacity-70"
              >
                <Row label={p.label} hint={p.description}>
                  <View className="flex-row items-center gap-[10px]">
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
                        <Text
                          className="font-kr-bold text-[10px]"
                          style={{ color: colorScheme === 'dark' ? c.onPrimary : '#FFFFFF' }}
                        >
                          박자
                        </Text>
                      </View>
                    )}
                    <Text className="font-kr-medium text-caption text-subtle dark:text-subtleDark">
                      듣기
                    </Text>
                    {soundPack === p.id ? (
                      <IconCheck color={c.primary} size={20} />
                    ) : (
                      <View className="w-[20px]" />
                    )}
                  </View>
                </Row>
              </Pressable>
            </View>
          ))}
        </Group>

        {/*
          샷 간격 (2026-08-01 전면 재설계 — 창업자 지적 + @golf-coach 검토)

          기존 "어드레스 대기(3/5/8초)"는 **루프 시작 전 딱 한 번** 울리는 카운트인이라,
          두 번째 스윙부터는 대기 시간이 아예 없었다. 즉 공 없이 하는 빈 스윙 전용이었다.
          실내 연습장 1샷 사이클은 공이 올라오고·셋업하고·치고·결과를 보는 데
          약 15~30초가 걸린다. 이제 간격을 사이클 안에 넣는다.
          자세한 근거는 features/audio-engine/soundPacks.ts 주석 참고.
        */}
        <Group title="샷 간격 — 한 스윙에서 다음 스윙까지">
          {SHOT_INTERVALS.map((d, i) => (
            <View key={d.value}>
              {i > 0 && <View className="h-[1px] bg-line dark:bg-lineDark" />}
              <Pressable onPress={() => setShotInterval(d.value)} className="active:opacity-70">
                <Row label={d.label} hint={d.hint}>
                  {shotIntervalSec === d.value ? (
                    <IconCheck color={c.primary} size={20} />
                  ) : (
                    <View className="w-[20px]" />
                  )}
                </Row>
              </Pressable>
            </View>
          ))}
          <View className="h-[1px] bg-line dark:bg-lineDark" />
          <View className="py-s2">
            <Caption>
              연속을 뺀 나머지는 매 스윙 직전에 5초 카운트인이 울려요. 그 소리가 "지금
              어드레스" 신호가 됩니다.
            </Caption>
          </View>
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

        <Group title="앱 정보">
          <Pressable
            onPress={() => {
              resetOnboarding();
              router.replace('/onboarding');
            }}
            className="active:opacity-70"
          >
            <Row label="온보딩 다시 보기" hint="처음 실행했을 때 나오는 소개 화면">
              <Text className="font-kr-medium text-body text-muted dark:text-mutedDark">›</Text>
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
            <Caption>Noto Sans KR, Space Grotesk · SIL Open Font License 1.1</Caption>
            <Caption className="pt-[4px]">v0.1.0</Caption>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
