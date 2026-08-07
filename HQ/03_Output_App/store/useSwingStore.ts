/**
 * 내 스윙 — 영상에서 3지점(백스윙 시작/탑/임팩트)을 마킹해 계산한 템포를 저장한다.
 * PLANNING.md Feature B. AsyncStorage 영속.
 *
 * 저장하는 건 "영상"이 아니라 "초 단위 마킹값과 계산된 비율"뿐이다.
 * 영상 원본은 카메라롤에 그대로 두고 uri만 참조한다 — 리스크 Top3의
 * "대용량 비디오 로컬 저장" 문제를 애초에 만들지 않기 위한 설계.
 */
import { create } from 'zustand';
import { persisted } from './persist';

export type SwingMarks = {
  /** 백스윙 시작 (초) */
  start: number;
  /** 탑 (초) */
  top: number;
  /** 임팩트 (초) */
  impact: number;
};

export type SavedSwing = {
  id: string;
  name: string;
  marks: SwingMarks;
  /** 백스윙 구간 길이 (초) */
  backswingSec: number;
  /** 다운스윙 구간 길이 (초) */
  downswingSec: number;
  /** backswingSec / downswingSec */
  ratio: number;
  /** 원본 영상 uri (카메라롤 참조. 삭제되면 재생 불가) */
  videoUri?: string;
  /**
   * 원본 영상의 프레임레이트. 표시 정밀도를 결정한다(2026-07-31 신설).
   * 알 수 없으면 undefined — 이 경우 가장 보수적인 정밀도로 표시한다.
   */
  sourceFps?: number;
  createdAt: string;
};

type SwingState = {
  swings: SavedSwing[];
  activeSwingId: string | null;
  addSwing: (swing: SavedSwing) => void;
  renameSwing: (id: string, name: string) => void;
  removeSwing: (id: string) => void;
  setActiveSwing: (id: string | null) => void;
};

export const useSwingStore = create<SwingState>()(
  persisted<SwingState>(
    'swings',
    (set) => ({
      swings: [],
      activeSwingId: null,
      addSwing: (swing) => set((s) => ({ swings: [swing, ...s.swings], activeSwingId: swing.id })),
      renameSwing: (id, name) =>
        set((s) => ({
          swings: s.swings.map((w) => (w.id === id ? { ...w, name } : w)),
        })),
      removeSwing: (id) =>
        set((s) => ({
          swings: s.swings.filter((w) => w.id !== id),
          activeSwingId: s.activeSwingId === id ? null : s.activeSwingId,
        })),
      setActiveSwing: (activeSwingId) => set({ activeSwingId }),
    }),
    { partialize: (s) => ({ swings: s.swings, activeSwingId: s.activeSwingId }) },
  ),
);

/** 마킹 3지점에서 구간 길이와 비율을 계산한다. */
export function computeTempo(marks: SwingMarks) {
  const backswingSec = Math.max(0, marks.top - marks.start);
  const downswingSec = Math.max(0, marks.impact - marks.top);
  // PLANNING.md 5절 예외처리: 다운스윙이 비정상적으로 짧으면 비율이 발산한다.
  const safeDown = downswingSec < 0.05 ? 0.05 : downswingSec;
  return {
    backswingSec,
    downswingSec,
    ratio: backswingSec / safeDown,
    /**
     * 다운스윙 또는 백스윙이 0.05초 미만 = 마킹 오류 가능성 높음.
     * 백스윙 쪽은 주로 순서가 뒤바뀐 마킹(top 이 start 보다 앞섬)에서 발생하며,
     * 그 경우 위 Math.max(0, ...) 클램프로 backswingSec 이 0에 가까워진다.
     */
    suspicious: downswingSec < 0.05 || backswingSec < 0.05,
  };
}

export function getSwingById(swings: SavedSwing[], id: string | null) {
  if (!id) return undefined;
  return swings.find((s) => s.id === id);
}
