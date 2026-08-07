/**
 * 사운드 미리듣기 (2026-08-01 창업자 요청)
 *
 * 설정에서 소리를 고를 때 "어떤 소리인지 모르고 고르는" 상태를 없앤다.
 * 탭하면 그 자리에서 시작·탑·임팩트 3박이 들린다.
 *
 * 설계 메모:
 * - 재생 때마다 플레이어를 새로 만들고 끝나면 해제한다. 미리듣기는 짧고 드물게
 *   쓰이므로 상주시킬 이유가 없고, expo-audio는 `createAudioPlayer`로 만든 플레이어를
 *   직접 `remove()`하지 않으면 누수가 난다(공식 경고).
 * - 연속으로 탭하면 이전 소리를 끊고 새 소리를 낸다 — 겹쳐 울리면 음색 비교가 안 된다.
 */
import { useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { PREVIEW_MS, previewAudio, type SoundPackId } from './soundPacks';

export function useSoundPreview() {
  const playerRef = useRef<AudioPlayer | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    try {
      playerRef.current?.remove();
    } catch {
      // 이미 해제된 경우 — 조용히 무시
    }
    playerRef.current = null;
  }, []);

  const play = useCallback(
    (pack: SoundPackId, volume = 1) => {
      cleanup(); // 연속 탭 시 이전 소리를 끊는다
      try {
        const p = createAudioPlayer(previewAudio(pack));
        p.volume = Math.min(1, Math.max(0, volume));
        playerRef.current = p;
        p.play();
        // 재생이 끝날 때쯤 해제한다. 조금 여유를 둔다.
        timerRef.current = setTimeout(cleanup, PREVIEW_MS + 300);
      } catch {
        // 미리듣기 실패는 조용히 무시 — 설정 자체는 계속 쓸 수 있어야 한다.
        cleanup();
      }
    },
    [cleanup],
  );

  // 화면을 벗어나면 반드시 정리한다.
  useEffect(() => cleanup, [cleanup]);

  return play;
}
