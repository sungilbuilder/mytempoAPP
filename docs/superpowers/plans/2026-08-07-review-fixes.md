# Code Review Fixes (2026-08-07) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the Important/Minor findings from the 2026-08-07 full-codebase review of MyTempo (마이템포), and clean up two repo-hygiene items, without touching unrelated code.

**Architecture:** Nine independent, small patches across `app/marking.tsx`, `store/useSwingStore.ts`, `app/practice.tsx`, `features/audio-engine/{metronome,soundPacks}.ts`, `features/tempo/useActiveTempo.ts`, `features/audio-engine/useSoundPreview.ts`, `app/settings.tsx`, `package.json`, and repo tracking of two large design files. No new dependencies, no UI redesign, no refactor of file structure.

**Tech Stack:** React Native + Expo SDK 54, TypeScript, Zustand, Jest (`jest-expo` preset).

## Global Constraints

- Do not change `ZOOM_MIN`/`ZOOM_MAX` behavior or reintroduce `ZOOM_PRESETS` — out of scope (already resolved, per review).
- Do not touch the `beepVolume`/`tempo`/`setIsPlaying` `useEffect` deps in `practice.tsx` — already fixed in commit `3f6fd28`, confirmed correct by review.
- Do not rewrite `app/marking.tsx` file structure (885 lines) — review flagged it as a *future* split candidate, not urgent; this plan only adds an order guard.
- Keep `git rm --cached` (untrack), not history rewrite (`filter-repo`/BFG) — full history purge is a separate, higher-risk operation not authorized here.
- Verification command for every task: `npm run typecheck` (repo root of the app is `HQ/03_Output_App/`). Full suite (`npm run verify`) runs once at the end.

---

### Task 1: Enforce mark ordering on frame-step and manual mark, not just drag

**Files:**
- Modify: `HQ/03_Output_App/app/marking.tsx:262-273` (`stepFrame`), `:451-455` (`markHere`)
- Test: none (no existing render-test harness for this screen; logic is a 2-line clamp inline in a `useCallback` already covered functionally by `seekTo`'s own clamp — see Task 2 for the data-integrity backstop instead)

**Problem:** `seekToPageX` (drag) clamps to `minSec` (line 407), but `stepFrame` (frame buttons) and `markHere` (confirm button) don't — a user can step backward past the previous mark and confirm an out-of-order point, and `computeTempo` (Task 2) only partially catches this.

- [ ] **Step 1: Clamp `stepFrame`'s target to `minSec`**

In `app/marking.tsx`, change:

```ts
  const stepFrame = useCallback(
    (dir: -1 | 1) => {
      if (isPlaying) {
        player?.pause();
        setIsPlaying(false);
      }
      Haptics.selectionAsync().catch(() => {});
      seekTo(currentSec + dir * frameSec);
    },
    [currentSec, frameSec, isPlaying, player, seekTo],
  );
```

to:

```ts
  const stepFrame = useCallback(
    (dir: -1 | 1) => {
      if (isPlaying) {
        player?.pause();
        setIsPlaying(false);
      }
      Haptics.selectionAsync().catch(() => {});
      seekTo(Math.max(minSec, currentSec + dir * frameSec));
    },
    [currentSec, frameSec, isPlaying, minSec, player, seekTo],
  );
```

(`minSec` is already computed above this point at line 292, so no new variable needed — just add it to the deps array.)

- [ ] **Step 2: Guard `markHere` against marking before the previous point**

Change:

```ts
  function markHere() {
    const meta = STEP_META[step];
    const next = { ...marks, [meta.key]: currentSec };
```

to:

```ts
  function markHere() {
    if (currentSec < minSec) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    const meta = STEP_META[step];
    const next = { ...marks, [meta.key]: currentSec };
```

This is a silent-but-felt refusal (haptic buzz, no crash, no alert dialog) consistent with the screen's existing pattern of ignoring invalid taps rather than popping dialogs (see `togglingRef` pattern in `practice.tsx` for the same philosophy).

- [ ] **Step 3: Typecheck**

Run: `cd "HQ/03_Output_App" && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "HQ/03_Output_App/app/marking.tsx"
git commit -m "fix(marking): enforce mark order on frame-step and confirm, not just drag"
```

---

### Task 2: Flag backswing underflow as suspicious, not just downswing

**Files:**
- Modify: `HQ/03_Output_App/store/useSwingStore.ts:73-85`
- Modify: `HQ/03_Output_App/app/result.tsx:215-217` (generalize the warning copy)
- Test: Create `HQ/03_Output_App/store/__tests__/useSwingStore.test.ts`

**Problem:** `computeTempo` only sets `suspicious: downswingSec < 0.05`. If `top` is marked before `start` (e.g. via Task 1's bug, or any other future gap), `backswingSec` clamps to `0` via `Math.max(0, ...)` and `ratio` becomes `0` — shown to the user with no warning.

- [ ] **Step 1: Write the failing test**

Create `HQ/03_Output_App/store/__tests__/useSwingStore.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "HQ/03_Output_App" && npx jest store/__tests__/useSwingStore.test.ts`
Expected: FAIL on the two new backswing-related cases (`suspicious` is `false` when it should be `true`).

- [ ] **Step 3: Fix `computeTempo`**

In `store/useSwingStore.ts`, change:

```ts
export function computeTempo(marks: SwingMarks) {
  const backswingSec = Math.max(0, marks.top - marks.start);
  const downswingSec = Math.max(0, marks.impact - marks.top);
  // PLANNING.md 5절 예외처리: 다운스윙이 비정상적으로 짧으면 비율이 발산한다.
  const safeDown = downswingSec < 0.05 ? 0.05 : downswingSec;
  return {
    backswingSec,
    downswingSec,
    ratio: backswingSec / safeDown,
    /** 다운스윙이 0.05초 미만 = 마킹 오류 가능성 높음 */
    suspicious: downswingSec < 0.05,
  };
}
```

to:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "HQ/03_Output_App" && npx jest store/__tests__/useSwingStore.test.ts`
Expected: PASS (4/4).

- [ ] **Step 5: Generalize the on-screen warning copy**

In `app/result.tsx`, change:

```tsx
        {suspicious && (
          <Caption className="pt-s2">
            다운스윙 구간이 매우 짧게 찍혔어요. 마킹을 다시 확인해보는 걸 권합니다.
          </Caption>
        )}
```

to:

```tsx
        {suspicious && (
          <Caption className="pt-s2">
            구간이 매우 짧게 찍혔어요. 마킹을 다시 확인해보는 걸 권합니다.
          </Caption>
        )}
```

(Drops the "다운스윙" qualifier since `suspicious` now also fires for a too-short backswing — the message should not name a specific phase.)

- [ ] **Step 6: Typecheck + full test file**

Run: `cd "HQ/03_Output_App" && npm run typecheck && npx jest store/__tests__/useSwingStore.test.ts`
Expected: no errors, 4/4 passing.

- [ ] **Step 7: Commit**

```bash
git add "HQ/03_Output_App/store/useSwingStore.ts" "HQ/03_Output_App/app/result.tsx" "HQ/03_Output_App/store/__tests__/useSwingStore.test.ts"
git commit -m "fix(tempo): flag backswing underflow as suspicious, not just downswing"
```

---

### Task 3: Close the play-before-load race in practice.tsx

**Files:**
- Modify: `HQ/03_Output_App/features/audio-engine/metronome.ts` (add `isReady()`)
- Modify: `HQ/03_Output_App/app/practice.tsx:333-353` (`toggle`)

**Problem:** `toggle()` calls `startPlayback(m)` then unconditionally `setIsPlaying(true)`, even if `m`'s internal `player` is still `null` because the async `load()` in the mount effect hasn't resolved yet. `Metronome.play()`/`startShotCycle()` silently no-op when `this.player` is `null`, so the UI shows "playing" (ring spin, elapsed timer) with no audio and no swing counts until `load()` finishes and self-heals.

**Interfaces:**
- Produces: `Metronome.isReady(): boolean` — used by `practice.tsx`'s `toggle()`.

- [ ] **Step 1: Add `isReady()` to `Metronome`**

In `features/audio-engine/metronome.ts`, add this public method (place it next to `getStatus()`, around line 314):

```ts
  /** 오디오가 로드되어 즉시 재생 가능한 상태인가. */
  isReady(): boolean {
    return this.player !== null;
  }
```

- [ ] **Step 2: Bail out of `toggle()` while not ready**

In `app/practice.tsx`, change:

```ts
  async function toggle() {
    if (togglingRef.current) return;
    const m = metronomeRef.current;
    if (!m) return;
    togglingRef.current = true;
```

to:

```ts
  async function toggle() {
    if (togglingRef.current) return;
    const m = metronomeRef.current;
    // 로드 effect가 아직 안 끝났으면 조용히 무시한다 — 오디오 없이 재생 중으로
    // 보이는 상태(링 스핀·타이머만 돌고 소리·스윙 카운트는 없음)를 막는다.
    // 로드가 끝나면 사용자가 다시 탭하면 된다(수백 ms 내 완료가 보통이라 재탭
    // 부담이 크지 않다).
    if (!m || (!isPlaying && !m.isReady())) return;
    togglingRef.current = true;
```

This reuses the existing "ignore the tap, don't show an error" philosophy already used for the `togglingRef` double-tap guard right above it — no new UI state, no spinner.

- [ ] **Step 3: Typecheck**

Run: `cd "HQ/03_Output_App" && npm run typecheck`
Expected: no errors.

- [ ] **Step 4: Manual verification note**

This race is timing-dependent and not practically unit-testable without mocking `expo-audio`'s native module (out of scope — see Task 4 for the coverage gap this leaves, noted as a follow-up, not fixed here). Verify by reading: `isPlaying` can now only become `true` after `m.isReady()` is `true` (either it already was, or `startPlayback` was skipped entirely and toggle returned early).

- [ ] **Step 5: Commit**

```bash
git add "HQ/03_Output_App/features/audio-engine/metronome.ts" "HQ/03_Output_App/app/practice.tsx"
git commit -m "fix(practice): ignore play tap until metronome audio finishes loading"
```

---

### Task 4: Unit tests for `soundPacks.ts` cycle/impact timing formulas

**Files:**
- Test: Create `HQ/03_Output_App/features/audio-engine/__tests__/soundPacks.test.ts`

**Problem:** `cycleSec()`'s own comment says it "반드시 같아야 한다" match `scripts/generate-sound-packs.py`'s `cycle_for()`, citing a past desync incident (AOS 리뷰 V-4), yet nothing pins the TS-side formula. This test won't catch a Python-side drift, but it will catch a regression on the TS side (the more likely place for an unnoticed future edit).

- [ ] **Step 1: Write the tests**

Create `HQ/03_Output_App/features/audio-engine/__tests__/soundPacks.test.ts`:

```ts
import { BASE_SWING_SEC } from '../../tempo/swingSpeeds';
import { BASE_CYCLE_SEC, cycleMs, cycleSec, impactAtMs, swingSec } from '../soundPacks';
import type { SwingSpeedId } from '../../tempo/swingSpeeds';

const SPEEDS: SwingSpeedId[] = ['s093', 's107', 's120', 's133'];

describe('cycleSec — generate-sound-packs.py 의 cycle_for() 와 반드시 같은 공식', () => {
  it('공식: BASE_CYCLE_SEC * swingSec(speed) / BASE_SWING_SEC', () => {
    for (const id of SPEEDS) {
      const expected = (BASE_CYCLE_SEC * swingSec(id)) / BASE_SWING_SEC;
      expect(cycleSec(id)).toBeCloseTo(expected, 10);
    }
  });

  it('스윙이 빠를수록(swingSec 이 작을수록) 사이클도 짧다', () => {
    const secs = SPEEDS.map((id) => cycleSec(id));
    const swings = SPEEDS.map((id) => swingSec(id));
    // 둘 다 swingSec 순서를 그대로 따라야 한다 (같은 선형식이므로)
    const bySwing = [...swings].map((_, i) => i).sort((a, b) => swings[a] - swings[b]);
    const byCycle = [...secs].map((_, i) => i).sort((a, b) => secs[a] - secs[b]);
    expect(byCycle).toEqual(bySwing);
  });
});

describe('cycleMs / impactAtMs — ms 변환과 임팩트 타이밍', () => {
  it('cycleMs 는 cycleSec 의 1000배', () => {
    for (const id of SPEEDS) {
      expect(cycleMs(id)).toBeCloseTo(cycleSec(id) * 1000, 6);
    }
  });

  it('impactAtMs 는 swingSec 의 1000배 (백스윙 시작~임팩트)', () => {
    for (const id of SPEEDS) {
      expect(impactAtMs(id)).toBeCloseTo(swingSec(id) * 1000, 6);
    }
  });

  it('임팩트는 항상 사이클 경계보다 먼저 온다 (다음 루프가 시작되기 전에 임팩트가 나야 한다)', () => {
    for (const id of SPEEDS) {
      expect(impactAtMs(id)).toBeLessThan(cycleMs(id));
    }
  });
});
```

- [ ] **Step 2: Run and verify pass**

Run: `cd "HQ/03_Output_App" && npx jest features/audio-engine/__tests__/soundPacks.test.ts`
Expected: PASS, all cases.

- [ ] **Step 3: Commit**

```bash
git add "HQ/03_Output_App/features/audio-engine/__tests__/soundPacks.test.ts"
git commit -m "test(audio-engine): pin cycleSec/impactAtMs formulas against regression"
```

---

### Task 5: Remove duplicate divider in settings.tsx

**Files:**
- Modify: `HQ/03_Output_App/app/settings.tsx:186-188`

- [ ] **Step 1: Delete the extra `<View>`**

Change:

```tsx
          <View className="h-[1px] bg-line dark:bg-lineDark" />

          <View className="h-[1px] bg-line dark:bg-lineDark" />

          {/*
```

to:

```tsx
          <View className="h-[1px] bg-line dark:bg-lineDark" />

          {/*
```

(keeps the single divider at line 186, removes the accidental duplicate at 188.)

- [ ] **Step 2: Typecheck**

Run: `cd "HQ/03_Output_App" && npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add "HQ/03_Output_App/app/settings.tsx"
git commit -m "fix(settings): remove duplicate divider between rows"
```

---

### Task 6: Replace `any`/`unknown`/`as never` at the expo-audio boundary with `AudioSource`

**Files:**
- Modify: `HQ/03_Output_App/features/audio-engine/metronome.ts`
- Modify: `HQ/03_Output_App/features/audio-engine/soundPacks.ts`
- Modify: `HQ/03_Output_App/features/tempo/useActiveTempo.ts:39,62,78`
- Modify: `HQ/03_Output_App/features/audio-engine/useSoundPreview.ts:38`

**Problem:** `expo-audio` exports `AudioSource` (`string | number | null | {...}`), but the codebase routes audio references through `any`/`unknown` and one `as never` cast, which defeats static checking exactly where a wrong asset reference would be easiest to catch.

- [ ] **Step 1: `metronome.ts` — type `loadedAudioFile` and `load()`**

Add the import and retype:

```ts
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
  type AudioSource,
  type AudioStatus,
} from 'expo-audio';
```

Change `private loadedAudioFile: any = null;` to `private loadedAudioFile: AudioSource = null;`.

Change `async load(audioFile: any, volume = 1) {` to `async load(audioFile: AudioSource, volume = 1) {`.

- [ ] **Step 2: `metronome.ts` — type `startShotCycle`'s `countInFile` and drop the cast**

Change:

```ts
  startShotCycle(opts: {
    countInFile: unknown;
```

to:

```ts
  startShotCycle(opts: {
    countInFile: AudioSource;
```

Change:

```ts
        const p = createAudioPlayer(opts.countInFile as never);
```

to:

```ts
        const p = createAudioPlayer(opts.countInFile);
```

- [ ] **Step 3: `soundPacks.ts` — return `AudioSource` instead of `unknown`**

Add import at top: `import type { AudioSource } from 'expo-audio';`

Change the `LOOPS` record type from:

```ts
const LOOPS: Record<string, Record<SoundPackId, Record<SwingSpeedId, unknown>>> = {
```

to:

```ts
const LOOPS: Record<string, Record<SoundPackId, Record<SwingSpeedId, AudioSource>>> = {
```

Change `export function loopAudio(presetId: string, pack: SoundPackId, speedId: SwingSpeedId): unknown {` to return `AudioSource`.

Change `const PREVIEWS: Record<SoundPackId, unknown> = {` to `Record<SoundPackId, AudioSource>`.

Change `export function previewAudio(pack: SoundPackId): unknown {` to return `AudioSource`.

Change `export function countInAudio(): unknown {` to return `AudioSource`.

- [ ] **Step 4: `useActiveTempo.ts` — type `audioFileFor`**

Add import: `import type { AudioSource } from 'expo-audio';` (or reuse an existing expo-audio import if present in the file — check first).

Change `audioFileFor: (pack: SoundPackId, speed: SwingSpeedId) => any;` (line 39) to `audioFileFor: (pack: SoundPackId, speed: SwingSpeedId) => AudioSource;`.

- [ ] **Step 5: `useSoundPreview.ts` — drop the `as never` cast**

Change:

```ts
        const p = createAudioPlayer(previewAudio(pack) as never);
```

to:

```ts
        const p = createAudioPlayer(previewAudio(pack));
```

- [ ] **Step 6: `practice.tsx` — verify `m.load(...)` call site still typechecks**

No source change expected here (`tempo.audioFileFor(...)` now returns `AudioSource`, matching `Metronome.load`'s new parameter type) — this step is verification only, covered by Step 7's typecheck.

- [ ] **Step 7: Typecheck the whole project**

Run: `cd "HQ/03_Output_App" && npm run typecheck`
Expected: no errors. If `require('*.wav')` return type doesn't structurally satisfy `AudioSource` under this TS config, the fallback is to keep `LOOPS`/`PREVIEWS` values typed as `AudioSource` but leave individual `require(...)` calls uncast (TS infers `any` for `.wav` requires by default in RN/Expo projects unless a `declare module '*.wav'` exists — check `HQ/03_Output_App/*.d.ts` / `expo-env.d.ts` first; if no such declaration exists, `require()` already returns `any` and assigning it into an `AudioSource`-typed record is not an error).

- [ ] **Step 8: Commit**

```bash
git add "HQ/03_Output_App/features/audio-engine/metronome.ts" "HQ/03_Output_App/features/audio-engine/soundPacks.ts" "HQ/03_Output_App/features/tempo/useActiveTempo.ts" "HQ/03_Output_App/features/audio-engine/useSoundPreview.ts"
git commit -m "refactor(audio-engine): type audio references as AudioSource instead of any/unknown"
```

---

### Task 7: Include `app/**` in Jest coverage collection

**Files:**
- Modify: `HQ/03_Output_App/package.json` (`jest.collectCoverageFrom`)

**Problem:** `collectCoverageFrom` only lists `features/**` and `store/**`. `app/marking.tsx` and `app/practice.tsx` — the two files this review treats as most critical — never show up in a coverage report even after Task 2/4 add tests elsewhere, masking that they still have zero direct coverage.

- [ ] **Step 1: Edit `collectCoverageFrom`**

Change:

```json
    "collectCoverageFrom": [
      "features/**/*.{ts,tsx}",
      "store/**/*.{ts,tsx}",
      "!**/__tests__/**"
    ]
```

to:

```json
    "collectCoverageFrom": [
      "features/**/*.{ts,tsx}",
      "store/**/*.{ts,tsx}",
      "app/**/*.{ts,tsx}",
      "!**/__tests__/**"
    ]
```

- [ ] **Step 2: Verify it runs**

Run: `cd "HQ/03_Output_App" && npx jest --coverage --collectCoverageFrom='app/**/*.{ts,tsx}' store/__tests__/useSwingStore.test.ts 2>&1 | tail -30`
Expected: coverage table includes `app/` files (mostly at 0%, which is expected and the point — it's now visible instead of silently excluded).

- [ ] **Step 3: Commit**

```bash
git add "HQ/03_Output_App/package.json"
git commit -m "chore(test): include app/** in coverage collection"
```

---

### Task 8: Untrack the two large design-mockup HTML files

**Files:**
- Modify: `.gitignore` (repo root, not the app's)
- Remove from git tracking (not from disk): `HQ/📑_02_Workspace/product_design/design-proposal-2026-07-31/MYTEMPO-App-UI-standalone.html` (5.3MB), `HQ/📑_02_Workspace/product_design/design-proposal-2026-07-31/MYTEMPO-Premium-standalone.html` (4.0MB)

**Problem:** ~9.3MB of standalone HTML design mockups are git-tracked in an app source repo. This does not shrink existing git history (that needs `git filter-repo`/BFG, a separate, higher-risk operation not authorized here) — it stops them from bloating *future* clones/fetches further and signals intent.

- [ ] **Step 1: Add the pattern to `.gitignore`**

Append to the repo-root `.gitignore` (`/Users/josungil/Desktop/claude projects/golf-tempo-app/.gitignore`):

```
# 대용량 디자인 시안 산출물 — git 추적 대상에서 제외 (2026-08-07)
HQ/📑_02_Workspace/product_design/design-proposal-2026-07-31/*.html
```

- [ ] **Step 2: Untrack the two files (keep them on disk)**

```bash
cd "/Users/josungil/Desktop/claude projects/golf-tempo-app"
git rm --cached "HQ/📑_02_Workspace/product_design/design-proposal-2026-07-31/MYTEMPO-App-UI-standalone.html"
git rm --cached "HQ/📑_02_Workspace/product_design/design-proposal-2026-07-31/MYTEMPO-Premium-standalone.html"
```

- [ ] **Step 3: Verify they're untracked but still present locally**

```bash
git status --short | grep design-proposal
ls -lh "HQ/📑_02_Workspace/product_design/design-proposal-2026-07-31/"
```

Expected: `git status` shows both as staged deletions (`D`) plus `.gitignore` as modified; the files themselves are still present on disk (confirm with `ls`).

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore(repo): untrack 9.3MB design-mockup HTML exports, keep them on disk"
```

---

### Task 9: Relocate the personal checklist file out of the app source root

**Files:**
- Move: `HQ/03_Output_App/내일아침-확인목록.md` → Obsidian vault (per this repo's own `CLAUDE.md`: personal/planning notes belong in `~/Documents/Obsidian Vault/MYTEMPO/`, not in `HQ/03_Output_App/`)

**Problem:** The file is untracked (confirmed via `git status --short` and `git ls-files` — not in git history), so it isn't polluting commits, but it sits in the app source root where a future `git add .`/`git add -A` could sweep it in by accident.

- [ ] **Step 1: Read the file to choose the right vault destination**

```bash
cat "/Users/josungil/Desktop/claude projects/golf-tempo-app/HQ/03_Output_App/내일아침-확인목록.md"
ls "/Users/josungil/Documents/Obsidian Vault/MYTEMPO/"
```

Pick the closest matching top-level vault folder based on the checklist's actual content (e.g. if it's day-to-day founder task tracking, it likely belongs near `09_조직/` per this repo's `CLAUDE.md` folder table — confirm against what's actually in the vault before deciding, don't guess blind).

- [ ] **Step 2: Move it**

```bash
mv "/Users/josungil/Desktop/claude projects/golf-tempo-app/HQ/03_Output_App/내일아침-확인목록.md" "<chosen-vault-destination>/내일아침-확인목록.md"
```

- [ ] **Step 3: Verify**

```bash
ls "/Users/josungil/Desktop/claude projects/golf-tempo-app/HQ/03_Output_App/" | grep 내일아침
```

Expected: no output (file is gone from the app source root).

No commit needed — the file was never tracked, so there's nothing for git to stage.

---

### Task 10: Final verification pass

- [ ] **Step 1: Run the full verify script**

```bash
cd "/Users/josungil/Desktop/claude projects/golf-tempo-app/HQ/03_Output_App"
npm run verify
```

Expected: `typecheck`, `lint`, `format:check`, and `test` all pass. `verify` runs all four in sequence and stops at the first failure — if `format:check` fails on files this plan touched, run `npm run format` and re-commit rather than hand-editing whitespace.

- [ ] **Step 2: Review the full diff**

```bash
cd "/Users/josungil/Desktop/claude projects/golf-tempo-app"
git log --oneline -10
git diff origin/HEAD..HEAD --stat 2>/dev/null || git diff 3f6fd28..HEAD --stat
```

Confirm only the files listed in Tasks 1-8 changed (plus the plan doc itself).
