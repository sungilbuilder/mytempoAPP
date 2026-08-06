#!/usr/bin/env python3
"""
"리듬" 사운드 팩 생성 (2026-08-01, 창업자 아이디어)

## 이 팩이 다른 팩과 다른 점 — 소리가 두 층이다

기존 4개 팩(비프/클릭/우드블록/드럼)은 **시작·탑·임팩트 3번만** 울린다.
이 팩은 거기에 **일정한 박자를 깔아주는 드럼 펄스**를 더한다.

왜 필요한가:
  3개의 마커음은 일부러 **불규칙**하다(3:1 비율이니까). 그런데 사람은 불규칙한
  신호를 예측하지 못한다 — 첫 소리가 '갑자기' 오니까 준비할 수가 없다.
  일정한 펄스가 깔려 있으면 다음 박이 언제 올지 몸이 미리 안다.
  이게 창업자 아이디어의 핵심 가치다.

## 배치 설계 (근거는 문서 참고)

  ┌─ 백스윙 ────────────────┬─ 다운스윙 ─┬─ 휴식 ────────────┐
  기타♪   드럼    드럼      기타♪        기타♪   (침묵)  드럼 드럼
  t=0    +P     +2P      탑(3P)       임팩트                  → 다음 시작

  · 드럼 펄스 간격 P = 백스윙 / 3
  · **다운스윙 구간에는 드럼을 넣지 않는다.** 다운스윙은 0.27초로 청각 반응시간보다
    짧아서, 소리를 듣고 반응해 맞출 수 있는 구간이 아니다. 오히려 탑 직후를 비워두면
    "지금 내려쳐" 신호가 가장 또렷해진다.
  · 휴식 구간 끝에 **픽업 2박**을 넣어 다음 스윙 시작을 예고한다(임팩트 직후는 비워
    팔로스루 여유를 준다).

  ★ 3:1에서는 백스윙이 정확히 3P, 다운스윙이 1P라 임팩트가 4번째 박에 딱 떨어진다.
    즉 3:1 템포는 그 자체로 4박자 한 마디다. (2.5:1, 3.5:1은 안 떨어져서 다운스윙
    구간을 비우는 설계가 더 중요해진다)

## 음색

  기타: Karplus-Strong 물리모델(뜯는 현). **세 지점 모두 같은 낮은 음(E3)** 이다.
  드럼: 짧고 건조한 저역 타격. **기타와 주파수·감쇠가 겹치지 않아** 동시에 울려도
        서로를 가리지 않는다(마스킹 회피 — 드럼셋이 음색을 나누는 것과 같은 원리).

## 2026-08-01 창업자 피드백 반영 2건 (실기기 청취)

  ① **"속도가 빠르더라도 기타음이 높아지면 안 되고, 가장 처음의 기타음이 좋다"**
     → 처음엔 시작(E3) → 탑(B3) → 임팩트(E4)로 음정을 올렸었다. 에너지 상승을
       표현하려는 의도였지만, 음정이 올라가면 **"빨라져야 한다"는 인상**을 준다.
       이건 "빠른 게 더 좋은 게 아니다"라는 이 제품의 원칙과 정면으로 어긋난다.
       → **세 음 모두 E3로 통일.** 구분은 음정이 아니라 **길이와 세기**로 한다
         (임팩트가 가장 길고 세다). 어차피 순서는 드럼 펄스가 알려주므로
         음정으로 구분할 이유가 없었다.

  ② **"기타 소리가 다른 음보다 많이 크다"**
     → 측정해보니 사실이었다. 다른 팩 대비 체감 음량이 6~7dB 높았다.
       (RMS: 리듬 -19.6 / 드럼 -23.1 / 비프 -26.2 / 우드 -27.2 dBFS)
       원인은 피크 기준으로만 정규화한 것 — 기타는 길게 울려서 **같은 피크라도
       체감이 훨씬 크다.** 피크가 아니라 **체감 음량(RMS)을 다른 팩에 맞춰**
       정규화하도록 바꿨다. 팩을 바꿀 때마다 볼륨을 다시 만질 필요가 없어진다.

실행: python3 scripts/generate-rhythm-pack.py
"""
import os
import wave

import numpy as np

SR = 44100
SWING = 1.1   # 스윙 전체(백스윙+다운스윙) — 다른 팩과 반드시 동일해야 한다
CYCLE = 2.0   # 루프 한 바퀴 — practice.tsx의 CYCLE_MS(2000)와 반드시 동일
PICKUP_BEATS = 2  # 다음 시작을 예고하는 픽업 박 수

# 기타 음정 — 세 지점 모두 같은 음. 위 "창업자 피드백 ①" 참고.
GUITAR_HZ = 164.81  # E3
# 다른 사운드 팩과 맞출 체감 음량(RMS, dBFS). beep/wood의 중간값을 기준으로 잡았다.
TARGET_RMS_DBFS = -26.5

RATIOS = {
    'tempo_2_5_1': 2.5,
    'tempo_3_1': 3.0,
    'tempo_3_5_1': 3.5,
}

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'audio')


def pluck(freq, dur, decay=0.9965):
    """Karplus-Strong — 잡음을 링버퍼에 넣고 평균 필터를 돌리면 뜯은 현 소리가 난다."""
    n = max(2, int(SR / freq))
    buf = np.random.uniform(-1.0, 1.0, n)
    # 초기 잡음을 살짝 눌러 너무 날카롭지 않게
    buf = np.convolve(buf, [0.5, 0.5], mode='same')
    out = np.zeros(int(SR * dur))
    idx = 0
    for i in range(len(out)):
        cur = buf[idx]
        nxt = buf[(idx + 1) % n]
        out[i] = cur
        buf[idx] = decay * 0.5 * (cur + nxt)
        idx = (idx + 1) % n
    # 끝을 부드럽게 닫아 클릭 잡음 방지
    fade = min(len(out), int(SR * 0.02))
    out[-fade:] *= np.linspace(1, 0, fade)
    return out


def drum(dur=0.16):
    """저역 타격 — 피치가 떨어지는 사인 + 아주 짧은 어택 노이즈."""
    t = np.linspace(0, dur, int(SR * dur), endpoint=False)
    freq = 105 * np.exp(-t * 20) + 52
    body = np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 24)
    attack = np.random.uniform(-1, 1, len(t)) * np.exp(-t * 200) * 0.22
    sig = body + attack
    fade = min(len(sig), int(SR * 0.01))
    sig[-fade:] *= np.linspace(1, 0, fade)
    return sig


def place(buf, sig, at_sec, gain=1.0):
    """루프 버퍼에 소리를 얹는다. 끝을 넘어가면 앞으로 감아 붙인다(루프 연속성)."""
    i = int(at_sec * SR)
    for k, v in enumerate(sig * gain):
        buf[(i + k) % len(buf)] += v


def build_cycle(ratio):
    buf = np.zeros(int(CYCLE * SR))

    backswing = SWING * (ratio / (ratio + 1))
    pulse = backswing / 3.0

    # ── 기타 3음: **전부 같은 음(E3)**, 길이와 세기로만 구분한다 ─────
    #    음정을 올리면 "빨라져야 한다"는 인상을 준다(창업자 피드백 ①).
    #    순서는 어차피 드럼 펄스가 알려주므로 음정으로 구분할 이유가 없다.
    place(buf, pluck(GUITAR_HZ, 0.50), 0.0, 0.70)        # 백스윙 시작 — 가볍게
    place(buf, pluck(GUITAR_HZ, 0.42), backswing, 0.80)  # 탑 — 짧게 끊어
    place(buf, pluck(GUITAR_HZ, 0.72), SWING, 1.00)      # 임팩트 — 가장 길고 세게

    # ── 드럼 펄스: 백스윙을 3등분 ────────────────────────────────
    #    (0번째 박은 기타 시작음과 겹친다 — 다운비트라 겹치는 게 맞다)
    #    0.35 → 0.48로 올렸다. 기타를 줄이면서 펄스가 묻히지 않게 균형을 다시 잡은 것.
    for k in range(3):
        place(buf, drum(), k * pulse, 0.48)

    # ── 다운스윙 구간: 의도적 침묵 ───────────────────────────────
    #    0.27초는 소리를 듣고 반응할 수 있는 시간이 아니다. 비워두는 편이
    #    탑 신호를 더 또렷하게 만든다.

    # ── 픽업: 다음 시작 직전 2박 ─────────────────────────────────
    for k in range(PICKUP_BEATS, 0, -1):
        at = CYCLE - k * pulse
        if at > SWING + 0.05:      # 임팩트 여운과 겹치지 않을 때만
            place(buf, drum(), at, 0.38)

    return buf


def write_wav(path, sig):
    """
    ⚠️ 피크가 아니라 **체감 음량(RMS)** 을 기준으로 맞춘다 (창업자 피드백 ②).

    피크만 맞추면 기타처럼 길게 울리는 소리가 짧은 타격음보다 훨씬 크게 들린다.
    실제로 그래서 리듬 팩만 다른 팩보다 6~7dB 크게 들렸다.
    """
    rms = float(np.sqrt(np.mean(sig ** 2)))
    if rms > 0:
        sig = sig * (10 ** (TARGET_RMS_DBFS / 20) / rms)
    peak = float(np.max(np.abs(sig)))
    if peak > 0.95:                # 안전장치 — 이 설정에선 걸릴 일이 없다
        sig = sig / peak * 0.95
    data = (sig * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    return path


def main():
    np.random.seed(7)  # 재현 가능하게
    for name, ratio in RATIOS.items():
        p = write_wav(os.path.join(OUT, f'{name}__rhythm.wav'), build_cycle(ratio))
        print('wrote', os.path.basename(p))

    # 미리듣기 — 설정에서 탭했을 때 1.5초 안에 성격이 드러나야 한다.
    # 3:1 사이클의 스윙 구간만 잘라 쓴다(휴식까지 들려주면 뜸을 들이게 된다).
    prev = build_cycle(3.0)[: int(1.5 * SR)]
    p = write_wav(os.path.join(OUT, 'preview_rhythm.wav'), prev)
    print('wrote', os.path.basename(p))


if __name__ == '__main__':
    main()
