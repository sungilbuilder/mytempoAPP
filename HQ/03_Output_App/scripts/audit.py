#!/usr/bin/env python3
"""
자동 검증 (2026-08-06 신설, AOS 리뷰 후속)

실행: python3 scripts/audit.py

## 왜 만들었나

[[AOS-통합리뷰-2026-08-06]]의 한 문장 결론은 이거였다:

    "판단은 좋았고 구현도 좋았는데, **만든 것을 실제로 확인하는 루프가 빠져 있었다.**"

P0 8건 중 절반이 "한 번 계산해봤으면 / 한 번 눌러봤으면" 나왔을 것들이었다.
색을 정하고 대비를 계산해본 적이 없고, 클래스명을 쓰고 렌더링을 확인한 적이 없다.

그래서 **고치는 것과 함께 그 루프를 심는다.** 사람이 기억해서 하는 검사는
언젠가 빠지지만, 스크립트는 빠지지 않는다.

## 무엇을 보는가

  1. WCAG 대비 — tailwind.config.js의 토큰을 직접 읽어 전 조합을 계산한다
     (하드코딩한 색 표를 두면 토큰이 바뀔 때 검사가 거짓말을 한다)
  2. NativeWind 클래스 오타 — `dark:bg-primaryNeon` 같은 카멜케이스 실수.
     TypeScript가 못 잡고 NativeWind는 조용히 무시하므로 **화면에서만 드러난다**
  3. 접근성 — 접근성 속성 없는 Pressable
  4. 오디오 — 루프 경계 불연속, LUFS 편차, 트루피크

⚠️ 이 스크립트가 통과해도 "검증 완료"가 아니다. 실기기 확인(T-06)을 대체하지
않는다. 여기서 잡는 건 **자동으로 잡을 수 있는 것만**이다.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.abspath(os.path.join(HERE, '..'))

fails: list[str] = []
warns: list[str] = []


def strip_comments(src: str) -> str:
    """
    주석을 공백으로 치환한다(줄 번호는 보존).

    ⚠️ 필요한 이유: 이 저장소는 주석에 **문제 상황을 그대로 인용하는** 문화가 있다
    ("`dark:bg-primaryNeon` → `dark:bg-primary-neon`으로 고쳤다"처럼).
    주석을 안 걷어내면 검사기가 자기가 고친 자국을 다시 결함으로 신고한다.
    """
    out = list(src)
    i, n = 0, len(src)
    while i < n:
        if src.startswith('//', i):
            j = src.find('\n', i)
            j = n if j == -1 else j
            for k in range(i, j):
                out[k] = ' '
            i = j
        elif src.startswith('/*', i):
            j = src.find('*/', i + 2)
            j = n if j == -1 else j + 2
            for k in range(i, j):
                if out[k] != '\n':
                    out[k] = ' '
            i = j
        else:
            i += 1
    return ''.join(out)


def jsx_open_tags(src: str, tag: str):
    """
    `<Tag ...>` 여는 태그의 속성 문자열을 (시작offset, 속성) 으로 돌려준다.

    ⚠️ 정규식 `<Pressable(.*?)>`을 쓰면 안 된다. 속성 안의 화살표 함수
    `onPress={() => ...}`의 `>`에서 잘려 나가 **속성 대부분을 못 본다.**
    (처음에 그렇게 짰다가 라벨이 멀쩡히 있는 Pressable 23개를 오탐했다)
    중괄호·따옴표 깊이를 세면서 진짜 태그 끝을 찾는다.
    """
    for m in re.finditer(rf'<{tag}\b', src):
        i = m.end()
        depth = 0
        quote = None
        while i < len(src):
            ch = src[i]
            if quote:
                if ch == quote and src[i - 1] != '\\':
                    quote = None
            elif ch in '"\'`':
                quote = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
            elif ch == '>' and depth == 0:
                break
            i += 1
        yield m.start(), src[m.end():i]


def head(t):
    print(f'\n{"─" * 62}\n{t}\n{"─" * 62}')


# ═══════════════════════ 1. 대비 ═══════════════════════

def srgb(v):
    v = v / 255
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def lum(hexstr):
    h = hexstr.lstrip('#')
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)


def ratio(a, b):
    l1, l2 = lum(a), lum(b)
    if l1 < l2:
        l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)


def read_tokens():
    """
    tailwind.config.js에서 색 토큰을 그대로 읽는다 — **사본을 만들지 않는다.**

    검사용 색 표를 따로 두면 토큰이 바뀔 때 검사가 조용히 거짓말을 하게 된다.
    (그게 정확히 이 프로젝트에서 대비 문제가 오래 남아 있던 방식이다)

    중첩 토큰은 `primary.neon` → `primary_neon` 형태로 평평하게 만든다.
    """
    src = open(os.path.join(APP, 'tailwind.config.js'), encoding='utf-8').read()
    out = {}

    # 중첩 블록 먼저 (primary / accent)
    for name in ('primary', 'accent'):
        m = re.search(rf'\b{name}:\s*\{{(.*?)\}}', src, re.S)
        if not m:
            continue
        for k, v in re.findall(r"(\w+):\s*'(#[0-9A-Fa-f]{6})'", m.group(1)):
            out[f'{name}_{k}'] = v
        src = src[: m.start()] + src[m.end():]   # 평평한 스캔에서 제외

    for k, v in re.findall(r"(\w+):\s*'(#[0-9A-Fa-f]{6})'", src):
        out.setdefault(k, v)
    return out


def check_contrast():
    head('1. WCAG 대비 (AA: 본문 4.5 · 큰 글씨 3.0)')
    t = read_tokens()

    # (설명, 전경, 배경, 최소 기준)
    combos = [
        ('라이트 · 본문 ink on bg',        t['ink'], t['bg'], 4.5),
        ('라이트 · 본문 ink on surface',   t['ink'], t['surface'], 4.5),
        ('라이트 · 설명 muted on bg',      t['muted'], t['bg'], 4.5),
        ('라이트 · 설명 muted on surface', t['muted'], t['surface'], 4.5),
        ('라이트 · 설명 muted on surface2', t['muted'], t['surface2'], 4.5),
        ('라이트 · 주CTA onAccent on accent', t['onAccent'], t['accent_DEFAULT'], 4.5),
        ('라이트 · 버튼 onPrimary on primary', t['onPrimary'], t['primary_DEFAULT'], 4.5),
        ('다크 · 본문 inkDark on bgDark',      t['inkDark'], t['bgDark'], 4.5),
        ('다크 · 본문 inkDark on surfaceDark', t['inkDark'], t['surfaceDark'], 4.5),
        ('다크 · 설명 mutedDark on bgDark',    t['mutedDark'], t['bgDark'], 4.5),
        ('다크 · 설명 mutedDark on surfaceDark', t['mutedDark'], t['surfaceDark'], 4.5),
        ('다크 · 설명 mutedDark on surface2Dark', t['mutedDark'], t['surface2Dark'], 4.5),
        ('다크 · 주CTA onAccentDark on accent-neon', t['onAccentDark'], t['accent_neon'], 4.5),
        ('다크 · 버튼 onPrimaryDark on primary-neon', t['onPrimaryDark'], t['primary_neon'], 4.5),
    ]
    for name, fg, bg, need in combos:
        r = ratio(fg, bg)
        ok = r >= need
        print(f'  {"OK " if ok else "FAIL"} {name:44s} {r:5.2f}:1  (기준 {need})')
        if not ok:
            fails.append(f'대비 미달: {name} = {r:.2f}:1')


# ═══════════════════════ 2. 클래스 오타 ═══════════════════════

def check_classnames():
    """
    NativeWind 클래스 안의 카멜케이스 토큰 참조를 잡는다.

    ⚠️ 이게 AOS 리뷰 V-2의 정체다. 토큰이 `primary.neon`이므로 클래스는
    `bg-primary-neon`이어야 하는데 한 곳만 `bg-primaryNeon`이었다.
    NativeWind는 모르는 클래스를 조용히 버려서 **다크 모드에서 선택 상태가
    사라졌다**(2.74:1). `tsc --noEmit`은 통과한다. 사람 눈으로만 잡히던 종류다.

    `bgDark`·`mutedDark` 같은 **평평한 토큰명은 정상**이므로 제외한다.
    문제는 중첩 토큰(primary/accent)의 하위 키를 카멜케이스로 붙인 경우다.
    """
    head('2. NativeWind 클래스 오타 (중첩 토큰 카멜케이스)')
    bad = re.compile(r'\b(?:bg|text|border|from|to)-(?:primary|accent)[A-Z]\w*')
    hits = []
    for root, dirs, files in os.walk(APP):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.expo', 'android', 'ios', '.git')]
        for f in files:
            if not f.endswith(('.tsx', '.ts')):
                continue
            p = os.path.join(root, f)
            src = strip_comments(open(p, encoding='utf-8').read())
            for m in bad.finditer(src):
                line = src[:m.start()].count('\n') + 1
                hits.append(f'{os.path.relpath(p, APP)}:{line}  {m.group(0)}')
    if hits:
        for h in hits:
            print(f'  FAIL {h}')
        fails.extend(f'클래스 오타: {h}' for h in hits)
    else:
        print('  OK   중첩 토큰을 카멜케이스로 쓴 곳 없음')


# ═══════════════════════ 3. 접근성 ═══════════════════════

def check_a11y():
    """
    접근성 속성이 없는 Pressable을 센다.

    AOS 리뷰 A-1: Pressable 39개 중 접근성 속성이 붙은 건 1개였다.
    `IconButton`/`Button`/`Switch`/`Segmented`는 컴포넌트가 라벨을 강제하므로
    개별 카운트에서 빠진다 — 여기서 세는 건 **화면에서 직접 쓴 Pressable**이다.
    """
    head('3. 접근성 — 라벨 없는 Pressable')
    total = missing = 0
    for root, dirs, files in os.walk(os.path.join(APP, 'app')):
        dirs[:] = [d for d in dirs if d not in ('node_modules',)]
        for f in files:
            if not f.endswith('.tsx'):
                continue
            p = os.path.join(root, f)
            src = strip_comments(open(p, encoding='utf-8').read())
            for start, attrs in jsx_open_tags(src, 'Pressable'):
                total += 1
                if 'accessibilityLabel' not in attrs and 'accessibilityRole' not in attrs:
                    missing += 1
                    line = src[:start].count('\n') + 1
                    print(f'  WARN {os.path.relpath(p, APP)}:{line}')
    print(f'  Pressable {total}개 중 라벨 없음 {missing}개')
    if missing:
        warns.append(f'접근성 라벨 없는 Pressable {missing}개')
    else:
        print('  OK   전부 라벨 있음')


# ═══════════════════════ 4. 오디오 ═══════════════════════

def check_audio():
    head('4. 오디오 — 루프 경계 · 라우드니스 · 트루피크')
    try:
        sys.path.insert(0, HERE)
        import numpy as np
        from audio_tools import lufs, loop_report, true_peak_db
    except ImportError as e:
        print(f'  SKIP numpy 없음 ({e})')
        return

    audio = os.path.join(APP, 'assets', 'audio')
    loop_lufs = []
    for f in sorted(os.listdir(audio)):
        with wave.open(os.path.join(audio, f)) as w:
            d = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64) / 32768
        L, tp = lufs(d), true_peak_db(d)

        if tp > -1.0:
            print(f'  FAIL {f:26s} 트루피크 {tp:.1f} dBTP (> -1.0)')
            fails.append(f'트루피크 초과: {f} {tp:.1f} dBTP')

        if f.startswith('tempo_'):
            loop_lufs.append(L)
            step = abs(loop_report(d)['step'])
            # 0.001 = 약 -60 dBFS. 이 아래면 들리지 않는다.
            if step > 0.001:
                print(f'  FAIL {f:26s} 루프 경계 계단 {step:.4f} — 매 바퀴 클릭')
                fails.append(f'루프 불연속: {f} step={step:.4f}')
            else:
                print(f'  OK   {f:26s} {L:6.1f} LUFS  {tp:6.1f} dBTP  이음매 매끈')
        else:
            print(f'  OK   {f:26s} {L:6.1f} LUFS  {tp:6.1f} dBTP')

    if loop_lufs:
        spread = max(loop_lufs) - min(loop_lufs)
        # 1 dB 이상 벌어지면 팩을 바꿀 때 "소리가 작아졌다"고 느낀다.
        status = 'OK  ' if spread <= 1.0 else 'FAIL'
        print(f'  {status} 루프 팩 간 라우드니스 편차 {spread:.2f} dB (기준 1.0)')
        if spread > 1.0:
            fails.append(f'팩 간 라우드니스 편차 {spread:.2f} dB')


# ═══════════════════════ 5. 타입 ═══════════════════════

def check_types():
    head('5. TypeScript')
    r = subprocess.run(['npx', 'tsc', '--noEmit'], cwd=APP, capture_output=True, text=True)
    out = (r.stdout + r.stderr).strip()
    lines = [l for l in out.splitlines() if 'npm notice' not in l and l.strip()]
    if r.returncode == 0 and not lines:
        print('  OK   에러 없음')
    else:
        for l in lines[:20]:
            print(f'  FAIL {l}')
        fails.append('TypeScript 에러')


# ═══════════════════════ 6. 스토어 제출 필수값 ═══════════════════════

def check_app_json():
    head('6. app.json — Play Store 필수값 · 권한')
    cfg = json.load(open(os.path.join(APP, 'app.json'), encoding='utf-8'))['expo']
    a = cfg.get('android', {})

    if a.get('versionCode'):
        print(f'  OK   android.versionCode = {a["versionCode"]}')
    else:
        print('  FAIL android.versionCode 없음 — 첫 업로드에서 막힌다')
        fails.append('android.versionCode 없음')

    blocked = set(a.get('blockedPermissions', []))
    for perm in ('android.permission.SYSTEM_ALERT_WINDOW',
                 'android.permission.WRITE_EXTERNAL_STORAGE'):
        if perm in blocked:
            print(f'  OK   차단됨 {perm.split(".")[-1]}')
        else:
            print(f'  FAIL {perm} 미차단 — 심사 지연·거절 사유')
            fails.append(f'{perm} 미차단')

    if a.get('predictiveBackGestureEnabled'):
        print('  OK   predictiveBackGestureEnabled = true (Android 13+ 예측형 뒤로가기)')
    else:
        print('  WARN predictiveBackGestureEnabled 미설정')
        warns.append('predictiveBackGestureEnabled 미설정')

    if 'UIBackgroundModes' in json.dumps(cfg.get('ios', {})):
        print('  WARN iOS UIBackgroundModes가 남아 있다 — 실제로는 백그라운드에서 정지한다')
        warns.append('iOS UIBackgroundModes 잔존')
    else:
        print('  OK   iOS UIBackgroundModes 없음 (동작과 설정이 일치)')


def main():
    check_contrast()
    check_classnames()
    check_a11y()
    check_audio()
    check_app_json()
    check_types()

    head('결과')
    if fails:
        print(f'  실패 {len(fails)}건')
        for f in fails:
            print(f'    · {f}')
    else:
        print('  실패 0건')
    if warns:
        print(f'  경고 {len(warns)}건')
        for w in warns:
            print(f'    · {w}')
    print('\n  ⚠️ 이 검사는 실기기 확인(T-06)을 대체하지 않는다.')
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
