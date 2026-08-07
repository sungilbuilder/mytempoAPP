import { computeTempo, type SwingMarks } from '../useSwingStore';

describe('computeTempo', () => {
  it('정상 마킹 — suspicious 는 false', () => {
    const marks: SwingMarks = { start: 0, top: 0.9, impact: 1.2 };
    const r = computeTempo(marks);
    expect(r.backswingSec).toBeCloseTo(0.9, 5);
    expect(r.downswingSec).toBeCloseTo(0.3, 5);
    expect(r.suspicious).toBe(false);
  });

  it('다운스윙이 0.05초 미만이면 suspicious', () => {
    const marks: SwingMarks = { start: 0, top: 0.9, impact: 0.92 };
    expect(computeTempo(marks).suspicious).toBe(true);
  });

  it('백스윙이 0.05초 미만이면 suspicious (start/top 순서 오류로 backswingSec 이 0에 가까워지는 경우)', () => {
    const marks: SwingMarks = { start: 0.9, top: 0.91, impact: 1.2 };
    expect(computeTempo(marks).suspicious).toBe(true);
  });

  it('top 이 start 보다 앞서 찍히면 backswingSec 은 0으로 클램프되고 suspicious 다', () => {
    const marks: SwingMarks = { start: 0.9, top: 0.5, impact: 1.2 };
    const r = computeTempo(marks);
    expect(r.backswingSec).toBe(0);
    expect(r.suspicious).toBe(true);
  });
});
