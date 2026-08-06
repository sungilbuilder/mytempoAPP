/**
 * 저장된 설정을 "지금 쓸 수 있는 값"으로 좁혀준다. (2026-08-06 신설)
 *
 * ## 왜 저장값을 지우지 않고 좁히기만 하는가
 *
 * 체험 8일차에 강등될 때 저장된 사운드팩을 `wood`로 **덮어써버리면**, 나중에
 * 결제했을 때 사용자가 고생해서 고른 취향이 사라져 있다. 그건 결제한 사람에게
 * 손해를 입히는 동작이다.
 *
 * 그래서 저장값은 그대로 두고, **읽는 쪽에서만** 무료 티어 값으로 떨어뜨린다.
 * 결제하면 원래 고른 값이 그대로 돌아온다. 히스토리 7일 컷과 같은 원칙이다 —
 * *저장은 유지, 표시만 제한.*
 */
import { useSettingsStore } from '../../store/useSettingsStore';
import { useEntitlement } from '../../store/useEntitlementStore';
import {
  FREE_SHOT_INTERVAL,
  FREE_SOUND_PACK,
  isIntervalFree,
  isPackFree,
  type ShotIntervalSec,
  type SoundPackId,
} from '../audio-engine/soundPacks';

/** 지금 실제로 재생할 사운드팩 */
export function useGatedSoundPack(): SoundPackId {
  const saved = useSettingsStore((s) => s.soundPack);
  const { full } = useEntitlement();
  if (full || isPackFree(saved)) return saved;
  return FREE_SOUND_PACK;
}

/** 지금 실제로 적용할 샷 간격 */
export function useGatedShotInterval(): ShotIntervalSec {
  const saved = useSettingsStore((s) => s.shotIntervalSec);
  const { full } = useEntitlement();
  if (full || isIntervalFree(saved)) return saved;
  return FREE_SHOT_INTERVAL;
}
