/**
 * 실측 스윙 오디오 캐시 — (팩, 백스윙, 다운스윙) 조합마다 한 번만 합성한다.
 *
 * ⚠️ 스윙 속도 화면에서 사용자가 팩을 바꾸거나 다시 들어올 때마다 매번 새로
 * 렌더링하면 안 된다 — 캐시 파일이 있으면 그대로 재사용한다. 캐시 무효화는
 * 앱 재설치·`clearSwingLoopCache()` 호출 시점뿐이다(값이 같으면 소리도 항상 같다 —
 * 라운드로빈 시드가 결정론적이라 재합성해도 어차피 같은 결과가 나오므로
 * "새로고침"이 필요한 이유 자체가 없다).
 */
import { Directory, File, Paths } from 'expo-file-system';
import type { SoundPackId } from '../soundPacks';
import { buildSwingLoop, cycleSecForSwing } from './build';
import { encodeWav16 } from './wav';

const CACHE_DIR_NAME = 'dynamic-swing-audio';

function cacheFileName(pack: SoundPackId, backswingSec: number, downswingSec: number): string {
  // 소수 3자리 반올림 — 부동소수점 미세 차이로 캐시가 계속 미스나는 것 방지.
  return `swing__${pack}__${backswingSec.toFixed(3)}_${downswingSec.toFixed(3)}.wav`;
}

function getCacheDir(): Directory {
  const dir = new Directory(Paths.cache, CACHE_DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export type DynamicLoopResult = {
  uri: string;
  cycleSec: number;
  swingSec: number;
};

/**
 * 실측 스윙 하나(팩 하나)의 루프 오디오를 캐시에서 찾거나 새로 합성해 파일로 쓴다.
 */
export async function getOrRenderSwingLoop(
  pack: SoundPackId,
  backswingSec: number,
  downswingSec: number,
): Promise<DynamicLoopResult> {
  const dir = getCacheDir();
  const file = new File(dir, cacheFileName(pack, backswingSec, downswingSec));

  if (file.exists) {
    return {
      uri: file.uri,
      cycleSec: cycleSecForSwing(backswingSec + downswingSec),
      swingSec: backswingSec + downswingSec,
    };
  }

  const rendered = await buildSwingLoop({ pack, backswingSec, downswingSec });
  const wav = encodeWav16(rendered.pcm, rendered.sampleRate);

  file.create({ intermediates: true, overwrite: true });
  file.write(wav);

  return { uri: file.uri, cycleSec: rendered.cycleSec, swingSec: rendered.swingSec };
}

/** 캐시를 통째로 비운다 — 정기 정리나 디버깅용. */
export function clearSwingLoopCache(): void {
  const dir = new Directory(Paths.cache, CACHE_DIR_NAME);
  if (dir.exists) dir.delete();
}
