#!/usr/bin/env python3
"""
오디오 계측·정규화 도구 (2026-08-06 신설, T-24)

## 왜 만들었나

기존 생성 스크립트는 **RMS로 음량을 맞추고 있었다.** 피크만 맞추는 것보다는
훨씬 낫지만(2026-08-01에 그 판단은 옳았다), RMS에는 여전히 구멍이 있다.

    사람의 귀는 41 Hz와 165 Hz를 같은 크기로 듣지 않는다.

'북' 팩의 기음은 E1(41.2 Hz)이고 '나무'는 E3(164.8 Hz)다. 둘을 같은 RMS로
맞추면 **북이 눈에 띄게 작게 들린다** — 저역은 같은 에너지로도 덜 크게 들리기
때문이다. 실제로 측정해보니 두 팩의 체감 음량이 5 dB 넘게 벌어져 있었다.
사용자 입장에서는 "팩을 바꿨더니 소리가 작아졌다"가 된다.

그래서 방송 표준인 **ITU-R BS.1770 (LUFS)** 을 쓴다. K-weighting은 사람 귀의
주파수 민감도를 근사한 필터라, 이 값으로 맞추면 음색이 달라도 체감 음량이 같다.

## 여기 있는 것

  lufs(x)              — 게이팅 적용 통합 라우드니스 (LUFS)
  true_peak(x)         — 4배 오버샘플 트루피크 (dBTP)
  normalize_lufs(x, t) — 목표 LUFS로 맞추고 트루피크 상한을 지킨다
  soft_limit(x)        — 하드 클리핑 대신 tanh 니(knee)로 눌러 왜곡을 줄인다
  loop_report(x)       — 루프 경계의 불연속(=클릭) 진단
  dc_remove(x)         — DC 오프셋 제거

⚠️ scipy 없이 numpy만 쓴다. 이 저장소는 앱이 본체고 파이썬은 에셋 생성용이라
의존성을 늘리지 않는 편이 낫다. 바이쿼드는 차분방정식 몇 줄이면 된다.
"""
from __future__ import annotations

import numpy as np

SR = 44100


# ─────────────────────────── 바이쿼드 ───────────────────────────

def _biquad_direct(x: np.ndarray, b: tuple, a: tuple) -> np.ndarray:
    """
    직접형 II 전치 구조. a[0]은 1로 정규화돼 있다고 가정한다.

    numpy에 lfilter가 없으므로 직접 돈다. **참조 구현**이다 —
    실제 호출은 아래 `_biquad`가 FFT 경로로 처리하고, 이 함수는
    등가성 검증용으로 남긴다(`python3 scripts/audio_tools.py`).
    """
    b0, b1, b2 = b
    a1, a2 = a
    y = np.empty_like(x)
    z1 = z2 = 0.0
    for n in range(len(x)):
        xn = x[n]
        yn = b0 * xn + z1
        z1 = b1 * xn - a1 * yn + z2
        z2 = b2 * xn - a2 * yn
        y[n] = yn
    return y


def _biquad(x: np.ndarray, b: tuple, a: tuple) -> np.ndarray:
    """
    같은 바이쿼드를 **주파수 영역에서** 적용한다 (2026-08-07 속도 개선).

    ## 왜 바꿨나

    파이썬 for 루프는 샘플당 한 번 돈다. 라우드니스 측정 한 번이 K-weighting
    2단 = 2N번이고, 이걸 파일마다 정규화·리포트로 두 번씩 부른다.
    속도별 사전 렌더링으로 파일이 12개 → **48개**가 되면서(Phase 1) 이 비용이
    스크립트 실행 시간의 대부분을 차지하게 됐다. 에셋 생성이 몇 분씩 걸리면
    **사람이 소리를 고쳐가며 반복 청취하는 루프가 끊긴다.** 그게 진짜 손해다.

    ## 왜 결과가 같은가

    이 필터는 인과·안정이고 초기 상태가 0이므로, 신호를 임펄스 응답 길이 이상
    제로패딩하면 원형 합성곱 = 선형 합성곱이 된다. 여기 쓰는 두 단 중 감쇠가
    가장 느린 38Hz 하이패스도 극 반지름이 0.9946이라 임펄스 응답이 ~2,600샘플이면
    -120dB 아래로 떨어진다. 2N 패딩이면 차고 넘친다.

    등가성은 이 파일을 직접 실행하면 `_biquad_direct`와 대조 검증된다.
    """
    x = np.asarray(x, dtype=np.float64)
    n = len(x)
    if n < 64:
        return _biquad_direct(x, b, a)

    m = 1 << int(np.ceil(np.log2(2 * n)))
    b0, b1, b2 = b
    a1, a2 = a

    w = 2 * np.pi * np.fft.rfftfreq(m)
    e1 = np.exp(-1j * w)
    e2 = e1 * e1
    h = (b0 + b1 * e1 + b2 * e2) / (1.0 + a1 * e1 + a2 * e2)

    y = np.fft.irfft(np.fft.rfft(x, m) * h, m)[:n]
    return y


def k_weight(x: np.ndarray, sr: int = SR) -> np.ndarray:
    """
    ITU-R BS.1770 K-weighting = 고역 쉘프(머리 그림자 보정) + 고역통과(저역 감쇠).

    계수는 표준이 48kHz 기준으로 제시하므로, 다른 샘플레이트에서는 극/영점을
    다시 계산해야 한다. 여기서는 표준이 정의한 아날로그 프로토타입을
    쌍선형 변환으로 옮긴다(48kHz에서 표준 계수와 일치하는 것을 확인).
    """
    # ── 1단: 고역 쉘프 (+4 dB @ ~1681 Hz, Q=0.7071)
    f0, g_db, q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    a_ = 10 ** (g_db / 40)
    w0 = 2 * np.pi * f0 / sr
    alpha = np.sin(w0) / (2 * q)
    cw = np.cos(w0)
    sq = 2 * np.sqrt(a_) * alpha
    b0 = a_ * ((a_ + 1) + (a_ - 1) * cw + sq)
    b1 = -2 * a_ * ((a_ - 1) + (a_ + 1) * cw)
    b2 = a_ * ((a_ + 1) + (a_ - 1) * cw - sq)
    a0 = (a_ + 1) - (a_ - 1) * cw + sq
    a1 = 2 * ((a_ - 1) - (a_ + 1) * cw)
    a2 = (a_ + 1) - (a_ - 1) * cw - sq
    y = _biquad(x, (b0 / a0, b1 / a0, b2 / a0), (a1 / a0, a2 / a0))

    # ── 2단: 고역통과 (약 38 Hz, Q=0.5)
    f0, q = 38.13547087602444, 0.5003270373238773
    w0 = 2 * np.pi * f0 / sr
    alpha = np.sin(w0) / (2 * q)
    cw = np.cos(w0)
    b0 = (1 + cw) / 2
    b1 = -(1 + cw)
    b2 = (1 + cw) / 2
    a0 = 1 + alpha
    a1 = -2 * cw
    a2 = 1 - alpha
    return _biquad(y, (b0 / a0, b1 / a0, b2 / a0), (a1 / a0, a2 / a0))


# ─────────────────────────── 라우드니스 ───────────────────────────

def lufs(x: np.ndarray, sr: int = SR) -> float:
    """
    게이팅 적용 통합 라우드니스 (LUFS, 모노).

    400ms 블록을 75% 겹쳐 재고, 절대 게이트(-70 LUFS)로 무음을 버린 뒤
    상대 게이트(평균 -10 dB)로 다시 거른다 — BS.1770-4 절차 그대로다.

    ⚠️ 게이팅이 중요한 이유: 우리 루프는 2초 중 상당 부분이 **의도적 침묵**이다
    (다운스윙 구간을 비워 임팩트를 또렷하게 만든 설계). 게이팅 없이 평균을 내면
    침묵이 값을 끌어내려, 소리가 성긴 팩일수록 자동으로 크게 증폭된다.
    """
    y = k_weight(np.asarray(x, dtype=np.float64), sr)
    block = int(0.4 * sr)
    hop = block // 4
    if len(y) < block:
        y = np.pad(y, (0, block - len(y)))

    starts = range(0, len(y) - block + 1, hop)
    powers = np.array([np.mean(y[s:s + block] ** 2) for s in starts])
    powers = np.maximum(powers, 1e-20)
    loud = -0.691 + 10 * np.log10(powers)

    keep = loud > -70.0
    if not keep.any():
        return -70.0
    rel = -0.691 + 10 * np.log10(powers[keep].mean()) - 10.0
    keep2 = keep & (loud > rel)
    if not keep2.any():
        keep2 = keep
    return float(-0.691 + 10 * np.log10(powers[keep2].mean()))


def true_peak_db(x: np.ndarray, oversample: int = 4) -> float:
    """
    트루피크 (dBTP). 4배 오버샘플해서 샘플 사이에 숨은 피크까지 본다.

    16bit WAV로 내보낸 뒤 기기 DAC에서 재구성될 때, 샘플값 피크가 0.95라도
    실제 아날로그 피크는 1.0을 넘을 수 있다. 그러면 재생 단에서 클리핑이 난다 —
    조용한 앱에서 딱 한 번 나는 지직 소리가 품질 인상을 통째로 망친다.
    """
    n = len(x)
    spec = np.fft.rfft(x)
    up = np.zeros(n * oversample // 2 + 1, dtype=complex)
    up[: len(spec)] = spec
    y = np.fft.irfft(up, n * oversample) * oversample
    peak = float(np.max(np.abs(y)))
    return 20 * np.log10(max(peak, 1e-12))


def dc_remove(x: np.ndarray) -> np.ndarray:
    """DC 오프셋 제거 — 헤드룸을 낭비하고 스피커에서 '툭' 소리를 만든다."""
    return x - float(np.mean(x))


def soft_limit(x: np.ndarray, ceiling: float = 0.89) -> np.ndarray:
    """
    tanh 니(knee) 리미터.

    하드 클리핑은 고차 배음을 왕창 만들어 **자연 소재를 지향하는 브랜드와 정면으로
    충돌하는 지직거림**을 낳는다. 니 아래는 손대지 않고 위쪽만 부드럽게 누른다.
    """
    knee = ceiling * 0.7
    out = x.copy()
    over = np.abs(x) > knee
    if over.any():
        sign = np.sign(x[over])
        excess = (np.abs(x[over]) - knee) / max(ceiling - knee, 1e-9)
        out[over] = sign * (knee + (ceiling - knee) * np.tanh(excess))
    return out


def normalize_lufs(x: np.ndarray, target: float, ceiling_dbtp: float = -1.0,
                   sr: int = SR) -> np.ndarray:
    """
    목표 LUFS로 맞추되 트루피크 상한을 넘지 않게 한다.

    상한을 -1 dBTP로 잡은 이유: 손실 압축(스토어 미리듣기 영상 등)을 거치면
    피크가 조금 올라간다. 여유를 두는 편이 안전하다.
    """
    x = dc_remove(np.asarray(x, dtype=np.float64))
    cur = lufs(x, sr)
    if cur <= -70.0:
        return x
    x = x * (10 ** ((target - cur) / 20))

    tp = true_peak_db(x)
    if tp > ceiling_dbtp:
        x = x * (10 ** ((ceiling_dbtp - tp) / 20))
    return soft_limit(x)


# ─────────────────────────── 루프 진단 ───────────────────────────

def loop_report(x: np.ndarray, sr: int = SR) -> dict:
    """
    루프 경계가 매끄러운지 본다.

    ⚠️ 2026-08-06에 이걸로 실제 결함을 찾았다. '현'/'리듬' 팩은 Karplus-Strong
    출력을 **어택 포락선 없이** 그대로 얹고 있어서, 버퍼 첫 샘플이 0.15까지
    튀었다. 앞은 무음(0)으로 끝나므로 루프가 돌 때마다 0 → 0.15 계단이 생긴다.
    2초에 한 번씩 나는 '틱' 소리 — 20분 연습하면 600번이다.

    step  : 마지막 샘플과 첫 샘플의 차 (계단 높이)
    slope : 경계 앞뒤의 기울기 차 (1차 불연속)
    """
    step = float(x[0] - x[-1])
    slope_before = float(x[-1] - x[-2])
    slope_after = float(x[1] - x[0])
    return {
        'step': step,
        'step_db': 20 * np.log10(max(abs(step), 1e-12)),
        'slope_jump': abs(slope_after - slope_before),
    }


def loop_seam(x: np.ndarray, ms: float = 3.0, sr: int = SR) -> np.ndarray:
    """
    루프 이음매를 크로스페이드로 매끈하게 만든다.

    끝부분 ms만큼을 앞부분에 겹쳐 섞는다. 결과적으로 x[0] 근처가 x[-1] 근처와
    연속이 되어 계단이 사라진다.

    ⚠️ 길이를 바꾸지 않는다 — 루프 길이는 `CYCLE_SEC`과 정확히 같아야 하고,
    앱의 스윙 카운트·링 애니메이션이 그 값에 묶여 있다.
    3ms는 132샘플로, 어떤 타격음의 어택보다도 짧아 리듬감에 영향이 없다.
    """
    n = int(sr * ms / 1000)
    if n < 4 or n * 2 >= len(x):
        return x
    out = x.copy()
    fade = np.linspace(0.0, 1.0, n)
    # 앞 n샘플 = (뒤 n샘플의 잔향) 페이드아웃 + (원래 앞부분) 페이드인
    out[:n] = x[:n] * fade + x[-n:] * (1 - fade)
    out[-n:] = x[-n:] * (1 - fade)
    return out


# ═══════════════════════════════════════════════════════════════════
#  음색·공간 도구 (2026-08-07 신설, 사운드 품질 Phase 2)
#
#  [[사운드품질-진단과개선계획-2026-08-07]]의 측정 결과에 대응한다.
#  요약하면 우리 소리는 이랬다.
#
#    · 나무 팩의 4kHz 이상 에너지가 **0.01%** — 로우패스 먹인 것처럼 어둡다
#    · 타격 트랜지언트가 -21dB / 3.8ms — 인지되기 전에 사라진다
#    · 1번 타격과 2번 타격의 상관계수가 **0.9948** — 비트 단위로 같은 소리
#    · 잔향 0, 26.9%가 -60dBFS 이하 절대 무음 — 현실에 없는 상태
#
#  아래 도구는 각각 그 네 가지에 대응한다.
# ═══════════════════════════════════════════════════════════════════


def band_noise(n: int, lo: float, hi: float, rng: np.random.Generator,
               sr: int = SR) -> np.ndarray:
    """
    대역 제한 잡음 — **타격 트랜지언트의 재료**다.

    ## 왜 화이트 노이즈가 아닌가

    이전 `wood()`는 화이트 노이즈를 그냥 얹었다. 그런데 실제 타격음의 트랜지언트는
    화이트가 아니다. 말렛이 나무에 닿는 순간의 소리는 **재질이 걸러낸 대역**이고,
    사람이 "나무"라고 알아듣는 단서가 정확히 거기 있다. 화이트 노이즈는
    저역까지 다 들어 있어 기음과 겹쳐 지저분해지기만 하고, 정작 단서가 되는
    2~7kHz는 다른 대역과 나눠 갖느라 약해진다.

    같은 에너지를 **그 대역에만** 쓰면 훨씬 적은 게인으로 훨씬 또렷해진다.

    ⚠️ 여기서 만드는 고역은 '삐-' 소리가 아니다. 2026-08-01에 폐기한 비프는
    **지속되는 순음**이었고(660Hz가 계속 울린다), 이건 20ms 안에 사라지는
    잡음 버스트다. 귀는 전자를 '음정'으로, 후자를 '타격'으로 듣는다.
    """
    x = rng.standard_normal(n)
    spec = np.fft.rfft(x)
    fr = np.fft.rfftfreq(n, 1 / sr)
    # 가장자리를 급격히 자르면 링잉이 생기므로 코사인 경사로 부드럽게 연다
    gain = np.zeros_like(fr)
    edge = max(lo * 0.4, 120.0)
    up = (fr > lo - edge) & (fr < lo + edge)
    gain[up] = 0.5 - 0.5 * np.cos(np.pi * (fr[up] - (lo - edge)) / (2 * edge))
    gain[(fr >= lo + edge) & (fr <= hi - edge)] = 1.0
    dn = (fr > hi - edge) & (fr < hi + edge)
    gain[dn] = 0.5 + 0.5 * np.cos(np.pi * (fr[dn] - (hi - edge)) / (2 * edge))
    y = np.fft.irfft(spec * gain, n)
    peak = np.max(np.abs(y))
    return y / peak if peak > 1e-9 else y


def modes(n: int, freqs, decays, gains, rng: np.random.Generator | None = None,
          sr: int = SR) -> np.ndarray:
    """
    짧은 공진 모드 몇 개를 겹친다 — 트랜지언트에 **재질**을 입힌다.

    잡음 버스트만으로는 "무언가 부딪혔다"까지밖에 못 간다. 재질을 말하는 건
    부딪힌 물체가 잠깐 우는 소리다. 감쇠를 20ms 안쪽으로 두는 게 핵심 —
    이보다 길면 귀가 **음정**으로 듣기 시작하고, 그러면 우리가 폐기한 비프로
    되돌아간다.

    `rng`를 주면 주파수를 ±1.5% 흔든다(라운드로빈).
    """
    t = np.arange(n) / sr
    out = np.zeros(n)
    for f, d, g in zip(freqs, decays, gains):
        if rng is not None:
            f = f * (1.0 + rng.uniform(-0.015, 0.015))
            d = d * (1.0 + rng.uniform(-0.12, 0.12))
        out += g * np.sin(2 * np.pi * f * t + (rng.uniform(0, 2 * np.pi) if rng is not None else 0.0)) \
                 * np.exp(-t / max(d, 1e-5))
    return out


def _ir(rt60: float, sr: int = SR, seed: int = 11, damp: float = 0.55) -> np.ndarray:
    """
    아주 짧은 방의 임펄스 응답. 지수 감쇠 잡음 + 고역 감쇠(damp).

    실제 홀을 흉내 내려는 게 아니다. 목표는 딱 하나 — **디지털 진공 없애기.**
    소리가 끝나는 순간 진폭이 정확히 0이 되는 상태는 현실에 존재하지 않고,
    귀는 그걸 즉시 "샘플 재생"으로 분류한다.
    """
    rng = np.random.default_rng(seed)
    n = int(sr * rt60 * 1.4)
    t = np.arange(n) / sr
    x = rng.standard_normal(n) * np.exp(-t * 6.908 / max(rt60, 1e-3))
    # 이동평균 = 1차 로우패스. 뒤로 갈수록 어두워지도록 두 번 섞는다.
    k = max(2, int(sr * damp / 10000))
    dark = np.convolve(x, np.ones(k) / k, mode='same')
    x = x * (1 - t / t[-1]) + dark * (t / t[-1])
    # 프리딜레이 6ms — 직접음과 잔향이 붙어 있으면 공간이 아니라 '뭉갬'이 된다
    pre = int(sr * 0.006)
    ir = np.concatenate([np.zeros(pre), x])
    return ir / (np.sqrt(np.sum(ir ** 2)) + 1e-12)


def reverb(x: np.ndarray, rt60: float = 0.13, wet: float = 0.12,
           circular: bool = False, sr: int = SR, seed: int = 11) -> np.ndarray:
    """
    아주 짧은 잔향을 섞는다.

    ⚠️ `circular=True`는 **루프 파일 전용**이다.
    선형 합성곱을 쓰면 마지막 임팩트의 잔향이 파일 끝에서 잘려 나가고, 루프가
    돌 때 그 자리에 계단이 생긴다 — 2026-08-06에 잡았던 '틱' 소리가 다른
    경로로 되살아나는 셈이다. 원형 합성곱으로 돌리면 꼬리가 파일 앞으로
    자연스럽게 감겨 붙어 **루프 경계가 오히려 더 매끄러워진다.**
    (한 번만 재생되는 파일은 반대다 — 시작 부분에 있지도 않은 잔향이 섞인다.)

    ## wet을 12%로 낮게 잡은 이유

    이 소리는 감상용이 아니라 **훈련 신호**다. 잔향이 길거나 크면 임팩트
    지점이 흐려지고, 그건 이 제품이 하는 일 자체를 망친다.
    "공간이 있다"고 느낄 최소한만 쓴다. RT60 130ms는 작은 방 수준이다.
    """
    ir = _ir(rt60, sr, seed)
    n = len(x)
    if circular:
        m = max(n, len(ir))
        wetsig = np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:n]
    else:
        wetsig = np.convolve(x, ir)[:n]
    # 드라이를 그대로 두고 웻만 더한다 — 타격의 어택이 절대 약해지면 안 된다
    return x + wetsig * wet * (np.max(np.abs(x)) / (np.max(np.abs(wetsig)) + 1e-12))


def room_tone(n: int, level_db: float = -80.0, rng: np.random.Generator | None = None,
              sr: int = SR) -> np.ndarray:
    """
    들리지 않을 만큼 낮은 룸톤.

    측정해보니 루프의 **26.9%가 -60dBFS 이하 절대 무음**이었다. 우리 루프는
    다운스윙 구간을 의도적으로 비운 설계라 무음 비중이 특히 크다.
    무음 → 소리 → 무음의 계단은 현실에 없는 상태다.

    -80dBFS에 1.5kHz 로우패스를 건다. 히스로 들리면 안 되니까 **어둡게** 만든다.
    (밝은 잡음은 같은 크기여도 '노이즈'로 인지된다. 브랜드가 조용한 앱이라
    여기서 실수하면 손해가 크다.)
    """
    rng = rng or np.random.default_rng(3)
    x = rng.standard_normal(n)
    k = max(2, int(sr / 1500))
    x = np.convolve(x, np.ones(k) / k, mode='same')
    x = x / (np.max(np.abs(x)) + 1e-12)
    return x * (10 ** (level_db / 20))


def normalize_lufs_limited(x: np.ndarray, target: float, ceiling_dbtp: float = -1.0,
                           sr: int = SR, iters: int = 6) -> np.ndarray:
    """
    목표 LUFS에 **실제로 도달하는** 정규화 (2026-08-07 신설).

    ## 왜 기존 `normalize_lufs`로는 안 되는가

    기존 함수는 트루피크가 상한을 넘으면 **전체를 선형으로 줄인다.** 목표
    라우드니스가 낮을 때(-25 LUFS)는 걸릴 일이 없어 문제가 없었다.
    그런데 Phase 1에서 목표를 -18 LUFS로 올리자 바로 드러났다 —

        나무: 크레스트 6.3  →  여유 있게 도달
        북  : 크레스트 10.6 →  피크가 먼저 상한에 닿아 **-21.5 LUFS에서 멈춤**

    즉 팩마다 도달 지점이 달라져, LUFS를 도입해 맞춰놓은 **팩 간 체감 음량이
    다시 벌어진다.** "북으로 바꿨더니 작아졌다"가 되돌아온다.

    ## 무엇을 하는가

    선형으로 줄이는 대신 `soft_limit`의 tanh 니로 피크만 눌러 크레스트를
    낮추고, 그만큼 줄어든 라우드니스를 다시 올린다. 수렴할 때까지 반복한다.
    마스터링 리미터가 하는 일과 같다.

    타격음은 이 처리에 관대하다 — 눌리는 구간이 어택 수 ms뿐이고, 그 왜곡은
    오히려 '단단함'으로 들린다. 반대로 지속음이었다면 쓰면 안 되는 방법이다.
    """
    x = dc_remove(np.asarray(x, dtype=np.float64))
    cur = lufs(x, sr)
    if cur <= -70.0:
        return x

    ceiling_lin = 10 ** (ceiling_dbtp / 20)
    y = x * (10 ** ((target - cur) / 20))

    for _ in range(iters):
        tp = true_peak_db(y)
        if tp <= ceiling_dbtp + 0.05:
            break
        # 상한 조금 아래를 니로 잡아 눌러 크레스트를 깎는다
        y = soft_limit(y, ceiling=ceiling_lin * 0.97)
        gap = target - lufs(y, sr)
        if abs(gap) < 0.05:
            break
        y = y * (10 ** (gap / 20))

    # 마지막 안전망 — 여기까지 와서도 넘으면 선형으로 맞춘다(정확도보다 안전 우선)
    tp = true_peak_db(y)
    if tp > ceiling_dbtp:
        y = y * (10 ** ((ceiling_dbtp - tp) / 20))
    return y


# ─────────────────────────── 회귀 측정 ───────────────────────────

def hf_ratio(x: np.ndarray, cutoff: float = 4000.0, sr: int = SR) -> float:
    """
    전체 에너지 중 `cutoff` 위가 차지하는 비율(%).

    "소리가 어둡다"를 숫자로 잡는 지표다. 측정 당시 나무 팩이 **0.01%**였다.
    타격음의 재질감이 사는 대역이 통째로 비어 있었다는 뜻이다.
    `audit.py`가 이 값의 하한을 지킨다 — 음색을 손대다 회귀하는 걸 막는다.
    """
    x = np.asarray(x, dtype=np.float64)
    s = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
    fr = np.fft.rfftfreq(len(x), 1 / sr)
    tot = s.sum()
    return float(s[fr > cutoff].sum() / tot * 100) if tot > 0 else 0.0


def hit_similarity(x: np.ndarray, positions, win: float = 0.05,
                   sr: int = SR) -> float:
    """
    타격들의 **어택 구간**이 서로 얼마나 같은가 (0~1).
    라운드로빈이 실제로 걸렸는지 본다.

    ## 왜 창이 50ms인가

    처음엔 180ms로 쟀는데 값이 0.996으로 나왔다. 변주를 넣었는데도 그대로였다.
    측정이 틀렸던 것이다 — 창을 길게 잡으면 값의 대부분이 **바디(지속되는
    165Hz 사인)** 에서 나오는데, 바디는 원래 같아야 한다. 팩의 음정이 타격마다
    흔들리면 그게 더 싸구려다.

    사람이 '기계 같다'고 느끼는 건 **어택**이 매번 똑같을 때다. 상용 샘플
    라이브러리의 라운드로빈도 실은 어택의 차이를 사는 것이다.
    그래서 창을 어택 구간으로 좁힌다 — 재려던 것을 재게 된다.

    ## 왜 이걸 재는가

    측정 당시 1번 타격과 2번 타격의 정규화 상관계수가 **0.9948**이었다.
    `np.random.seed(7)` 하나로 고정하고 같은 함수를 부르니, 세 마커가
    **게인만 다른 동일 파형**이었던 것이다. 파일 자체도 루프라 2초마다
    같은 것이 반복된다 — 20분 연습이면 600번의 동일 파형이다.

    사람의 청각은 이 완전한 반복을 즉시 '기계'로 분류한다. 상용 샘플
    라이브러리가 라운드로빈(같은 음의 다른 테이크 4~8개)에 돈을 쓰는 이유가
    이것이고, 저가/고가 사운드를 가르는 가장 큰 갈림길이다.

    각 타격 구간을 정규화해 짝별 상관계수를 구하고 그 최댓값을 돌려준다.
    """
    n = int(win * sr)
    segs = []
    for at in positions:
        i = int(at * sr)
        seg = np.concatenate([x, x])[i:i + n] if i + n > len(x) else x[i:i + n]
        peak = np.max(np.abs(seg))
        if peak > 1e-6:
            segs.append(seg / peak)
    if len(segs) < 2:
        return 0.0
    worst = 0.0
    for i in range(len(segs)):
        for j in range(i + 1, len(segs)):
            c = float(np.corrcoef(segs[i], segs[j])[0, 1])
            worst = max(worst, abs(c))
    return worst


if __name__ == '__main__':
    # `_biquad`(FFT)가 참조 구현 `_biquad_direct`와 같은 결과를 내는지 확인한다.
    rng = np.random.default_rng(0)
    sig = rng.standard_normal(20000)
    coef_b = (0.5, -0.3, 0.1)
    coef_a = (-1.2, 0.5)
    err = np.max(np.abs(_biquad(sig, coef_b, coef_a) - _biquad_direct(sig, coef_b, coef_a)))
    print(f'_biquad FFT vs 참조 구현 최대 오차: {err:.3e}')
    assert err < 1e-9, 'FFT 바이쿼드가 참조 구현과 어긋난다'
    print('OK')
