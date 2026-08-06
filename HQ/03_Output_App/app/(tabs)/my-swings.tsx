import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { palette } from '../../constants/theme';
import {
  Button,
  Caption,
  IconButton,
  IconCheck,
  IconClose,
  IconTarget,
  koreanWrap,
  numeralScaling,
  textScaling,
} from '../../components/ui';
import { useSwingStore } from '../../store/useSwingStore';
import { usePracticeStore } from '../../store/usePracticeStore';
import { characterForRatio, formatRatio, formatSeconds } from '../../features/tempo/character';
import { humanDate } from '../../store/useHistoryStore';

/**
 * 내 스윙 — 저장해둔 내 템포 목록. (PLANNING.md Feature B)
 * 시안 근거: App UI / Premium — 카드 하나당 비율 하나, 탭하면 그 템포로 연습.
 */
export default function MySwingsScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const c = palette(colorScheme);
  const swings = useSwingStore((s) => s.swings);
  const source = usePracticeStore((s) => s.source);
  const selectSwing = usePracticeStore((s) => s.selectSwing);
  const removeSwing = useSwingStore((s) => s.removeSwing);

  /**
   * 스윙 삭제 (2026-08-01 창업자 요청)
   *
   * 되돌릴 수 없는 동작이라 반드시 한 번 확인을 받는다. 마킹에 몇 분이 드는 데다
   * 잘못 지우면 원본 영상에서 다시 찍어야 하기 때문이다.
   * 카드 전체가 "연습 시작"이므로 삭제는 **작은 전용 영역**으로 분리하고,
   * hitSlop으로 실제 터치 영역만 넉넉히 준다 — 오탭으로 지워지는 게 최악이다.
   */
  function confirmDelete(id: string, name: string) {
    Alert.alert('이 스윙을 지울까요?', `"${name}" 기록이 사라져요. 되돌릴 수 없습니다.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeSwing(id) },
    ]);
  }

  const activeId = source?.kind === 'swing' ? source.swingId : null;

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bgDark" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 32 }}>
        <Text
          {...textScaling}
          accessibilityRole="header"
          className="font-kr-bold text-h1 text-ink dark:text-inkDark"
        >
          내 스윙
        </Text>
        {/* 2026-08-06 용어 통일: 스윙은 "등록"한다 (AOS 리뷰 B-2) */}
        <Caption className="pt-[6px]">
          가장 잘 맞은 스윙 하나를 등록해두면, 그 리듬으로 반복 연습할 수 있어요
        </Caption>

        {swings.length === 0 ? (
          /* 빈 상태 — 실패가 아니라 다음 할 일을 보여준다 */
          <View className="items-center bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-lg px-s3 py-s6 mt-s3">
            <IconTarget color={c.muted} size={34} />
            <Text
              {...koreanWrap}
              {...textScaling}
              className="font-kr-bold text-body text-ink dark:text-inkDark pt-s2"
            >
              아직 등록한 스윙이 없어요
            </Text>
            <Caption className="pt-[6px] text-center">
              영상에서 백스윙 시작·탑·임팩트{'\n'}세 지점만 찍으면 됩니다
            </Caption>
            <Button
              label="내 스윙 등록"
              onPress={() => router.push('/marking')}
              className="w-full mt-s3"
            />
          </View>
        ) : (
          <>
            <View className="gap-[12px] pt-s3">
              {swings.map((swing) => {
                const active = swing.id === activeId;
                const char = characterForRatio(swing.ratio);
                return (
                  <Pressable
                    key={swing.id}
                    onPress={() => {
                      selectSwing(swing.id);
                      router.push('/practice');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${swing.name}, 비율 ${formatRatio(swing.ratio)}, ${char.label}`}
                    accessibilityHint="이 리듬으로 연습을 시작합니다"
                    accessibilityState={{ selected: active }}
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
                            {swing.name}
                          </Text>
                          {active && (
                            <View
                              accessibilityLabel="현재 연습 중인 템포"
                              className="w-[20px] h-[20px] rounded-pill items-center justify-center bg-primary dark:bg-primary-neon"
                            >
                              <IconCheck color={c.onPrimary} size={13} />
                            </View>
                          )}
                        </View>
                        <Caption className="pt-[4px]">
                          {char.label} · {formatSeconds(swing.backswingSec)} :{' '}
                          {formatSeconds(swing.downswingSec)}
                        </Caption>
                        {/* 2026-08-06 용어 통일: 저장 → 등록 (AOS 리뷰 B-2) */}
                        <Caption className="pt-[2px]">
                          {humanDate(swing.createdAt.slice(0, 10))} 등록
                        </Caption>
                      </View>
                      <View className="items-end">
                        <Text
                          {...numeralScaling}
                          className="font-display-bold text-[26px] text-ink dark:text-inkDark"
                        >
                          {formatRatio(swing.ratio)}
                        </Text>
                        <View className="flex-row items-center pt-[4px]">
                          {/*
                            다시 마킹 (2026-08-06 신설, AOS 리뷰 P-5)

                            한 프레임을 잘못 찍으면 이전에는 **삭제 후 갤러리에서
                            처음부터** 해야 했다. 마킹은 이 앱에서 가장 비용이 큰
                            행위인데(몇 분), 그 결과를 고칠 방법이 없었다.
                            원본 영상 참조가 남아 있을 때만 노출한다 — 카메라롤에서
                            지워진 영상에 버튼을 띄우면 눌러도 아무 일이 안 일어난다.
                          */}
                          {swing.videoUri ? (
                            <IconButton
                              label={`${swing.name} 다시 마킹`}
                              hint="원본 영상에서 세 지점을 다시 찍습니다"
                              onPress={() =>
                                router.push({
                                  pathname: '/marking',
                                  params: { videoUri: swing.videoUri as string },
                                })
                              }
                            >
                              <Text
                                {...textScaling}
                                className="font-kr-medium text-caption text-muted dark:text-mutedDark"
                              >
                                다시 마킹
                              </Text>
                            </IconButton>
                          ) : null}

                          {/* 삭제 — 카드 탭(연습 시작)과 겹치지 않게 별도 영역 */}
                          <IconButton
                            label={`${swing.name} 삭제`}
                            hint="되돌릴 수 없습니다"
                            onPress={() => confirmDelete(swing.id, swing.name)}
                          >
                            <IconClose color={c.muted} size={17} />
                          </IconButton>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Button
              label="내 스윙 등록"
              variant="ghost"
              onPress={() => router.push('/marking')}
              className="mt-s3"
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
