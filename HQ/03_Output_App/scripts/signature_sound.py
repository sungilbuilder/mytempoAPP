#!/usr/bin/env python3
"""
MYTEMPO Signature Tempo Sound — 후보 탐색 (2026-08-08)

## 배경

기존 원칙(`사운드-아이덴티티.md` §1, 2026-08-01 창업자 확정)은 "START/TOP/IMPACT는
같은 음, 구분은 길이·세기·음색"이었다. 창업자가 2026-08-08 이 원칙을 뒤집기로
결정했다 — 세 지점에 실제로 다른 음정(상승 3화음)을 써서 "이게 MYTEMPO 소리다"라는
브랜드 인지를 더 강하게 만든다. (반복 훈련 중 피치 상승이 "더 빨리 스윙하라"는
오해를 줄 수 있다는 기존 리스크는 감수하기로 함.)

이 파일은 그 새 설계를 위한 **탐색 도구**다. 5개 음정 후보(Pitch Candidate A~E,
4옥타브 중심) × 5개 음색(Timbre A~E)을 조합해 25개 후보를 만들고, 규칙 §15의
100점 평가표에 쓸 객관 지표를 계산한다.

## 재사용 vs 신설

- **재사용**: `audio_tools.py`의 저수준 DSP(대역 잡음, 공진 모드, 잔향, 룸톤,
  LUFS 정규화, HF 비율)는 이미 검증된 도구라 그대로 가져다 쓴다.
- **신설**: 음색 자체는 새로 만든다. `generate-sound-packs.py`의 `piano()`/`wood()`는
  이미 "E3 한 음, 팩별 음색 차이"라는 다른 문제에 맞춰 튜닝돼 있고, 여기서 요구하는
  Crystal/Bell/Pluck 같은 신규 음색은 그 함수들의 파라미터 범위 밖이다. 대신
  섹션 16이 요구한 대로 `SoundProfile` 설정으로 관리하는 범용 가산합성 엔진을 둔다 —
  "더 밝게" "Attack 짧게" 같은 차후 조정이 숫자 하나 바꾸는 일이 되게 하기 위함.

## 산출물

  scripts/_sound_exploration/candidates/{A..E}_{Timbre}.wav   25개 개별 후보
  scripts/_sound_exploration/MYTEMPO_SIGNATURE_SOUND_AUDITION.wav  전체 청취용 1파일
  scripts/_sound_exploration/metrics.json                     후보별 객관 지표

`_sound_exploration/`은 산출물 폴더라 `.gitignore`에 추가한다 — 생성 스크립트만
저장소에 남고, 오디션용 wav는 매번 재생성 가능하므로 커밋 대상이 아니다.
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from audio_tools import (
    SR, band_noise, hf_ratio, modes, normalize_lufs_limited, reverb, room_tone,
    true_peak_db,
)

OUT_DIR = os.path.join(HERE, '_sound_exploration')
CAND_DIR = os.path.join(OUT_DIR, 'candidates')
os.makedirs(CAND_DIR, exist_ok=True)

# ───────────────────────── 1. 음정 후보 (§4) ─────────────────────────
# 4옥타브 중심 — "낮아졌지만 어둡지 않은 소리". 표준 평균율(A4=440Hz) 기준.

NOTE = {
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F#4': 369.99,
    'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'B4': 493.88,
}

PITCH_CANDIDATES = {
    'A': {'name': 'Bright Major', 'notes': ('D4', 'F#4', 'A4')},
    'B': {'name': 'Crystal Major', 'notes': ('E4', 'G#4', 'B4')},
    'C': {'name': 'Clean Major', 'notes': ('C4', 'E4', 'G4')},
    'D': {'name': 'Open Tempo', 'notes': ('D4', 'G4', 'A4')},
    'E': {'name': 'Signature', 'notes': ('E4', 'A4', 'B4')},
}

# ───────────────────────── 2. 마커 공통 타이밍/세기 (§8, §9, §13) ─────────────────────────
# 3:1 비율의 기준 스윙(생성 스크립트의 BASE_SWING=1.1s)과 같은 시간축을 쓴다 —
# 오디션에서 들리는 리듬이 실제 앱 루프와 같아야 "이게 그 소리다"가 성립한다.
BASE_SWING = 1.1
BACK = BASE_SWING * 3.0 / 4.0  # 0.825 — 3:1의 '3' 지점 (TOP)
TAIL = 0.65

MARKERS = {
    #        (buffer_sec, velocity, brightness_mult, at_sec)
    'start':  dict(dur=0.42, vel=0.70, bright=0.85, at=0.0),
    'top':    dict(dur=0.36, vel=0.80, bright=1.00, at=BACK),
    'impact': dict(dur=0.55, vel=0.95, bright=1.15, at=BASE_SWING),
}
TOTAL_SEC = BASE_SWING + TAIL


# ───────────────────────── 3. SoundProfile (§16) ─────────────────────────
# 코드에 파라미터를 흩어놓지 않고 한 딕셔너리로 관리한다. "더 밝게"는
# brightness를, "Attack 짧게"는 attack_ms를 바꾸는 문제가 된다.

def make_profile(*, harmonics, inharmonicity, attack_ms, decay_tau,
                  transient, brightness, name):
    return dict(
        name=name,
        harmonics=harmonics,          # [(배수, 세기, decay_frac, (base, velocity가중))]
        inharmonicity=inharmonicity,  # f_n = f*n*sqrt(1+B*n^2)
        attack_ms=attack_ms,
        decay_tau=decay_tau,          # dur 대비 감쇠 시정수 비율
        transient=transient,          # band_noise + modes 트랜지언트 스펙 (None 가능)
        brightness=brightness,        # 0~1, 배수 높은 배음일수록 더 세게 미는 정도
    )


def env(n, attack_s, decay_tau_s):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack_s, 1e-5), 0, 1)
    return a * np.exp(-t / max(decay_tau_s, 1e-5))


def synth(freq, dur, vel, profile, brightness_mult, rng):
    """SoundProfile 하나로 한 음을 합성한다. 5개 Timbre가 전부 이 함수를 거친다."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    B = profile['inharmonicity']
    bright = min(1.0, profile['brightness'] * brightness_mult)
    sig = np.zeros(n)

    for k, amp, dec_frac, (base, boost) in profile['harmonics']:
        fk = freq * k * np.sqrt(1 + B * k * k)
        fk *= 1.0 + rng.uniform(-0.0025, 0.0025)  # 라운드로빈 미세 디튠
        atk = profile['attack_ms'] / 1000 * (1.0 if k == 1 else 0.6)
        e = env(n, atk, dur * dec_frac * profile['decay_tau'])
        # brightness가 높을수록 고배음(k 큰 것) 비중을 더 민다
        tilt = 1.0 + (bright - 0.5) * 0.5 * (k - 1)
        gain = amp * max(tilt, 0.05) * (base + boost * vel) * (1.0 + rng.uniform(-0.10, 0.10))
        sig += gain * np.sin(2 * np.pi * fk * t) * e

    tr = profile['transient']
    if tr:
        tn = min(n, int(SR * tr.get('window', 0.05)))
        burst = band_noise(tn, tr['lo'] * (1 + rng.uniform(-0.06, 0.06)),
                            tr['hi'] * (1 + rng.uniform(-0.06, 0.06)), rng)
        burst *= np.exp(-np.arange(tn) / SR * tr['decay'])
        burst *= tr['gain'] * (0.55 + 0.45 * vel) * bright
        ring = modes(tn, tr['mode_freqs'], tr['mode_decays'],
                     [g * (0.5 + 0.5 * vel) for g in tr['mode_gains']], rng)
        sig[:tn] += burst + ring

    return sig


# ───────────────────────── 4. Timbre 5종 (§10) ─────────────────────────

def bright_piano():
    return make_profile(
        name='Bright Piano', inharmonicity=0.00035, attack_ms=4, decay_tau=0.85,
        brightness=0.55,
        harmonics=[
            (1, 1.00, 0.42, (0.55, 0.45)), (2, 0.55, 0.34, (0.35, 0.55)),
            (3, 0.32, 0.27, (0.28, 0.60)), (4, 0.18, 0.20, (0.20, 0.65)),
            (5, 0.10, 0.15, (0.15, 0.68)),
        ],
        transient=dict(lo=1200, hi=7000, gain=1.35, decay=42, window=0.05,
                        mode_freqs=[1900, 3400], mode_decays=[0.016, 0.010],
                        mode_gains=[0.30, 0.18]),
    )


def crystal_piano():
    return make_profile(
        name='Crystal Piano', inharmonicity=0.0005, attack_ms=3, decay_tau=0.75,
        brightness=0.75,
        harmonics=[
            (1, 0.95, 0.36, (0.50, 0.50)), (2, 0.58, 0.30, (0.32, 0.60)),
            (3, 0.42, 0.24, (0.24, 0.68)), (4, 0.30, 0.19, (0.16, 0.75)),
            (5, 0.20, 0.15, (0.12, 0.80)), (6, 0.12, 0.11, (0.08, 0.85)),
        ],
        transient=dict(lo=2200, hi=9500, gain=1.55, decay=48, window=0.045,
                        mode_freqs=[3100, 5200, 7400], mode_decays=[0.014, 0.009, 0.006],
                        mode_gains=[0.26, 0.20, 0.12]),
    )


def piano_bell():
    p = bright_piano()
    p['name'] = 'Piano + Bell'
    # 벨 성분은 정수배가 아닌 비조화 부분음 1개를 아주 낮은 세기로만 얹는다.
    # "Bell 자체처럼 들리면 실패" — 그래서 세기(amp)를 0.05 수준으로 제한한다.
    p['harmonics'] = p['harmonics'] + [
        (2.41, 0.05, 0.55, (0.6, 0.4)),
    ]
    p['transient'] = {**p['transient'], 'gain': p['transient']['gain'] * 1.05}
    return p


def soft_mallet():
    return make_profile(
        name='Soft Mallet', inharmonicity=0.0, attack_ms=6, decay_tau=1.0,
        brightness=0.45,
        harmonics=[
            (1.0, 1.00, 0.55, (0.60, 0.40)), (3.9, 0.34, 0.30, (0.30, 0.45)),
            (9.2, 0.11, 0.16, (0.10, 0.55)),
        ],
        transient=dict(lo=1400, hi=6000, gain=1.05, decay=32, window=0.06,
                        mode_freqs=[2100, 3800], mode_decays=[0.022, 0.013],
                        mode_gains=[0.30, 0.18]),
    )


def premium_pluck():
    return make_profile(
        name='Premium Pluck', inharmonicity=0.0001, attack_ms=1.5, decay_tau=0.55,
        brightness=0.65,
        harmonics=[
            (1, 1.00, 0.50, (0.55, 0.45)), (2, 0.40, 0.22, (0.30, 0.50)),
            (3, 0.20, 0.13, (0.18, 0.55)), (4, 0.10, 0.08, (0.10, 0.60)),
            (6.02, 0.05, 0.05, (0.05, 0.70)),  # 아주 옅은 비조화 반짝임
        ],
        transient=dict(lo=3000, hi=10000, gain=0.75, decay=95, window=0.02,
                        mode_freqs=[4200], mode_decays=[0.006], mode_gains=[0.10]),
    )


TIMBRES = {
    'BrightPiano': bright_piano,
    'CrystalPiano': crystal_piano,
    'PianoBell': piano_bell,
    'SoftMallet': soft_mallet,
    'PremiumPluck': premium_pluck,
}


# ───────────────────────── 5. 후보 렌더링 ─────────────────────────

def rng_for(*parts):
    import zlib
    key = '|'.join(str(p) for p in parts).encode()
    return np.random.default_rng(zlib.crc32(key))


def build_candidate(pitch_id, timbre_id):
    notes = PITCH_CANDIDATES[pitch_id]['notes']
    freqs = {'start': NOTE[notes[0]], 'top': NOTE[notes[1]], 'impact': NOTE[notes[2]]}
    profile = TIMBRES[timbre_id]()

    buf = np.zeros(int(TOTAL_SEC * SR))
    tones = {}
    for pos, spec in MARKERS.items():
        rng = rng_for(pitch_id, timbre_id, pos)
        sig = synth(freqs[pos], spec['dur'], spec['vel'], profile, spec['bright'], rng)
        tones[pos] = sig
        i = int(spec['at'] * SR)
        end = min(len(buf), i + len(sig))
        buf[i:end] += sig[: end - i]

    wet = reverb(buf, rt60=0.14, wet=0.11, circular=False, seed=rng_for(pitch_id, timbre_id, 'rv').integers(0, 1 << 30))
    wet = wet + room_tone(len(wet), -80.0, rng_for(pitch_id, timbre_id, 'room'))
    return wet, tones, freqs


# ───────────────────────── 6. 객관 지표 (§15 평가용) ─────────────────────────

def spectral_centroid(x, sr=SR):
    if len(x) < 8 or np.max(np.abs(x)) < 1e-9:
        return 0.0
    s = np.abs(np.fft.rfft(x * np.hanning(len(x))))
    fr = np.fft.rfftfreq(len(x), 1 / sr)
    tot = s.sum()
    return float((s * fr).sum() / tot) if tot > 0 else 0.0


def attack_ms(x, sr=SR):
    env_abs = np.abs(x)
    peak = np.max(env_abs)
    if peak < 1e-9:
        return 0.0
    idx = np.argmax(env_abs >= 0.9 * peak)
    return float(idx / sr * 1000)


def decay_ms_to_minus20(x, sr=SR):
    env_abs = np.abs(x)
    peak_idx = int(np.argmax(env_abs))
    peak = env_abs[peak_idx]
    if peak < 1e-9:
        return 0.0
    thresh = peak * 10 ** (-20 / 20)
    tail = env_abs[peak_idx:]
    below = np.where(tail < thresh)[0]
    idx = below[0] if len(below) else len(tail) - 1
    return float(idx / sr * 1000)


def masking_risk_pct(x, sr=SR, band=(200, 800)):
    """연습장 웅성거림 대역(200~800Hz) 안에 에너지가 얼마나 있는가. 낮을수록 안전."""
    s = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
    fr = np.fft.rfftfreq(len(x), 1 / sr)
    tot = s.sum()
    if tot <= 0:
        return 0.0
    in_band = s[(fr >= band[0]) & (fr <= band[1])].sum()
    return float(in_band / tot * 100)


def fatigue_band_pct(x, sr=SR, band=(2000, 5000)):
    """귀가 가장 예민한 2~5kHz 대역 에너지 비중. 높을수록 반복 청취 피로 위험."""
    s = np.abs(np.fft.rfft(x * np.hanning(len(x)))) ** 2
    fr = np.fft.rfftfreq(len(x), 1 / sr)
    tot = s.sum()
    if tot <= 0:
        return 0.0
    in_band = s[(fr >= band[0]) & (fr <= band[1])].sum()
    return float(in_band / tot * 100)


def compute_metrics(pitch_id, timbre_id, wet, tones, freqs):
    m = {'pitch': pitch_id, 'timbre': timbre_id,
         'notes': PITCH_CANDIDATES[pitch_id]['notes'],
         'timbre_name': TIMBRES[timbre_id]().get('name', timbre_id)}
    per_tone = {}
    for pos, sig in tones.items():
        per_tone[pos] = dict(
            freq_hz=round(freqs[pos], 2),
            attack_ms=round(attack_ms(sig), 2),
            decay_ms=round(decay_ms_to_minus20(sig), 1),
            centroid_hz=round(spectral_centroid(sig), 1),
            hf_ratio_pct=round(hf_ratio(sig), 2),
            peak_db=round(20 * np.log10(max(np.max(np.abs(sig)), 1e-9)), 1),
        )
    m['tones'] = per_tone
    # 인접 톤 간 스펙트럼 중심 이동 — 클수록 구분이 쉽다(Timing Clarity 근거)
    c = [per_tone[p]['centroid_hz'] for p in ('start', 'top', 'impact')]
    m['centroid_shift_start_top'] = round(c[1] - c[0], 1)
    m['centroid_shift_top_impact'] = round(c[2] - c[1], 1)
    m['masking_risk_pct'] = round(masking_risk_pct(wet), 2)
    m['fatigue_band_pct'] = round(fatigue_band_pct(wet), 2)
    m['true_peak_dbtp'] = round(true_peak_db(wet), 1)
    return m


# ───────────────────────── 7. 라벨 음성 (say + afconvert) ─────────────────────────

def say_label(text, out_wav):
    aiff = out_wav.replace('.wav', '_tmp.aiff')
    subprocess.run(['say', '-v', 'Samantha', '-o', aiff, text], check=True,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@44100', aiff, out_wav],
                    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(aiff)
    with wave.open(out_wav) as w:
        d = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64) / 32768
    os.remove(out_wav)
    return d


def note_speech(notes):
    return ', '.join(n.replace('#', ' sharp ') for n in notes)


# ───────────────────────── 8. 메인 ─────────────────────────

def write_wav(path, sig, target_lufs=-16.0):
    sig = normalize_lufs_limited(sig, target_lufs)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((sig * 32767).astype('<i2').tobytes())


def main():
    print(f'출력 폴더: {OUT_DIR}\n')
    all_metrics = []
    audition_parts = []
    gap = np.zeros(int(0.9 * SR))
    say_ok = True

    for pi, pinfo in PITCH_CANDIDATES.items():
        for ti in TIMBRES:
            wet, tones, freqs = build_candidate(pi, ti)
            tag = f'{pi}_{ti}'
            path = os.path.join(CAND_DIR, f'{tag}.wav')
            write_wav(path, wet)
            m = compute_metrics(pi, ti, wet, tones, freqs)
            all_metrics.append(m)
            print(f'  {tag:20s} {pinfo["notes"]}  {m["timbre_name"]:14s} '
                  f'attack(top)={m["tones"]["top"]["attack_ms"]:.1f}ms  '
                  f'HF={hf_ratio(wet):.2f}%  masking={m["masking_risk_pct"]:.1f}%  '
                  f'fatigue={m["fatigue_band_pct"]:.1f}%')

            if say_ok:
                try:
                    label_text = (f'{pi} {list(TIMBRES.keys()).index(ti) + 1}. '
                                  f'{note_speech(pinfo["notes"])}. {m["timbre_name"]}.')
                    label_sig = say_label(label_text, os.path.join(OUT_DIR, f'_label_{tag}.wav'))
                    audition_parts.append(label_sig * 0.9)
                    audition_parts.append(np.zeros(int(0.3 * SR)))
                except Exception as e:
                    print(f'  (라벨 음성 생성 실패, 무음으로 대체: {e})')
                    say_ok = False
            audition_parts.append(wet)
            audition_parts.append(gap)

    audition = np.concatenate(audition_parts)
    audition_path = os.path.join(OUT_DIR, 'MYTEMPO_SIGNATURE_SOUND_AUDITION.wav')
    write_wav(audition_path, audition, target_lufs=-18.0)

    with open(os.path.join(OUT_DIR, 'metrics.json'), 'w') as f:
        json.dump(all_metrics, f, ensure_ascii=False, indent=2)

    print(f'\n25개 후보 → {CAND_DIR}')
    print(f'오디션 파일 → {audition_path}')
    print(f'지표 → {os.path.join(OUT_DIR, "metrics.json")}')


if __name__ == '__main__':
    main()
