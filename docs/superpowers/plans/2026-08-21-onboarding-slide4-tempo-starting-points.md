# 온보딩 슬라이드4 — 3:1 배지+속도 눈금 컴포넌트 교체 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 온보딩 4번째 슬라이드의 시각 요소를 카피가 말하는 축(비율은 3:1 하나, 속도만
4가지)과 일치하는 새 컴포넌트로 교체하고, 카피·CTA 라벨을 확정한다.

**Architecture:** Expo/React Native 앱의 기존 온보딩 화면(`app/onboarding.tsx`) 안에 있는
프레젠테이셔널 컴포넌트를 하나 교체한다. 새 컴포넌트는 `SWING_SPEEDS`(단일 진실
공급원)를 그대로 매핑해 렌더링해서 숫자를 하드코딩하지 않는다. 텍스트는 ko/en
i18n JSON 두 파일에서 관리된다.

**Tech Stack:** Expo/React Native, react-i18next, NativeWind(Tailwind), TypeScript.

**Spec:** `docs/superpowers/specs/2026-08-21-onboarding-slide4-tempo-starting-points-design.md`

**작업 디렉토리(모든 명령어 기준):** `HQ/03_Output_App/` — 아래 명령어는 전부 이
디렉토리에서 실행한다. 파일 경로는 저장소 루트 기준으로 적는다.

## Global Constraints

- 숫자는 `SWING_SPEEDS`(`features/tempo/swingSpeeds.ts`)를 그대로 읽어와 렌더링한다 —
  1.33/1.20/1.07/0.93초를 문자열로 하드코딩하지 않는다.
- 시각 요소의 점 4개는 전부 같은 크기·같은 색이다 — 어느 것도 "추천 단계"로 강조하지 않는다.
- `t('start')` 키는 버튼 텍스트와 accessibilityLabel에 공용으로 쓰인다 — 사용처는
  `app/onboarding.tsx` 한 곳뿐이라 값만 바꾸면 된다.
- 이 저장소엔 `.test.tsx`(RN 컴포넌트 테스트)가 하나도 없다(확인 완료, 2026-08-21) — 이
  작업에서 새 테스트 하네스를 만들지 않는다. 대신 각 태스크 끝에
  `npx tsc --noEmit` · `npx eslint .` · `npx jest`를 돌려 회귀를 확인한다.
- 프리셋/속도 데이터 자체(`SWING_SPEEDS`, `swingSecLabel`, `domain:units.seconds`)는
  이미 존재하는 값이다 — 이번 작업은 그걸 읽어서 그리는 화면 코드만 추가한다.

---

### Task 1: `TempoStartingPoints` 컴포넌트로 교체 + 상단 문서 주석 정정

**Files:**
- Modify: `HQ/03_Output_App/app/onboarding.tsx`

**Interfaces:**
- Consumes: `SWING_SPEEDS: SwingSpeed[]`, `swingSecLabel(swingSec: number): string`
  (둘 다 `features/tempo/swingSpeeds.ts`에 이미 존재 — 새로 만들지 않는다).
  `SwingSpeed = { id: SwingSpeedId; swingSec: number }`.
- Produces: `TempoStartingPoints({ primary, ink, track, line }: { primary: string; ink:
  string; track: string; line: string }): JSX.Element` — Task 안에서 정의하고 같은 파일의
  `SLIDES` 배열에서 바로 소비한다(다른 태스크가 이 컴포넌트를 import하는 일은 없음).

- [ ] **Step 1: import 구문 수정**

`HQ/03_Output_App/app/onboarding.tsx` 35번째 줄 근처, 기존:
```ts
import { DEFAULT_SWING_SPEED } from '../features/tempo/swingSpeeds';
import { TEMPO_PRESETS } from '../features/tempo/presets';
```
다음으로 교체:
```ts
import { DEFAULT_SWING_SPEED, SWING_SPEEDS, swingSecLabel } from '../features/tempo/swingSpeeds';
```
(`TEMPO_PRESETS` import는 통째로 삭제한다 — 이 파일에서 `RecommendedTempoPreview` 말고는
아무도 안 쓰고, 그 컴포넌트를 이 태스크에서 지운다.)

- [ ] **Step 2: 상단 헤더 주석을 5장 기준으로 정정**

같은 파일 45~60번째 줄 근처, 기존:
```ts
 * 온보딩 — 4장 스와이프
 *
 * 근거: `mytempo-full-demo.html`의 온보딩 구조 + 2026-07-31 테마 선택 화면 추가.
 *
 * 핵심 원칙: **각 장이 서로 다른 시각 요소를 갖는다.**
 *   ① 골프공 배지 — "내 스윙"이라는 주체
 *   ② 가로 템포 바 — 비율(백스윙 그린 : 다운스윙 골드)이라는 개념 + 구간 라벨·숫자
 *   ③ 3:1 템포 링 — 앱의 시그니처 심볼을 그대로 써서 "소리가 반복된다"는 감각을 전달
 *      (2026-08-08: 의미 없이 오르내리기만 하던 펄스 링 데모를 실제 연습 화면과
 *      같은 컴포넌트로 교체 — 사용자 피드백)
 *   ④ 테마 미리보기 카드 — 첫 실행에서 화면 밝기를 직접 고르게 함
 *
 * ④를 온보딩에 둔 이유: 이 앱은 야간 연습장·실내 스크린에서 쓰는 경우가 많아
 * 첫 화면부터 눈부심 여부가 사용성에 직결된다. 설정에 묻어두면 대부분 안 바꾼다.
 */
```
다음으로 교체:
```ts
 * 온보딩 — 5장 스와이프
 *
 * 근거: `mytempo-full-demo.html`의 온보딩 구조 + 2026-07-31 테마 선택 화면 추가 +
 * 2026-08-21 추천 템포 설명 장(T-45) 추가.
 *
 * 핵심 원칙: **각 장이 서로 다른 시각 요소를 갖는다.**
 *   ① 골프공 배지 — "내 스윙"이라는 주체
 *   ② 가로 템포 바 — 비율(백스윙 그린 : 다운스윙 골드)이라는 개념 + 구간 라벨·숫자
 *   ③ 3:1 템포 링 — 앱의 시그니처 심볼을 그대로 써서 "소리가 반복된다"는 감각을 전달
 *      (2026-08-08: 의미 없이 오르내리기만 하던 펄스 링 데모를 실제 연습 화면과
 *      같은 컴포넌트로 교체 — 사용자 피드백)
 *   ④ 3:1 배지 + 속도 눈금 — "비율은 하나(3:1), 속도만 4가지"를 그대로 시각화
 *      (2026-08-21: 비율 프리셋 3종 리스트였던 초안을 대화로 다시 설계 — 문구가
 *      말하는 축과 화면이 보여주는 축이 어긋나 있었다)
 *   ⑤ 테마 미리보기 카드 — 첫 실행에서 화면 밝기를 직접 고르게 함
 *
 * ⑤를 온보딩에 둔 이유: 이 앱은 야간 연습장·실내 스크린에서 쓰는 경우가 많아
 * 첫 화면부터 눈부심 여부가 사용성에 직결된다. 설정에 묻어두면 대부분 안 바꾼다.
 */
```

- [ ] **Step 3: `RecommendedTempoPreview` 삭제, `TempoStartingPoints` 추가**

같은 파일 138~178번째 줄(`RecommendedTempoPreview`와 그 위 주석 전체), 기존:
```tsx
/*
  ── ③.5 추천 템포 미리보기 ──────────────────────
  2026-08-21 (T-45, 창업자 요청) — "템포 바꾸기"가 사실은 프리셋 4단계 중
  하나를 추천하는 화면이라는 걸 아무도 설명해준 적이 없었다. 새 온보딩 장으로
  드라이버·아이언 3종 추천 템포를 실제 라벨 그대로 미리 보여주고, "이건 목표가
  아니라 시작점"이라는 문장으로 왜 이 비율을 추천하는지 짧게 짚는다.
*/
function RecommendedTempoPreview({
  primary,
  ink,
  track,
}: {
  primary: string;
  ink: string;
  track: string;
}) {
  const { t } = useTranslation(['onboarding', 'domain']);
  const driverIronPresets = TEMPO_PRESETS.filter((p) => p.category === 'driver_iron');
  return (
    <View className="w-full max-w-[260px] gap-[8px]">
      {driverIronPresets.map((preset) => (
        <View
          key={preset.id}
          className="flex-row items-center justify-between rounded-card px-s2 py-[8px]"
          style={{ backgroundColor: track }}
        >
          <Text {...textScaling} className="font-kr-bold text-caption" style={{ color: ink }}>
            {t(`domain:character.${preset.characterId}.label`)}
          </Text>
          <Text
            {...numeralScaling}
            className="font-display-bold text-body"
            style={{ color: primary }}
          >
            {preset.ratioLabel}
          </Text>
        </View>
      ))}
    </View>
  );
}
```
다음으로 교체:
```tsx
/*
  ── ③.5 추천 템포 미리보기 — 3:1 배지 + 속도 눈금 ───────────────
  2026-08-21 (T-45 팔로우업, 창업자 요청) — 처음엔 비율 프리셋 3종(2.5/3/3.5:1)을
  나열했는데, 문구("3:1 리듬이 반복된다")는 비율 축 얘기고 이 리스트는 다른 축이라
  화면과 문구가 서로 다른 걸 말하고 있었다. 실제 메시지는 "비율은 3:1 하나, 속도만
  4가지"라 시각도 거기 맞춘다 — 작은 3:1 배지 + 실제 스윙 4가지 속도를 같은 무게로
  나열하는 눈금. 숫자는 SWING_SPEEDS를 그대로 읽어와 하드코딩 오차를 막는다.
*/
function TempoStartingPoints({
  primary,
  ink,
  track,
  line,
}: {
  primary: string;
  ink: string;
  track: string;
  line: string;
}) {
  const { t } = useTranslation('domain');
  return (
    <View className="w-full max-w-[220px] items-center gap-s3">
      <View className="rounded-pill px-s2 py-[4px]" style={{ backgroundColor: track }}>
        <Text
          {...numeralScaling}
          className="font-display-bold text-caption"
          style={{ color: primary }}
        >
          3:1
        </Text>
      </View>

      <View className="w-full" style={{ paddingTop: 3 }}>
        <View className="w-full" style={{ height: 1, backgroundColor: line }} />
        <View className="flex-row justify-between" style={{ marginTop: -4 }}>
          {SWING_SPEEDS.map((s) => (
            <View key={s.id} className="items-center" style={{ width: 44 }}>
              <View className="w-[7px] h-[7px] rounded-pill" style={{ backgroundColor: ink }} />
              <Text
                {...numeralScaling}
                className="text-caption text-muted dark:text-mutedDark"
                style={{ paddingTop: 4 }}
              >
                {t('units.seconds', { value: swingSecLabel(s.swingSec) })}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: `SLIDES` 배열의 슬라이드4 항목에서 새 컴포넌트를 사용하도록 교체**

같은 파일 434~444번째 줄 근처, 기존:
```tsx
    {
      /*
        2026-08-21 (T-45, 신설) — "추천 템포"(구 "템포 바꾸기")가 무엇을
        추천하는지, 왜 추천하는지 설명하는 장이 없었다. 3:1 링 장(위) 바로
        다음에 둬 "그 3:1이 어디서 왔는지"를 이어서 설명한다.
      */
      title: t('slides.4.title'),
      body: t('slides.4.body'),
      visualAbove: false,
      visual: <RecommendedTempoPreview primary={c.primary} ink={c.ink} track={c.surface2} />,
    },
```
다음으로 교체:
```tsx
    {
      /*
        2026-08-21 (T-45, 신설) — "추천 템포"(구 "템포 바꾸기")가 무엇을
        추천하는지, 왜 추천하는지 설명하는 장이 없었다. 3:1 링 장(위) 바로
        다음에 둬 "그 3:1이 어디서 왔는지"를 이어서 설명한다.

        같은 날 팔로우업: 처음엔 여기 비율 프리셋 3종 리스트를 넣었는데,
        문구는 "비율 3:1 하나, 속도만 4가지"를 말하고 화면은 "비율이 3개"를
        보여줘 서로 다른 축이 됐다. TempoStartingPoints로 교체해 문구·화면이
        같은 축(속도 다양성)을 말하게 맞췄다.
      */
      title: t('slides.4.title'),
      body: t('slides.4.body'),
      visualAbove: false,
      visual: (
        <TempoStartingPoints primary={c.primary} ink={c.ink} track={c.surface2} line={c.line} />
      ),
    },
```

- [ ] **Step 5: 타입·린트 검증**

Run: `npx tsc --noEmit`
Expected: 에러 0건 (특히 `TEMPO_PRESETS`/`RecommendedTempoPreview` 관련 미사용·미정의
에러가 없어야 함 — import를 지웠는데 다른 곳에서 참조가 남아있으면 여기서 잡힌다).

Run: `npx eslint app/onboarding.tsx`
Expected: 에러 0건, 미사용 import 경고 없음.

- [ ] **Step 6: 회귀 테스트**

Run: `npx jest`
Expected: 기존 스위트 전부 통과(이 태스크는 로직을 안 건드리므로 실패하면 다른 원인 —
`SWING_SPEEDS`/`swingSecLabel` import 경로가 틀렸을 가능성부터 확인).

- [ ] **Step 7: Commit**

```bash
git add HQ/03_Output_App/app/onboarding.tsx
git commit -m "$(cat <<'EOF'
feat(onboarding): replace slide4 ratio-list visual with 3:1 badge + speed ticks

The recommended-tempo slide (T-45, added today) paired copy about a
single 3:1 ratio with a visual listing three different ratios — the
copy and the screen were pointing at different axes. Swap in a
TempoStartingPoints component that renders SWING_SPEEDS directly (no
hardcoded numbers) so the visual matches what the copy says: one
ratio, four real speeds.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: i18n 카피 확정 + CTA 라벨 변경

**Files:**
- Modify: `HQ/03_Output_App/i18n/locales/ko/onboarding.json`
- Modify: `HQ/03_Output_App/i18n/locales/en/onboarding.json`

**Interfaces:**
- Consumes: 없음 (정적 텍스트 리소스 변경).
- Produces: `t('slides.4.title')` / `t('slides.4.body')` / `t('start')`의 반환값 변경 —
  Task 1에서 이미 이 키들을 그대로 호출하고 있으므로 Task 1 코드 수정은 필요 없다.

- [ ] **Step 1: ko 슬라이드4 카피 교체**

`HQ/03_Output_App/i18n/locales/ko/onboarding.json`, 기존:
```json
    "4": {
      "title": "추천 템포는\n목표가 아니에요",
      "body": "많은 골퍼의 스윙에서 3:1 비율이 반복 관찰돼요.\n정답이 아니라 시작점이니, 내 스윙을 등록하면\n내 리듬으로 자연히 바뀌어요."
    },
```
다음으로 교체:
```json
    "4": {
      "title": "템포를 추천해드려요",
      "body": "실제 스윙에서 반복되는 3:1 리듬을 담았어요.\n내게 맞는 템포를 찾는 시작점이에요."
    },
```

- [ ] **Step 2: ko CTA 라벨 교체**

같은 파일, 기존:
```json
  "start": "시작하기",
```
다음으로 교체:
```json
  "start": "내 템포 찾기",
```

- [ ] **Step 3: en 슬라이드4 카피 교체**

`HQ/03_Output_App/i18n/locales/en/onboarding.json`, 기존:
```json
    "4": {
      "title": "Recommended tempo\nisn't a goal",
      "body": "A 3:1 ratio shows up again and again\nin golfers' swings. It's a starting point,\nnot an answer — register your swing and it\nswitches to your own rhythm."
    },
```
다음으로 교체:
```json
    "4": {
      "title": "We recommend\na tempo",
      "body": "Built around the 3:1 rhythm that\nrepeats in real swings — your starting point."
    },
```

- [ ] **Step 4: en CTA 라벨 교체**

같은 파일, 기존:
```json
  "start": "Get started",
```
다음으로 교체:
```json
  "start": "Find My Tempo",
```

- [ ] **Step 5: JSON 유효성 + 타입 검증**

Run: `node -e "JSON.parse(require('fs').readFileSync('i18n/locales/ko/onboarding.json','utf8')); JSON.parse(require('fs').readFileSync('i18n/locales/en/onboarding.json','utf8')); console.log('valid json')"`
Expected: `valid json` 출력, 에러 없음.

Run: `npx tsc --noEmit`
Expected: 에러 0건.

- [ ] **Step 6: 회귀 테스트**

Run: `npx jest`
Expected: 전부 통과.

- [ ] **Step 7: Commit**

```bash
git add HQ/03_Output_App/i18n/locales/ko/onboarding.json HQ/03_Output_App/i18n/locales/en/onboarding.json
git commit -m "$(cat <<'EOF'
copy(onboarding): finalize slide4 copy and rename CTA to "내 템포 찾기"

Drops the vague "many golfers'" framing and the redundant "not the
pro's tempo" callback (slide 1 already owns that message) in favor of
copy that pairs with the new speed-tick visual. Renames the final CTA
from a generic "시작하기"/"Get started" to a tempo-specific "내 템포
찾기"/"Find My Tempo".

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** 스펙의 4개 범위 항목(①컴포넌트 교체 ②i18n 텍스트 ③CTA 라벨 ④문서
  주석) 전부 Task 1~2에 매핑됨. 별도 갭 없음.
- **Placeholder scan:** "TBD"/"나중에" 류 표현 없음, 모든 스텝에 실제 코드/명령어 포함.
- **Type consistency:** `TempoStartingPoints` 시그니처(`primary, ink, track, line: string`)가
  Step 3 정의와 Step 4 호출부에서 동일. `SWING_SPEEDS`/`swingSecLabel` 이름이 import문과
  사용부에서 일치. i18n 키(`slides.4.title/body`, `start`)는 Task 1의 `t()` 호출부를 안
  건드리므로 Task 2가 값만 바꿔도 충돌 없음.
