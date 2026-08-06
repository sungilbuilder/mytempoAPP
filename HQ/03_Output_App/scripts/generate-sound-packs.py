#!/usr/bin/env python3
"""
연습 소리 전체 재설계 (2026-08-01, WBS 2.18)

## 왜 다시 만들었나

창업자 전달: "설정의 연습 소리가 전체적인 브랜드 톤앤매너와 안 맞는다는 지적을 들었다."
측정해보니 지적이 정확했다. 기존 5개 팩의 첫 타격 피크 주파수를 뽑아보면:

    비프    660 Hz   ≈ E5     ← 전자 알림음 대역
    클릭   1800 Hz   ≈ A6     ← 초고역, 기계적
    우드블록 420 Hz   ≈ G#4
    드럼    124 Hz   ≈ B2
    리듬    332 Hz   ≈ E4

**두 가지 문제가 있었다.**

1) **음색 방향이 브랜드와 반대다.** 브랜드는 포레스트 그린 + 골드, 플랫, 절제,
   "프리미엄 기기"(WHOOP/Oura류)를 지향한다. 그런데 비프·클릭은 전형적인
   **가전 알림음**이다. 자연 소재를 지향하는 브랜드에 삐- 소리가 붙어 있었다.

2) **팩마다 조율이 제각각이다.** E5 / A6 / G#4 / B2 / E4 — 아무 관계가 없는 음들이다.
   팩을 바꾸면 음색뿐 아니라 **음 자체가 바뀐다.** 같은 제품의 소리로 들리지 않는다.

## 새 설계 — 하나의 음 위에 음색만 다르게

**모든 팩을 E 계열로 통일한다. 근음 E3 = 164.81 Hz.**

왜 E3인가:
  · 연습장 소음의 주요 대역은 클럽 임팩트(2~5 kHz)와 웅성거림(200~800 Hz)이다.
    E3의 기음 165 Hz는 그 아래라 묻히지 않고, 배음(330·495 Hz)이 존재감을 만든다.
  · 남성·여성 모두에게 편안한 저중역. 오래 들어도 피로하지 않다.
  · 브랜드 마크가 3:1이라는 **단순 정수비**를 형상화하듯, 음정도 옥타브·완전5도 같은
    단순 정수비만 쓴다. 북은 E1(41.2 Hz), 현·나무는 E3.

**세 지점(시작·탑·임팩트)은 같은 음이다.** 음정을 올리면 "빨라져야 한다"는 인상을
주는데, 이 제품은 정확히 그 오해를 없애려 하고 있다(2026-08-01 창업자 확정).
구분은 **길이와 세기**로 한다 — 임팩트가 가장 길고 세다.

## 팩 구성 (5종 → 4종)

  나무   E3   마림바에 가까운 나무 타격. 가장 자연스럽고 기본값
  현     E3   뜯는 현. 여운이 남아 리듬이 이어지는 느낌
  북     E1   음정 없는 저역 타격. 소음 큰 실내에서 몸으로 느껴짐
  리듬   E3   현이 세 지점 + 북이 그 사이 박자 (2층 구조)

**비프·클릭은 폐기.** 브랜드와 정면으로 충돌하고, 대체 없이 두면 계속 노출된다.

## 음량

피크가 아니라 **체감 음량(RMS)** 을 -26.5 dBFS로 맞춘다. 피크만 맞추면 길게 울리는
소리가 짧은 타격음보다 훨씬 크게 들린다(2026-08-01 창업자 지적으로 확인).

실행: python3 scripts/generate-sound-packs.py
"""
import os
import wave

import numpy as np

SR = 44100
SWING = 1.1     # 스윙 전체(백스윙+다운스윙) — practice.tsx의 CYCLE_MS와 함께 맞춰야 한다
CYCLE = 2.0     # 루프 한 바퀴 = CYCLE_MS(2000)
E3 = 164.81     # 근음
E1 = 41.20      # 북의 기음 (E3의 2옥타브 아래)
TARGET_RMS_DBFS = -26.5
PICKUP_BEATS = 2
PREVIEW_SEC = 1.5
COUNT_IN_SEC = 5   # 2026-08-01 창업자 요청으로 3초 → 5초

RATIOS = {'tempo_2_5_1': 2.5, 'tempo_3_1': 3.0, 'tempo_3_5_1': 3.5}
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'audio')


def env(n, atk, dec):
    """어택-감쇠 포락선. 어택을 아주 짧게 둬야 타격감이 산다."""
    t = np.arange(n) / SR
    a = np.clip(t / max(atk, 1e-5), 0, 1)
    return a * np.exp(-t / dec)


def wood(dur, f=E3):
    """
    나무 타격 — 마림바 계열.
    막대의 실제 공진처럼 홀수 배음이 아니라 3.9·9.2배 근처에 부분음이 선다.
    사인 몇 개만 겹쳐도 "나무" 로 들리는 이유가 이것이다.
    """
    n = int(SR * dur)
    t = np.arange(n) / SR
    sig = (np.sin(2*np.pi*f*t) * env(n, 0.002, dur*0.30)
           + 0.34 * np.sin(2*np.pi*f*3.9*t) * env(n, 0.001, dur*0.10)
           + 0.13 * np.sin(2*np.pi*f*9.2*t) * env(n, 0.001, dur*0.045))
    # 나무를 때리는 순간의 마찰음
    sig += np.random.uniform(-1, 1, n) * np.exp(-t*260) * 0.09
    return sig


def string(dur, f=E3, decay=0.9964):
    """뜯는 현 — Karplus-Strong. 잡음을 링버퍼에 넣고 평균 필터를 돌린다."""
    n = max(2, int(SR / f))
    buf = np.convolve(np.random.uniform(-1, 1, n), [0.5, 0.5], mode='same')
    # ⚠️ DC 성분 제거. Karplus-Strong의 평균 필터는 링버퍼의 평균값을 그대로
    # 유지하므로, 초기 잡음의 평균이 0이 아니면 그 값이 **끝까지 남는 DC 오프셋**이
    # 된다. 스피커에서 툭 하는 잡음이 되고 헤드룸도 낭비한다(FFT 피크가 0Hz로
    # 잡혀서 발견했다).
    buf -= buf.mean()
    out = np.zeros(int(SR * dur))
    i = 0
    for k in range(len(out)):
        cur, nxt = buf[i], buf[(i+1) % n]
        out[k] = cur
        buf[i] = decay * 0.5 * (cur + nxt)
        i = (i+1) % n
    fade = min(len(out), int(SR*0.02))
    out[-fade:] *= np.linspace(1, 0, fade)
    return out


def drum(dur=0.18, f=E1):
    """음정 없는 저역 타격 — 피치가 떨어지는 사인 + 짧은 어택 노이즈."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    freq = f * 2.6 * np.exp(-t*20) + f
    body = np.sin(2*np.pi*np.cumsum(freq)/SR) * np.exp(-t*24)
    sig = body + np.random.uniform(-1, 1, n) * np.exp(-t*200) * 0.2
    fade = min(n, int(SR*0.01))
    sig[-fade:] *= np.linspace(1, 0, fade)
    return sig


# 팩 id → (마커 소리 만드는 함수, 박자 층이 있는가)
VOICES = {
    'wood':   (lambda d: wood(d), False),
    'string': (lambda d: string(d), False),
    'drum':   (lambda d: drum(min(d, 0.30)), False),
    'rhythm': (lambda d: string(d), True),
}


def place(buf, sig, at, gain=1.0):
    """루프 버퍼에 얹는다. 끝을 넘으면 앞으로 감아 붙여 루프가 끊기지 않게 한다."""
    i = int(at * SR)
    L = len(buf)
    for k, v in enumerate(sig * gain):
        buf[(i+k) % L] += v


def build(pack, ratio, total=CYCLE):
    voice, pulse_layer = VOICES[pack]
    buf = np.zeros(int(total * SR))
    back = SWING * (ratio / (ratio + 1))

    # ── 마커 3음 — 같은 음정, 길이와 세기로만 구분 ──────────────
    place(buf, voice(0.50), 0.0,   0.70)   # 백스윙 시작 — 가볍게
    place(buf, voice(0.42), back,  0.80)   # 탑 — 짧게 끊어
    place(buf, voice(0.72), SWING, 1.00)   # 임팩트 — 가장 길고 세게

    if pulse_layer:
        # ── 박자 층 — 백스윙을 3등분 ─────────────────────────
        #    다운스윙 구간은 비운다. 0.27초는 소리를 듣고 반응할 수 있는
        #    시간이 아니고, 비워두면 "지금 내려쳐" 신호가 더 또렷해진다.
        p = back / 3.0
        for k in range(3):
            place(buf, drum(), k * p, 0.48)
        # 다음 스윙을 예고하는 픽업 2박
        for k in range(PICKUP_BEATS, 0, -1):
            at = total - k * p
            if at > SWING + 0.05:
                place(buf, drum(), at, 0.38)
    return buf


def write(path, sig, target=TARGET_RMS_DBFS):
    rms = float(np.sqrt(np.mean(sig**2)))
    if rms > 0:
        sig = sig * (10 ** (target/20) / rms)
    peak = float(np.max(np.abs(sig)))
    if peak > 0.95:
        sig = sig / peak * 0.95
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((sig * 32767).astype('<i2').tobytes())
    print('  wrote', os.path.basename(path))


def build_countin(sec=COUNT_IN_SEC):
    """
    매 샷 직전 카운트인 (2026-08-01: 3초 → 5초).

    5초로 늘린 이유(창업자 요청): 3초로는 클럽을 잡고 정렬까지 하기에 짧다.
    마지막 2박을 강하게 쳐 "이제 시작"이 분명해지게 한다.
    박 간격은 0.5초 — 스윙 템포와 무관한 일정한 준비 박자다.
    """
    buf = np.zeros(int(sec * SR))
    step = 0.5
    n = int(sec / step)
    for k in range(n):
        at = k * step
        left = n - k
        gain = 0.95 if left <= 2 else 0.5      # 마지막 2박을 강하게
        place(buf, drum(0.16), at, gain)
    return buf


def main():
    np.random.seed(7)
    for name, ratio in RATIOS.items():
        for pack in VOICES:
            write(os.path.join(OUT, f'{name}__{pack}.wav'), build(pack, ratio))
    # 미리듣기 — 3:1 사이클의 스윙 구간만 잘라 1.5초 안에 성격이 드러나게
    for pack in VOICES:
        write(os.path.join(OUT, f'preview_{pack}.wav'),
              build(pack, 3.0)[:int(PREVIEW_SEC * SR)])
    write(os.path.join(OUT, f'countin_{COUNT_IN_SEC}s.wav'), build_countin(), target=-24.0)


if __name__ == '__main__':
    main()
