/**
 * 사운드 미리듣기 (2026-08-01 창업자 요청)
 *
 * 설정에서 소리를 고를 때 "어떤 소리인지 모르고 고르는" 상태를 없앤다.
 * 탭하면 그 자리에서 시작·탑·임팩트 3박이 들린다.
 *
 * 설계 메모:
 * - ⚠️ 2026-08-07 실기기 검증(T-06): 예전엔 탭할 때마다 플레이어를 새로 만들고
 *   끝나면 해제했다. "연습 소리 바꿀 때 소리가 바로 안 들린다"는 제보의 원인이
 *   이거였다 — 로드가 끝나야 들리는데, 그 로드를 탭한 시점에야 시작했기 때문이다.
 *   이제 화면이 뜨는 즉시 4개 팩을 전부 미리 만들어 두고, 탭하면 `seekTo(0)+play()`만
 *   한다.
 * - 연속으로 탭하면 이전 소리를 멈추고 새 소리를 낸다 — 겹쳐 울리면 음색 비교가 안 된다.
 */
import { useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { PREVIEW_MS, SOUND_PACKS, previewAudio, type SoundPackId } from './soundPacks';

export function useSoundPreview() {
  const playersRef = useRef<Partial<Record<SoundPackId, AudioPlayer>>>({});
  const currentRef = useRef<SoundPackId | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getPlayer = useCallback((pack: SoundPackId) => {
    let p = playersRef.current[pack];
    if (!p) {
      p = createAudioPlayer(previewAudio(pack));
      playersRef.current[pack] = p;
    }
    return p;
  }, []);

  // 화면 진입 시 4종을 전부 미리 로드한다 — 첫 탭부터 레이턴시가 없어야 한다.
  useEffect(() => {
    SOUND_PACKS.forEach((p) => {
      try {
        getPlayer(p.id);
      } catch {
        /* 다음 탭에서 다시 시도된다 */
      }
    });
  }, [getPlayer]);

  const stopCurrent = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (currentRef.current) {
      try {
        playersRef.current[currentRef.current]?.pause();
      } catch {
        /* 이미 해제된 경우 — 조용히 무시 */
      }
      currentRef.current = null;
    }
  }, []);

  const play = useCallback(
    (pack: SoundPackId, volume = 1) => {
      stopCurrent(); // 연속 탭 시 이전 소리를 끊는다
      try {
        const p = getPlayer(pack);
        p.volume = Math.min(1, Math.max(0, volume));
        p.seekTo(0);
        p.play();
        currentRef.current = pack;
        timerRef.current = setTimeout(stopCurrent, PREVIEW_MS + 300);
      } catch {
        // 미리듣기 실패는 조용히 무시 — 설정 자체는 계속 쓸 수 있어야 한다.
        stopCurrent();
      }
    },
    [getPlayer, stopCurrent],
  );

  // 화면을 벗어나면 전부 해제한다.
  useEffect(() => {
    return () => {
      stopCurrent();
      Object.values(playersRef.current).forEach((p) => {
        try {
          p?.remove();
        } catch {
          /* 이미 해제됨 */
        }
      });
      playersRef.current = {};
    };
  }, [stopCurrent]);

  return play;
}
