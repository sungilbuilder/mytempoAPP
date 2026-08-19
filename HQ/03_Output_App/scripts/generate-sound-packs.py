#!/usr/bin/env python3
"""
마이템포 사운드 생성
(2026-08-01 전면 재설계 · 2026-08-06 리마스터 + 사운드 아이덴티티 · 2026-08-07 품질 개선)

실행: python3 scripts/generate-sound-packs.py

═══════════════════════════════════════════════════════════════════════
 1. 왜 소리를 다시 만들었나 (2026-08-01, WBS 2.18)
═══════════════════════════════════════════════════════════════════════

창업자 전달: "설정의 연습 소리가 전체적인 브랜드 톤앤매너와 안 맞는다는 지적을 들었다."
측정해보니 지적이 정확했다. 기존 5개 팩의 첫 타격 피크 주파수:

    비프    660 Hz   ≈ E5     ← 전자 알림음 대역
    클릭   1800 Hz   ≈ A6     ← 초고역, 기계적
    우드블록 420 Hz   ≈ G#4
    드럼    124 Hz   ≈ B2
    리듬    332 Hz   ≈ E4

두 가지 문제가 있었다.

1) **음색 방향이 브랜드와 반대다.** 브랜드는 포레스트 그린 + 골드, 플랫, 절제,
   "프리미엄 기기"(WHOOP/Oura류)를 지향한다. 그런데 비프·클릭은 전형적인
   **가전 알림음**이다. 자연 소재를 지향하는 브랜드에 삐- 소리가 붙어 있었다.

2) **팩마다 조율이 제각각이다.** E5 / A6 / G#4 / B2 / E4 — 아무 관계가 없는 음들이라
   팩을 바꾸면 음색뿐 아니라 **음 자체가 바뀌었다.** 같은 제품의 소리로 들리지 않는다.

→ 모든 팩을 **E 계열 한 음** 위에 음색만 다르게 얹는다. 근음 E3 = 164.81 Hz.

왜 E3인가:
  · 연습장 소음의 주요 대역은 클럽 임팩트(2~5 kHz)와 웅성거림(200~800 Hz)이다.
    E3의 기음 165 Hz는 그 아래라 묻히지 않고, 배음(330·495 Hz)이 존재감을 만든다.
  · 남성·여성 모두에게 편안한 저중역. 오래 들어도 피로하지 않다.
  · 브랜드 마크가 3:1이라는 **단순 정수비**를 형상화하듯, 음정도 옥타브·완전5도 같은
    단순 정수비만 쓴다. 북은 E1(41.2 Hz), 현·나무는 E3.

**세 지점(시작·탑·임팩트)은 같은 음이다.** 음정을 올리면 "빨라져야 한다"는 인상을
주는데, 이 제품은 정확히 그 오해를 없애려 하고 있다(2026-08-01 창업자 확정).
구분은 **길이와 세기**로 한다 — 임팩트가 가장 길고 세다.

═══════════════════════════════════════════════════════════════════════
 2. 2026-08-06 리마스터 (T-24)
═══════════════════════════════════════════════════════════════════════

### ① 루프마다 '틱' 소리가 나고 있었다  ⚠️ 실제 결함

`audio_tools.loop_report()`로 재보니 '현'·'리듬' 팩의 **첫 샘플이 0.15**였다.
파일 끝은 0(무음)이므로, 루프가 돌 때마다 0 → 0.15 계단이 생긴다.
원인은 Karplus-Strong(현) 출력에 어택 포락선이 빠져 있던 것. 2ms 램프 + 이음매
크로스페이드 두 겹으로 막았다.

### ② 음량 기준을 RMS → LUFS로

RMS는 41 Hz와 165 Hz를 같은 무게로 센다. 사람 귀는 그렇지 않다. 방송 표준
K-weighting(ITU-R BS.1770)을 쓰면 음색이 달라도 체감 음량이 맞는다.

### ③ 사운드 아이덴티티 — 시그니처 사운드 신설

브랜드 심볼(Tempo Arc Mark)은 **링을 3:1로 나눈 형태**다. 소리도 같은 것을 말한다.
시간 간격도 3:1, 마지막 음의 주파수도 근음의 3배(B4). 노출은 온보딩 완료 시 한 번.

### ④ UI 피드백 사운드 3종 — 짧고 단정하게, 축하하지 않는다

═══════════════════════════════════════════════════════════════════════
 3. 2026-08-07 품질 개선 — "투어템포보다 저가형으로 들린다"
    [[사운드품질-진단과개선계획-2026-08-07]]
═══════════════════════════════════════════════════════════════════════

창업자 전달 피드백을 실측으로 확인했다. 원인은 **음색과 재생 경로 두 갈래**였고,
놀랍게도 더 큰 쪽은 음색이 아니었다.

### Phase 1 — 재생 경로 (여기가 주범이었다)

**모든 재생이 타임스트레치를 거치고 있었다.**

`swingSpeeds.ts`의 배속은 0.825 / 0.917 / 1.031 / 1.179 — **1.0이 하나도 없다.**
즉 사용자는 원본 파일을 **한 번도 듣지 못했다.** 게다가 `metronome.ts`가
`shouldCorrectPitch = true`로 둬서, 플랫폼은 단순 리샘플링이 아니라
**위상 보코더**를 돌린다.

위상 보코더가 가장 못 다루는 신호가 **트랜지언트 뾰족한 타악기**다.
프리에코(타격 직전 유령 소리), 트랜지언트 스미어링("툭"이 "투욱"이 됨),
금속성 위상 아티팩트. 기본 설정(0.917배)에서 이미 그 상태였다.

→ **속도별로 미리 렌더링한다.** 4속도 × 3비율 × 4팩 = **48 파일.**
   앱에서 `setPlaybackRate`를 완전히 제거해 위상 보코더를 경로에서 뺀다.

   ⚠️ 파일 길이가 속도마다 달라진다. `soundPacks.ts`의 `cycleSec(speedId)`가
   이 값을 계산하며, 두 곳의 공식이 **반드시 같아야 한다**(아래 `cycle_for`).

**음량이 방송 기준이었다.** -25.0 LUFS는 TV 송출 기준(-23)보다도 낮다.
모바일 앱 통상치는 -16~-14다. 사용자가 폰 볼륨을 최대로 올리게 되고(스피커 왜곡),
실내 연습장 소음(85~95dB)에 헤드룸이 없고, 나란히 들으면 작은 쪽이 항상
저가로 들린다. → 루프 **-18 LUFS**.

### Phase 2 — 음색

측정으로 드러난 네 가지:

  ① **나무 팩의 4kHz 이상 에너지가 0.01%.** 로우패스 먹인 것처럼 어둡다.
     실제 마림바·우드블록은 말렛이 닿는 순간 2~8kHz에 넓은 잡음 버스트가 있고,
     사람이 "나무"라고 인식하는 단서가 바로 거기 있다.
     → `band_noise()` + `modes()`로 **타격 트랜지언트를 복원**한다.

  ② **부분음이 사실상 없다.** 3.9·9.2배 부분음의 감쇠가 42ms·19ms로 너무 짧아
     귀에 도달하는 건 165Hz 사인파 하나였다. 마림바가 아니라 테스트 톤이다.
     → 부분음 감쇠를 늘리고 세기를 벨로시티에 연동한다.

  ③ **1번 타격 vs 2번 타격 상관계수 0.9948.** `np.random.seed(7)` 하나로
     고정하니 세 마커가 게인만 다른 동일 파형이었다. 루프라 2초마다 반복 —
     20분이면 600번의 동일 파형이고, 귀는 이걸 즉시 '기계'로 분류한다.
     → **타격마다 시드를 분기**한다(라운드로빈). 아래 `rng_for()`.

  ④ **잔향 0, 26.9%가 절대 무음.** 디지털 진공은 현실에 없는 상태다.
     → RT60 130ms의 아주 짧은 잔향 + -80dBFS 룸톤.
     ⚠️ 루프는 **원형 합성곱**으로 돌려 꼬리가 앞으로 감기게 한다. 안 그러면
     마지막 임팩트의 잔향이 잘려 루프 경계에 새 계단이 생긴다.

  ⑤ 세기 구분이 **볼륨 배수뿐**이었다(0.70/0.80/1.00). 실제 악기는 세게 칠수록
     고역 부분음 비중이 는다. → 벨로시티가 게인이 아니라 **음색**을 바꾼다.

### 지키는 것

  · E3 한 음 원칙 — 그대로. 팩 간 대비는 **트랜지언트 대역**에서 만든다.
  · 세 마커는 같은 음정 — 그대로. 구분은 길이·세기·음색.
  · 잔향은 12%까지만 — 이건 감상용이 아니라 **훈련 신호**다. 임팩트 지점이
    흐려지면 제품이 하는 일 자체가 망가진다.

### 회귀 방지

`scripts/audit.py`가 LUFS·트루피크·루프 이음매에 더해 **4kHz 이상 에너지 하한**과
**타격 간 상관계수 상한**을 검사한다. 위 ①③이 조용히 되돌아가는 걸 막는다.

═══════════════════════════════════════════════════════════════════════
 4. 2026-08-08 '현' 폐기 → 피아노로 전면 교체
═══════════════════════════════════════════════════════════════════════

같은 날 오전 실기기 검증(T-06)에서 "단조처럼 어둡다"는 피드백을 받고
`string()`의 `brightness`를 0.5→0.60으로 올렸고, 그 직후 '현' 팩만 시그니처
질감(wood+string 블렌드, `string_signature_voice`)으로 바꿨다.

창업자가 그 결과물을 직접 오래 들어보고 다시 판단했다: **밝기를 조금 올리는
정도로는 안 된다. 훈련 신호로서 이 물리모델 자체가 안 맞는다.** 투어템포와
비교했을 때도 투어템포 쪽 피아노 톤이 더 듣기 좋다는 판단이었고, 이는 이미
§3에서 실측한 "단조처럼 어둡다" 피드백과 같은 방향을 가리킨다 —
Karplus-Strong 2탭 평균 필터는 태생적으로 고역이 죽은 "따뜻하지만 어두운"
음색이라, 아무리 밝기를 조정해도 상한이 있다.

→ **'현'·'리듬' 두 팩 모두 마커 음색을 `piano()`(신설, 배음 6개 비조화
가산합성 + 해머 트랜지언트)로 교체한다.** `string()` 함수 자체는 지우지
않는다 — 시그니처 사운드(`build_signature`)와 UI 확인음(`build_cues`)의
"여운" 레이어로 여전히 쓰인다. 이 두 곳은 온보딩 1회·짧은 확인음이라
20~40분 반복 노출로 인한 피로 문제의 대상이 아니다.

E3 세 마커 동일 음정 원칙(§1)과 벨로시티가 음색을 바꾸는 원칙(§Phase 2-③)은
그대로 유지한다 — 악기만 바뀌었지 훈련 신호 설계 원칙은 바뀌지 않는다.

═══════════════════════════════════════════════════════════════════════
 5. 2026-08-08 오후 — 훈련 마커, 동일 음정 원칙 폐기 → 3음정 전환
    [[사운드-아이덴티티]] §1 개정
═══════════════════════════════════════════════════════════════════════

§1의 "세 지점(시작·탑·임팩트)은 같은 음이다"는 2026-08-01 창업자 확정 원칙이었다.
같은 날 창업자가 이 원칙을 **뒤집기로** 결정했다 — MYTEMPO만의 소리라는 인지를
음정 자체로 만든다. 세 마커가 상승 3화음(START→TOP→IMPACT)을 이루게 한다.

⚠️ 감수하는 리스크: 음정이 오르면 "더 빨리 스윙하라"는 오해를 줄 수 있다는
기존 우려는 사라지지 않았다. 창업자가 그 리스크를 알고 감수하기로 한 결정이다.

### 근음을 왜 4옥타브로 올렸나

기존 E3(3옥타브, 164.81Hz)는 "연습장 웅성거림(200~800Hz) 아래로 피해 묻히지
않는다"는 명확한 근거가 있었다(§1 원본). 4옥타브(261~494Hz)로 올리면 그 대역
**안으로 들어간다** — 대가가 있는 선택이다.

`scripts/signature_sound.py`로 25개 후보(음정 5×음색 5)를 만들어 실측한 결과,
그 대가는 **음색으로 상쇄 가능**했다. 배음을 3~6차까지 넓게 펴고 트랜지언트
대역을 2~9.5kHz로 잡은 음색("Crystal Piano")은 에너지 대부분이 웅성거림
대역 위에 있어, 근음이 그 대역 안에 있어도 마스킹 위험도(그 대역 안 에너지
비중)가 다른 음색 대비 20%p 이상 낮게 나왔다. 평가·근거 전문은 볼트
[[사운드-아이덴티티]]와 `_sound_exploration/metrics.json` 참고.

### 선정 — E4 → A4 → B4, Crystal Piano

- **E 근음 유지** — 기존 시그니처 사운드·확인음이 전부 E(E3) 위에 있다.
  브랜드가 이미 8일간 "E"로 알려져 왔으므로 새 체계도 E4에서 시작한다.
- **B4로 해소** — 기존 시그니처의 해소음이 정확히 B4(E3×3=494.43Hz)다.
  이 체계도 B4(493.88Hz, 평균율)로 끝나 두 사운드가 **같은 음으로 닫힌다.**
- A4는 표준 3화음(장3도)이 아니라 완전4도 위 — "일반적인 3화음보다 독특함"
  (평가 기준 §15 Brand Fit)을 노린 선택이다.

### 이번에 바꾸지 않은 것

- **시그니처 사운드(`build_signature`)·UI 확인음(`build_cues`)는 그대로 둔다.**
  창업자 결정은 "훈련 마커"에 대한 것이었다. 온보딩 1회·짧은 확인음까지
  범위를 넓히는 건 별도 판단이 필요해 이번 변경에 넣지 않았다.
  ⚠️ 따라서 지금부터 앱에는 **두 개의 근음 체계**가 공존한다 — 훈련 마커는
  E4/A4/B4, 시그니처·확인음은 E3/B4. 다음 판단이 필요한 지점.
- `wood()`·`piano()`·`drum()` 함수 자체(가산합성·배음 구조)는 손대지 않는다.
  바뀌는 건 **어떤 주파수로 부르느냐**뿐이다. 아래 `MARKER_FREQS` 참고.

═══════════════════════════════════════════════════════════════════════
 6. 2026-08-08 저녁 — 새 팩 2종 추가: 마림바(mallet) · 플럭(pluck)
═══════════════════════════════════════════════════════════════════════

§5의 25후보 탐색에서 나온 Soft Mallet·Premium Pluck 음색을 선택지로 승격한다.
`scripts/signature_sound.py`의 탐색용 SoundProfile 엔진을 그대로 옮기지 않고,
이 파일의 다른 악기(`wood`·`piano`·`drum`)와 같은 스타일(`env`·`_transient`
직접 호출)로 다시 짰다 — 파일 하나 안에서 함수들이 다른 패턴을 쓰면 다음에
고칠 사람이 매번 두 스타일을 오가야 한다.

  `mallet()` — `wood()`보다 배음이 적고 어택이 느리다(2ms→6ms). "또렷한 타격"
              (나무) 대신 "부드러운 타격"을 노린다.
  `pluck()`  — 이 파일에서 가장 짧은 어택(1.2ms), 배음이 차수가 오를수록
              빠르게 준다. 트랜지언트는 광대역 타격음이 아니라 좁은 '클릭'
              하나뿐 — 나무·피아노의 "때리는" 質感과 다른 "튕기는" 質感.

`VOICES`·`MARKER_FREQS`에 `'mallet'`·`'pluck'`를 추가하면 끝이다 — `main()`의
루프·미리듣기 생성 루프가 `VOICES`를 순회하는 구조라 자동으로 포함된다.
파일 수는 팩 축이 4→6이 되며 48→72(루프) + 4→6(미리듣기)로 늘어난다.

TS 쪽은 `features/audio-engine/soundPacks.ts`의 `SoundPackId`·`SOUND_PACKS`·
`LOOPS`·`PREVIEWS`에 대응 항목을 손으로 추가해야 한다(번들러가 `require()`
경로를 정적으로만 읽어 자동 생성이 안 된다). 둘 다 무료 팩이 아니다 —
기존 프리미엄 게이팅 원칙(무료는 '나무' 하나) 그대로.

═══════════════════════════════════════════════════════════════════════
 7. 2026-08-08 밤 — 팩 구성 정리: 나무·피아노·마림바·리듬 4종만 남긴다
═══════════════════════════════════════════════════════════════════════

창업자 결정: §6에서 늘린 6종 중 **'북'(drum)과 '플럭'(pluck)을 선택 가능한
팩에서 뺀다.** 최종 라인업은 나무 → 피아노 → 마림바 → **리듬(맨 아래)**.

- `pluck()` 함수는 다른 어디에서도 안 쓰여 완전히 삭제했다.
- `drum()` 함수는 **지우지 않는다** — 카운트인(`build_countin`)·시그니처
  (`build_signature`)·'리듬' 팩의 박자 층이 지금도 이 함수를 직접 부른다.
  "선택 가능한 팩"에서 빠지는 것과 "함수가 안 쓰인다"는 다른 이야기다.
- `MARKER_FREQS`의 저역 이조 상수(`MARKER_E2/A2/B2`)는 '북' 팩 전용이었어서
  같이 지웠다. 남은 4팩은 전부 같은 E4→A4→B4를 쓴다.
- TS 쪽 순서도 맞춰야 한다 — `soundPacks.ts`의 `SOUND_PACKS` 배열 순서가
  설정 화면에 그대로 노출되는 목록 순서다(§16 "왜 파일 구조" 참고).
"""
import os
import wave
import zlib

import numpy as np

from audio_tools import (
    SR, band_noise, hf_ratio, hit_similarity, loop_seam, lufs, modes,
    normalize_lufs_limited, reverb, room_tone, true_peak_db,
)

# ───────────────────────── 타이밍 (진실의 출처) ─────────────────────────

BASE_SWING = 1.1    # 기준 스윙 길이 — features/tempo/swingSpeeds.ts의 BASE_SWING_SEC
BASE_CYCLE = 2.0    # 기준 사이클 길이 — soundPacks.ts의 BASE_CYCLE_SEC

# 속도 id → 스윙 전체 길이(초). features/tempo/swingSpeeds.ts의 SWING_SPEEDS와 같아야 한다.
SPEEDS = {
    's133': 1.333,   # 느긋하게
    's120': 1.200,   # 여유 있게 (기본값)
    's107': 1.067,   # 탄력 있게
    's093': 0.933,   # 경쾌하게
}


def cycle_for(swing: float) -> float:
    """
    이 스윙 길이에서 루프 한 바퀴가 몇 초인가.

    ⚠️ `soundPacks.ts`의 `cycleSec()`과 **같은 공식**이어야 한다.
    이전에 배속 재생을 쓸 때는 앱이 파일 하나를 늘려 쓰는 구조라 이 값이
    한 곳에만 있으면 됐다. 이제 파일 자체가 속도별로 나뉘므로 두 곳이 맞아야
    하고, 어긋나면 **링 애니메이션과 소리가 서로 다른 속도로 돈다.**
    (2026-08-01에 실제로 비슷한 사고가 있었다 — AOS 리뷰 V-4)
    """
    return BASE_CYCLE * swing / BASE_SWING


E3 = 164.81     # 근음 — 시그니처 사운드·UI 확인음이 쓴다 (§5, 이번 변경 범위 밖)
E1 = 41.20      # 북의 기음 (E3의 2옥타브 아래) — 리듬 팩의 박자 층이 쓴다
B4 = E3 * 3     # 494.43 Hz — E3의 정확히 3배. 브랜드의 3:1을 주파수로 옮긴 값

# ── 훈련 마커 3음정 (2026-08-08, §5) ───────────────────────────────────
# START → TOP → IMPACT. E 근음 유지 + 기존 시그니처와 같은 B4로 해소.
# 근거: `scripts/signature_sound.py`의 25후보 실측 평가 + [[사운드-아이덴티티]] §1.
MARKER_E4 = 329.63
MARKER_A4 = 440.00
MARKER_B4 = 493.88   # 평균율. E3×3=494.43과 0.55Hz(≈2센트) 차이라 지각상 같은 음.

# 팩별 (start, top, impact) 주파수 — 전부 동일(§6-2 갱신, '북' 팩 제거로 저역
# 이조 필요 없어짐). '북'(drum())은 여전히 카운트인·시그니처·리듬 박자 층에서
# 쓰이지만 그 호출들은 이 표를 보지 않고 자기 기본값(E1)을 그대로 쓴다.
MARKER_FREQS = {
    'wood':   (MARKER_E4, MARKER_A4, MARKER_B4),
    'string': (MARKER_E4, MARKER_A4, MARKER_B4),   # 내부 id는 string, 실제는 피아노
    'rhythm': (MARKER_E4, MARKER_A4, MARKER_B4),   # 박자 층(북)은 E1 그대로, 마커만 3음정
    'mallet': (MARKER_E4, MARKER_A4, MARKER_B4),
}

PICKUP_BEATS = 2
PREVIEW_SEC = 1.5
COUNT_IN_SEC = 5   # 2026-08-01 창업자 요청으로 3초 → 5초

# 목표 라우드니스 (LUFS) — 2026-08-07 Phase 1로 전면 상향
LOOP_LUFS = -18.0        # 이전 -25.0
COUNT_IN_LUFS = -16.0    # 이전 -22.5. "지금 어드레스" 신호라 루프보다 앞선다
SIGNATURE_LUFS = -17.0   # 이전 -23.0
CUE_LUFS = -24.0         # 이전 -30.0. 루프보다 6dB 아래를 유지한다

# 공간 (2026-08-07) — 훈련 신호라 아주 보수적으로
REVERB_RT60 = 0.13
REVERB_WET = 0.12
# ⚠️ 룸톤은 **들리라고 넣는 게 아니다.** -80dBFS면 정규화 뒤에도 -73dBFS라
# 어떤 환경에서도 인지되지 않는다. 공간감을 만드는 일은 위 잔향이 하고,
# 룸톤이 하는 건 '진폭이 정확히 0인 구간'을 없애는 것뿐이다(양자화 거동에도 낫다).
# 히스로 들리는 순간 손해가 훨씬 크므로 의도적으로 이 아래에 둔다.
# 실기 청취에서 "소리 사이가 너무 비었다"는 반응이 나오면 그때 올릴 것.
ROOM_TONE_DB = -80.0

RATIOS = {'tempo_2_1': 2.0, 'tempo_2_5_1': 2.5, 'tempo_3_1': 3.0, 'tempo_3_5_1': 3.5}
# ⚠️ 2026-08-19 (T-39) — tempo_2_1 추가. 어프로치·퍼팅 프리미엄 프리셋용.
# 근거: [[T-39-어프로치퍼팅-프리미엄-프리셋]] — PGA투어 실측(2007)·Blast Motion
# 센서 데이터·Tour Tempo 방법론 세 출처가 전부 2:1로 수렴(창업자 확인 2026-08-19).
# 풀스윙(driver_iron) 3종과 물리적으로 같은 파이프라인을 타므로 팩·속도 축은 그대로 재사용한다.
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'audio')


def rng_for(*parts) -> np.random.Generator:
    """
    라운드로빈용 난수원 — **타격마다 다른 시드**를 결정론적으로 만든다.

    이전에는 `np.random.seed(7)` 하나로 전역 고정이었다. 재현성은 얻었지만
    대가로 모든 타격이 비트 단위로 같아졌다(상관계수 0.9948).

    여기서는 (팩, 비율, 속도, 타격 위치)를 문자열로 이어 CRC32를 시드로 쓴다.
    빌드마다 같은 결과가 나오면서(재현성 유지) 타격끼리는 다르다.
    CRC32를 쓰는 이유는 파이썬 `hash()`가 실행마다 달라지기 때문이다.
    """
    key = '|'.join(str(p) for p in parts).encode()
    return np.random.default_rng(zlib.crc32(key))


# ───────────────────────────── 음색 ─────────────────────────────

def env(n, atk, dec):
    """어택-감쇠 포락선. 어택을 아주 짧게 둬야 타격감이 산다."""
    t = np.arange(n) / SR
    a = np.clip(t / max(atk, 1e-5), 0, 1)
    return a * np.exp(-t / dec)


def _transient(n, rng, lo, hi, gain, decay, mode_freqs, mode_decays, mode_gains, vel):
    """
    타격 트랜지언트 — **재질을 말하는 부분**이다 (2026-08-07 신설).

    ⚠️ 길이가 `dur`에 딸려가지 않는다. 나무를 두드리는 순간의 물리는 템포와
    무관하기 때문이다. 이전에는 배속 재생이 이걸 통째로 늘렸고(느린 속도에서
    어택이 21% 느려졌다), 그게 "저가형"으로 들리는 원인 중 하나였다.
    """
    tn = min(n, int(SR * 0.055))
    t = np.arange(tn) / SR
    g = gain * (0.62 + 0.38 * vel) * (1.0 + rng.uniform(-0.12, 0.12))
    lo = lo * (1.0 + rng.uniform(-0.08, 0.08))     # 대역 가장자리도 타격마다 흔든다
    hi = hi * (1.0 + rng.uniform(-0.08, 0.08))
    decay = decay * (1.0 + rng.uniform(-0.15, 0.15))
    burst = band_noise(tn, lo, hi, rng) * np.exp(-t * decay) * g
    ring = modes(tn, mode_freqs, mode_decays,
                 [m * (0.55 + 0.45 * vel) for m in mode_gains], rng)
    out = np.zeros(n)
    out[:tn] = burst + ring
    return out


def wood(dur, f=E3, vel=1.0, rng=None):
    """
    나무 타격 — 마림바 계열.
    막대의 실제 공진처럼 홀수 배음이 아니라 3.9·9.2배 근처에 부분음이 선다.

    2026-08-07 개선 세 가지:
      · 부분음 감쇠를 늘렸다 — 이전엔 42ms·19ms라 2초 창에서 흔적만 남았다
      · 벨로시티가 고역 부분음 비중을 바꾼다 — 게인만 다른 같은 소리에서 벗어난다
      · 화이트 노이즈 마찰음(-21dB / 3.8ms, 사실상 안 들림)을
        **1.4~7kHz 대역 잡음 + 재질 모드**로 교체
    """
    rng = rng or np.random.default_rng(0)
    n = int(SR * dur)
    t = np.arange(n) / SR
    d = lambda: 1.0 + rng.uniform(-0.004, 0.004)   # 부분음 미세 디튠 (라운드로빈)
    g = lambda: 1.0 + rng.uniform(-0.18, 0.18)     # 부분음 세기 흔들림
    ak = 1.0 + rng.uniform(-0.15, 0.15)            # 어택 흔들림
    dk = 1.0 + rng.uniform(-0.08, 0.08)            # 감쇠 흔들림

    sig = (np.sin(2*np.pi*f*d()*t) * env(n, 0.002*ak, dur*0.30*dk)
           + (0.30 + 0.16*vel) * g() * np.sin(2*np.pi*f*3.9*d()*t) * env(n, 0.0012*ak, dur*0.22*dk)
           + (0.09 + 0.13*vel) * g() * np.sin(2*np.pi*f*9.2*d()*t) * env(n, 0.0008*ak, dur*0.11*dk))

    sig += _transient(n, rng, 1500, 7500, gain=1.05, decay=34,
                      mode_freqs=[2380, 4120, 6300], mode_decays=[0.020, 0.013, 0.008],
                      mode_gains=[0.34, 0.22, 0.13], vel=vel)
    return sig


def string(dur, f=E3, decay=0.9968, vel=1.0, brightness=0.60, rng=None):
    """
    뜯는 현 — Karplus-Strong. 잡음을 링버퍼에 넣고 평균 필터를 돌린다.

    ⚠️ 2026-08-06 어택 램프 추가 (T-24). 이전에는 링버퍼의 첫 샘플이 그대로
    출력 첫 샘플이 돼(값이 ±0.15까지) 루프마다 계단=클릭이 생겼다.

    2026-08-07: 여기도 라운드로빈. 초기 잡음이 매번 달라지므로 원래 변주 여지가
    가장 큰 음색인데, 전역 시드 하나로 고정돼 그 이점을 통째로 버리고 있었다.
    피크(뜯는 순간)도 벨로시티에 연동한다.

    ⚠️ 2026-08-07 실기기 검증(T-06): "단조처럼 어둡게 들린다, 더 밝게" 제보 반영.
    고전 Karplus-Strong의 2탭 평균 필터(`0.5*cur + 0.5*nxt`)는 고역을 강하게
    죽여 전형적으로 "따뜻하지만 어두운" 현 소리를 만든다(이게 표준 KS의 정체성이라
    악기로서는 맞지만, 이 음이 20~40분 반복되는 훈련 신호로는 무겁게 들릴 수 있다).
    `brightness`를 0.5보다 올리면(현재 0.60) 필터가 `cur` 쪽에 더 무게를 둬 고역
    감쇠가 줄고 더 화사하게 들린다. 1.0에 가까울수록 감쇠가 거의 없는 필터가 되어
    쇳소리에 가까워지므로 과하게 올리지 않는다(0.5~0.7 권장 범위).
    """
    rng = rng or np.random.default_rng(0)
    f = f * (1.0 + rng.uniform(-0.003, 0.003))
    n = max(2, int(SR / f))
    buf = np.convolve(rng.uniform(-1, 1, n), [0.5, 0.5], mode='same')
    # ⚠️ DC 성분 제거. Karplus-Strong의 평균 필터는 링버퍼의 평균값을 그대로
    # 유지하므로, 초기 잡음의 평균이 0이 아니면 그 값이 **끝까지 남는 DC 오프셋**이
    # 된다. 스피커에서 툭 하는 잡음이 되고 헤드룸도 낭비한다.
    buf -= buf.mean()
    dec = decay * (1.0 + rng.uniform(-0.0008, 0.0008))
    b = min(0.98, max(0.5, brightness))
    out = np.zeros(int(SR * dur))
    i = 0
    for k in range(len(out)):
        cur, nxt = buf[i], buf[(i+1) % n]
        out[k] = cur
        buf[i] = dec * (b * cur + (1 - b) * nxt)
        i = (i+1) % n

    atk = min(len(out), int(SR * 0.002))
    out[:atk] *= np.linspace(0, 1, atk)
    fade = min(len(out), int(SR*0.02))
    out[-fade:] *= np.linspace(1, 0, fade)

    # 손톱이 현을 스치는 순간 — 세게 뜯을수록 밝아진다
    # (2026-08-07: 게인 0.24→0.32 — 어택을 조금 더 또렷하게 해 첫인상을 밝게 한다)
    out += _transient(len(out), rng, 2200, 8000, gain=0.32, decay=140,
                      mode_freqs=[3100, 5400], mode_decays=[0.007, 0.004],
                      mode_gains=[0.06, 0.04], vel=vel)
    return out


def drum(dur=0.18, f=E1, vel=1.0, rng=None):
    """
    음정 없는 저역 타격 — 피치가 떨어지는 사인 + 비터 어택.

    2026-08-07: 비터(채)가 가죽에 닿는 소리를 되살렸다. 이전에는 광대역 노이즈
    exp(-200t)뿐이라 4kHz 이상 에너지가 0.17%였다 — 저역 '붕' 소리만 남아
    타격이 아니라 **사인 스윕**으로 들렸다. 저역 바디는 그대로 두고 어택만 더한다.
    """
    rng = rng or np.random.default_rng(0)
    n = int(SR * dur)
    t = np.arange(n) / SR
    pk = 1.0 + rng.uniform(-0.03, 0.03)
    freq = f * (2.6 * pk) * np.exp(-t*20) + f
    body = np.sin(2*np.pi*np.cumsum(freq)/SR) * np.exp(-t*24*(1 + rng.uniform(-0.07, 0.07)))
    sig = body + _transient(n, rng, 1300, 6000, gain=0.85, decay=85,
                            mode_freqs=[1750, 3050, 4600], mode_decays=[0.009, 0.005, 0.003],
                            mode_gains=[0.13, 0.08, 0.05], vel=vel)
    atk = min(n, int(SR * 0.0015))
    sig[:atk] *= np.linspace(0, 1, atk)
    fade = min(n, int(SR*0.01))
    sig[-fade:] *= np.linspace(1, 0, fade)
    return sig


def piano(dur, f=E3, vel=1.0, rng=None):
    """
    피아노 타격 — 해머가 현을 때리는 순간의 배음 구조.
    (2026-08-08, '현' 폐기 대응)

    같은 날 있었던 `string_signature_voice`(wood+string 블렌드) 시도를 대체한다.
    브라이트니스를 올려도, 시그니처 톤과 블렌드해도 근본 문제는 그대로였다 —
    Karplus-Strong 2탭 평균 필터 자체가 만드는 "어둡고 오래 우는" 캐릭터가
    20~40분 반복되는 훈련 신호에는 안 맞았다(§4, T-06 실기기 피드백 참고).
    투어템포가 톤으로 피아노를 쓰는 이유도 이것이라고 본다 — 배음이 넓게
    퍼져 있고 어택이 짧고 뚜렷해서, 같은 음을 반복해도 무겁게 쌓이지 않는다.

    현의 강성 때문에 부분음이 정수배에서 살짝 벌어지는 비조화성
    (inharmonicity, f_n = f·n·√(1+B·n²))을 반영한다 — 이게 없으면 오르간처럼
    밋밋하게 들린다. 세게 칠수록 고역 부분음 비중이 느는 것도 실제 피아노와
    같다(기존 wood()의 벨로시티 처리와 같은 원리).
    """
    rng = rng or np.random.default_rng(0)
    n = int(SR * dur)
    t = np.arange(n) / SR
    B = 0.0004   # 스타인웨이 중저음역 근사 비조화 계수

    ak = 1.0 + rng.uniform(-0.12, 0.12)
    dk = 1.0 + rng.uniform(-0.10, 0.10)
    d = lambda: 1.0 + rng.uniform(-0.0025, 0.0025)   # 부분음 미세 디튠 (라운드로빈)
    g = lambda: 1.0 + rng.uniform(-0.12, 0.12)       # 부분음 세기 흔들림

    # (배수, 기본 세기, 감쇠(dur 대비), (벨로시티 무관분, 벨로시티 비례분))
    partials = [
        (1, 1.00, 0.42, (0.55, 0.45)),
        (2, 0.58, 0.33, (0.35, 0.55)),
        (3, 0.36, 0.26, (0.28, 0.62)),
        (4, 0.22, 0.20, (0.20, 0.68)),
        (5, 0.13, 0.15, (0.15, 0.72)),
        (6, 0.08, 0.10, (0.10, 0.78)),
    ]
    sig = np.zeros(n)
    for k, amp, dec_frac, (base, boost) in partials:
        fk = f * k * np.sqrt(1 + B * k**2) * d()
        atk = (0.0022 if k == 1 else 0.0010) * ak
        env_k = env(n, atk, dur * dec_frac * dk)
        gain = amp * (base + boost * vel) * g()
        sig += gain * np.sin(2*np.pi*fk*t) * env_k
        if k <= 2:
            # 유니즌 현이 미세하게 어긋나며 만드는 자연스런 맥놀이(beating)
            sign = 1.0 if rng.uniform(-1, 1) > 0 else -1.0
            detune = 1.0 + sign * rng.uniform(0.0006, 0.0014)
            sig += gain * 0.5 * np.sin(2*np.pi*fk*detune*t) * env_k

    # 해머가 펠트를 통해 현을 때리는 순간의 어택 — 나무의 '노크'보다 둥글지만
    # 대역은 더 넓게 잡는다. 부분음이 6배(~1kHz)에서 끝나 그 아래가 전부
    # 어두웠는데, 실제 피아노의 "화사함"은 여기 트랜지언트 대역에 있다.
    sig += _transient(n, rng, 1200, 8000, gain=1.55, decay=40,
                      mode_freqs=[1900, 3600, 5600], mode_decays=[0.018, 0.012, 0.008],
                      mode_gains=[0.36, 0.24, 0.14], vel=vel)
    return sig


def mallet(dur, f=E3, vel=1.0, rng=None):
    """
    소프트 말렛 — 새 팩 (2026-08-08, §6). `wood()`와 같은 마림바 계열이지만
    더 적은 배음·더 느린 어택·더 좁고 낮은 트랜지언트 대역으로 **둔탁하지 않게
    따뜻한** 쪽을 노린다. `wood()`가 "또렷한 타격"이라면 이쪽은 "부드러운 타격".

    `scripts/signature_sound.py`의 탐색 후보 Soft Mallet을 프로덕션 톤으로
    옮긴 것 — 트랜지언트·감쇠는 이 파일의 다른 악기와 같은 방식(`_transient`,
    `env`)으로 다시 짰다(탐색용 엔진을 그대로 가져오지 않는다).
    """
    rng = rng or np.random.default_rng(0)
    n = int(SR * dur)
    t = np.arange(n) / SR
    d = lambda: 1.0 + rng.uniform(-0.004, 0.004)
    g = lambda: 1.0 + rng.uniform(-0.15, 0.15)
    ak = 1.0 + rng.uniform(-0.15, 0.15)
    dk = 1.0 + rng.uniform(-0.08, 0.08)

    sig = (np.sin(2*np.pi*f*d()*t) * env(n, 0.006*ak, dur*0.46*dk)
           + (0.22 + 0.10*vel) * g() * np.sin(2*np.pi*f*2.0*d()*t) * env(n, 0.004*ak, dur*0.30*dk)
           + (0.08 + 0.08*vel) * g() * np.sin(2*np.pi*f*3.9*d()*t) * env(n, 0.003*ak, dur*0.18*dk))

    sig += _transient(n, rng, 1400, 6500, gain=1.30, decay=44,
                      mode_freqs=[1900, 3300, 5000], mode_decays=[0.022, 0.014, 0.009],
                      mode_gains=[0.26, 0.17, 0.10], vel=vel)
    return sig


# 팩 id → (마커 소리 만드는 함수(d, f, vel, rng), 박자 층이 있는가)
# ⚠️ 2026-08-08(§5) — 세 마커가 같은 음이 아니게 되면서 `f`(주파수) 인자가 추가됐다.
# 호출부(`build`)가 `MARKER_FREQS`에서 위치별 주파수를 뽑아 넘긴다.
VOICES = {
    'wood':   (lambda d, f, vel, rng: wood(d, f=f, vel=vel, rng=rng), False),
    'string': (lambda d, f, vel, rng: piano(d, f=f, vel=vel, rng=rng), False),
    'mallet': (lambda d, f, vel, rng: mallet(d, f=f, vel=vel, rng=rng), False),
    'rhythm': (lambda d, f, vel, rng: piano(d, f=f, vel=vel, rng=rng), True),
}
# ⚠️ id는 'string'·'rhythm' 그대로 둔다 — 파일명(tempo_*__string__*.wav)과
# soundPacks.ts의 SoundPackId 타입까지 바꾸는 건 이번 변경 범위 밖이다.
# 'mallet'은 2026-08-08(§6) 신설 — 25후보 탐색의 Soft Mallet을 프로덕션 팩으로
# 승격한 것. `VOICES`에 넣는 것만으로 main()의 루프·미리듣기 생성이 자동으로
# 새 팩을 포함한다(딕셔너리를 순회하는 구조라서).
#
# ⚠️ 2026-08-08 밤(§7) — '북'(drum)·'플럭'(pluck)을 선택 가능한 팩에서 뺐다.
# `drum()` 함수 자체는 지우지 않는다 — 카운트인·시그니처·'리듬' 팩의 박자
# 층이 여전히 쓴다. `pluck()` 함수는 다른 곳에서 안 써 완전히 삭제했다.
# 사용자에게 보이는 이름(label)만 앱 쪽에서 '피아노'로 바뀐다.


def place(buf, sig, at, gain=1.0):
    """루프 버퍼에 얹는다. 끝을 넘으면 앞으로 감아 붙여 루프가 끊기지 않게 한다."""
    i = int(at * SR)
    L = len(buf)
    idx = (np.arange(len(sig)) + i) % L
    np.add.at(buf, idx, sig * gain)


def space(sig, circular, seed=11):
    """잔향 + 룸톤. 루프는 반드시 `circular=True`(위 §3-④ 참고)."""
    out = reverb(sig, rt60=REVERB_RT60, wet=REVERB_WET, circular=circular, seed=seed)
    return out + room_tone(len(out), ROOM_TONE_DB, np.random.default_rng(seed + 1))


# ───────────────────────── 연습 루프 ─────────────────────────

def build(pack, ratio_name, ratio, speed_id, swing):
    """
    한 조합(팩 × 비율 × 속도)의 루프 한 바퀴.

    ## 길이를 어떻게 스케일하는가

    음의 **감쇠**는 속도에 따라 늘어난다(느린 템포엔 긴 여운이 맞다). 이건
    배속 재생이 하던 일과 같으니 그대로 재현한다.
    반면 **트랜지언트는 스케일하지 않는다**(`_transient` 주석 참고) — 나무를
    두드리는 물리는 템포와 무관하다. 이전 배속 재생은 이 둘을 구분하지 못했다.
    """
    voice, pulse_layer = VOICES[pack]
    f_start, f_top, f_impact = MARKER_FREQS[pack]
    total = cycle_for(swing)
    k = swing / BASE_SWING          # 감쇠 길이 스케일
    buf = np.zeros(int(total * SR))
    back = swing * (ratio / (ratio + 1))

    def r(tag):
        return rng_for(pack, ratio_name, speed_id, tag)

    # ── 마커 3음 — 상승 3화음(§5), 길이·세기·음색으로도 구분 ──────────────
    #    벨로시티는 게인과 별개로 트랜지언트·고역 부분음 비중을 바꾼다.
    place(buf, voice(0.50*k, f_start, 0.55, r('start')),  0.0,   0.70)   # 백스윙 시작 — 가볍게
    place(buf, voice(0.42*k, f_top, 0.72, r('top')),      back,  0.80)   # 탑 — 짧게 끊어
    place(buf, voice(0.72*k, f_impact, 1.00, r('impact')), swing, 1.00)  # 임팩트 — 가장 길고 세게

    if pulse_layer:
        # ── 박자 층 — 백스윙을 3등분 ─────────────────────────
        #    다운스윙 구간은 비운다. 소리를 듣고 반응할 수 있는 시간이 아니고,
        #    비워두면 "지금 내려쳐" 신호가 더 또렷해진다.
        p = back / 3.0
        for j in range(3):
            place(buf, drum(vel=0.5, rng=r(f'pulse{j}')), j * p, 0.48)
        # 다음 스윙을 예고하는 픽업 2박
        for j in range(PICKUP_BEATS, 0, -1):
            at = total - j * p
            if at > swing + 0.05:
                place(buf, drum(vel=0.4, rng=r(f'pickup{j}')), at, 0.38)

    return space(buf, circular=True, seed=zlib.crc32(f'{pack}{ratio_name}'.encode()) % 9973)


def build_countin(sec=COUNT_IN_SEC):
    """
    매 샷 직전 카운트인 (2026-08-01: 3초 → 5초).

    5초로 늘린 이유(창업자 요청): 3초로는 클럽을 잡고 정렬까지 하기에 짧다.
    마지막 2박을 강하게 쳐 "이제 시작"이 분명해지게 한다.
    박 간격은 0.5초 — 스윙 템포와 무관한 일정한 준비 박자다.

    ⚠️ 속도별로 나누지 않는다. 준비 박자는 스윙 템포와 무관하고, 앱도 이 파일에는
    배속을 건 적이 없다(`startShotCycle`은 카운트인을 별도 플레이어로 재생한다).
    """
    buf = np.zeros(int(sec * SR))
    step = 0.5
    n = int(sec / step)
    for k in range(n):
        left = n - k
        strong = left <= 2                      # 마지막 2박을 강하게
        place(buf, drum(0.16, vel=0.95 if strong else 0.5, rng=rng_for('countin', k)),
              k * step, 0.95 if strong else 0.5)
    return space(buf, circular=False, seed=41)


# ───────────────── 사운드 아이덴티티 (2026-08-06, T-24) ─────────────────

def build_signature(total=1.9):
    """
    시그니처 사운드 — 브랜드 심볼을 소리로 옮긴 것.

        t=0.000  E3   시작
        t=0.825  E3   탑        ← 시간 간격이 3:1
        t=1.100  B4   임팩트    ← 주파수가 E3의 3배

    나무(마림바 계열)를 앞에 두고 현을 얇게 겹친다. 나무만 쓰면 마르고, 현만
    쓰면 흐릿하다. 앞은 타격, 뒤는 여운 — 두 층이 하는 일이 다르다.

    ⚠️ "세 지점은 같은 음"이라는 규칙을 여기서만 깨는 이유: 그 규칙은 **훈련 신호**에
    대한 것이다("음정이 오르면 빨라져야 한다고 읽힌다"). 시그니처는 동작을 지시하지
    않는 정체성이므로 대상이 아니다. 대신 상승폭을 **3:1이라는 브랜드 숫자 그 자체**로
    고정해 임의의 상승이 되지 않게 했다.
    """
    buf = np.zeros(int(total * SR))
    top = BASE_SWING * 0.75   # 0.825 — 3:1의 '3'이 끝나는 지점

    place(buf, wood(0.55, E3, vel=0.60, rng=rng_for('sig', 'w1')), 0.0, 0.62)
    place(buf, string(0.70, E3, vel=0.55, rng=rng_for('sig', 's1')), 0.0, 0.30)

    place(buf, wood(0.42, E3, vel=0.75, rng=rng_for('sig', 'w2')), top, 0.70)
    place(buf, string(0.55, E3, vel=0.70, rng=rng_for('sig', 's2')), top, 0.26)

    # 임팩트 — 여기서만 3배 위로 올라가 해소된다
    place(buf, wood(0.75, B4, vel=1.0, rng=rng_for('sig', 'w3')), BASE_SWING, 0.80)
    place(buf, string(0.80, B4, vel=1.0, rng=rng_for('sig', 's3')), BASE_SWING, 0.42)
    # 바닥을 잡아주는 저역 한 번. 로고에 무게를 준다.
    place(buf, drum(0.26, vel=0.8, rng=rng_for('sig', 'd')), BASE_SWING, 0.34)

    # 시그니처만 잔향을 조금 더 준다 — 훈련 신호가 아니라 정체성이라
    # 명료도보다 인상이 우선이다. 온보딩에서 딱 한 번 울린다.
    out = reverb(buf, rt60=0.24, wet=0.20, circular=False, seed=77)
    return out + room_tone(len(out), ROOM_TONE_DB, np.random.default_rng(78))


def build_cues():
    """
    UI 피드백 3종. 브랜드 톤이 "짧고 단정하게 / 과장 금지"라 축하하지 않는다.
    사실을 알리는 최소한의 소리만 낸다.
    """
    cues = {}

    # ① 마킹 지점 확정 — 가장 자주 울린다. 한 스윙 등록에 3번.
    #    짧고 건조하게. 조금이라도 길면 세 번 연속에서 지겨워진다.
    #    ⚠️ 세 번 연속 울리는 소리라 라운드로빈이 특히 중요하다. 다만 파일이
    #    하나라 여기서는 못 하고, 재생 쪽(`cues.ts`)의 과제로 남긴다.
    b = np.zeros(int(0.16 * SR))
    place(b, wood(0.14, E3, vel=0.85, rng=rng_for('cue', 'mark')), 0.0, 1.0)
    cues['cue_mark'] = b

    # ② 스윙 등록 완료 — 시그니처의 마지막 두 음만 떼어 쓴다.
    #    로고를 축약해 쓰는 것이라 들을 때마다 브랜드가 강화된다.
    b = np.zeros(int(0.70 * SR))
    place(b, wood(0.24, E3, vel=0.7, rng=rng_for('cue', 'saved1')), 0.0, 0.75)
    place(b, wood(0.45, B4, vel=1.0, rng=rng_for('cue', 'saved2')), 0.16, 0.90)
    place(b, string(0.50, B4, vel=0.8, rng=rng_for('cue', 'saved3')), 0.16, 0.30)
    cues['cue_saved'] = b

    # ③ 연습 20스윙 달성(NSM 완료) — **연습 중에 울린다.**
    #    그래서 가장 조용하고, 리듬을 만들지 않는다(동시 발음).
    #    박자처럼 들리면 사용자가 그 소리에 스윙을 맞추려 한다.
    b = np.zeros(int(0.90 * SR))
    place(b, string(0.80, E3, vel=0.45, rng=rng_for('cue', 'done1')), 0.0, 0.55)
    place(b, string(0.80, B4, vel=0.45, rng=rng_for('cue', 'done2')), 0.0, 0.28)
    cues['cue_complete'] = b

    return {k: space(v, circular=False, seed=101 + i) for i, (k, v) in enumerate(cues.items())}


# ───────────────────────────── 출력 ─────────────────────────────

def write(path, sig, target=LOOP_LUFS, seamless=False, extra=''):
    """
    LUFS로 정규화해 16bit WAV로 쓴다.

    ⚠️ `seamless=True`는 **루프 재생용 파일에만** 쓴다. 이음매를 크로스페이드해
    루프 경계의 클릭을 없애는데, 한 번만 재생되는 파일(미리듣기·시그니처·큐)에
    적용하면 시작 부분에 있지도 않은 잔향이 섞여 들어간다.

    2026-08-07: `normalize_lufs` → `normalize_lufs_limited`.
    목표를 -18로 올리자 크레스트가 큰 팩(북 10.6)이 피크 상한에 먼저 걸려
    목표에 3.5dB 못 미쳤다. 그러면 **팩 간 체감 음량이 다시 벌어진다.**
    """
    if seamless:
        sig = loop_seam(sig)
    sig = normalize_lufs_limited(sig, target)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((sig * 32767).astype('<i2').tobytes())
    print(f'  {os.path.basename(path):32s} {lufs(sig):6.1f} LUFS  {true_peak_db(sig):5.1f} dBTP'
          f'  HF{hf_ratio(sig):5.2f}%{extra}')
    return sig


def clean_stale():
    """
    더 이상 어디서도 만들지 않는 오디오 파일을 지운다.

    ① 배속 사전 렌더링 이전의 루프 파일(2026-08-07) — `tempo_3_1__wood.wav`처럼
       속도 접미사가 없는 파일.
    ② `VOICES`에서 빠진 팩의 잔재(2026-08-08 §7) — '북'·'플럭'을 선택 팩에서
       뺐을 때 실제로 겪은 문제다. 코드에서 빼는 것과 파일이 사라지는 것은
       별개라, 스크립트를 다시 돌려도 예전 파일이 그대로 남아 있었다.
       남겨두면 번들 용량만 늘고, 다음 사람이 "이 파일이 왜 있지"를 묻는다.
    """
    removed = 0
    for f in os.listdir(OUT):
        if not f.endswith('.wav'):
            continue
        if f.startswith('tempo_') and f.count('__') == 1:
            os.remove(os.path.join(OUT, f)); removed += 1
            continue
        if f.startswith('tempo_') and f.count('__') == 2:
            _, pack, _ = f[:-4].split('__')
            if pack not in VOICES:
                os.remove(os.path.join(OUT, f)); removed += 1
            continue
        if f.startswith('preview_'):
            pack = f[len('preview_'):-4]
            if pack not in VOICES:
                os.remove(os.path.join(OUT, f)); removed += 1
    if removed:
        print(f'  잔재 파일 {removed}개 삭제 (배속 재생 시절 · 빠진 팩)')


def main():
    clean_stale()

    print(f'\n연습 루프 — {len(RATIOS)}비율 × {len(VOICES)}팩 × {len(SPEEDS)}속도 '
          f'= {len(RATIOS)*len(VOICES)*len(SPEEDS)}파일 (seamless)')
    worst_sim = 0.0
    for speed_id, swing in SPEEDS.items():
        total = cycle_for(swing)
        print(f'  ── {speed_id}  스윙 {swing:.3f}s  사이클 {total:.4f}s')
        for name, ratio in RATIOS.items():
            for pack in VOICES:
                sig = write(os.path.join(OUT, f'{name}__{pack}__{speed_id}.wav'),
                            build(pack, name, ratio, speed_id, swing), seamless=True)
                back = swing * (ratio / (ratio + 1))
                # ⚠️ 어택 구간(50ms)으로 잰다 — 아래 hit_similarity 주석 참고
                sim = hit_similarity(sig, [0.0, back, swing])
                worst_sim = max(worst_sim, sim)

    print('\n미리듣기')
    # 3:1 사이클의 스윙 구간만 잘라 1.5초 안에 성격이 드러나게 한다.
    # 기준 속도(BASE_SWING)로 만든다 — 팩의 성격을 듣는 용도지 템포를 듣는 게 아니다.
    for pack in VOICES:
        sig = build(pack, 'tempo_3_1', 3.0, 'preview', BASE_SWING)[:int(PREVIEW_SEC * SR)]
        write(os.path.join(OUT, f'preview_{pack}.wav'), sig)

    print('\n카운트인')
    write(os.path.join(OUT, f'countin_{COUNT_IN_SEC}s.wav'),
          build_countin(), target=COUNT_IN_LUFS)

    print('\n시그니처 · UI 피드백')
    write(os.path.join(OUT, 'signature.wav'), build_signature(), target=SIGNATURE_LUFS)
    for name, sig in build_cues().items():
        write(os.path.join(OUT, f'{name}.wav'), sig, target=CUE_LUFS)

    total_mb = sum(os.path.getsize(os.path.join(OUT, f))
                   for f in os.listdir(OUT) if f.endswith('.wav')) / 1024 / 1024
    print(f'\n총 {len([f for f in os.listdir(OUT) if f.endswith(".wav")])}개 · {total_mb:.1f} MB')
    print(f'루프 타격 간 최대 상관계수 {worst_sim:.3f} (이전 0.995 — 낮을수록 변주가 산다)')


if __name__ == '__main__':
    main()
