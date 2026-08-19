/**
 * 공용 UI 조각 — 8pt 그리드/라운드/타입 토큰을 화면마다 다시 쓰지 않도록 모아둔 곳.
 * 시안 근거: Premium.dc.html (카드 이중 그림자, 재생 버튼 글로우, 아웃라인 아이콘 24px/stroke 1.75)
 */
import { Pressable, Text, View, type PressableProps, type ViewProps } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

/* ───────────────────────── 텍스트 ───────────────────────── */

/**
 * 한글 어절 단위 줄바꿈 (2026-07-31 신설)
 *
 * 기본 동작에서는 한글이 **단어 중간에서 잘린다** — "백스윙과 다운스윙의 비율" 같은
 * 문장이 "백스윙과 다운스윙의 비" / "율" 처럼 끊긴다. 한글은 단어 사이 공백 없이도
 * 문자 단위로 줄바꿈이 가능하다고 판단되기 때문이다.
 *
 * 플랫폼마다 해결 방법이 다르다.
 *   iOS  : lineBreakStrategyIOS="hangul-word" — iOS14+에서 한글 어절 우선 줄바꿈
 *   Android: textBreakStrategy="highQuality" — 형태소 분석 기반으로 어절을 지킨다
 *
 * 모든 본문 텍스트 컴포넌트에 공통 적용해, 화면마다 따로 신경 쓰지 않아도 되게 한다.
 */
export const koreanWrap = {
  lineBreakStrategyIOS: 'hangul-word',
  textBreakStrategy: 'highQuality',
} as const;

/**
 * 시스템 글꼴 확대 대응 (2026-08-06 신설, AOS 리뷰 A-3)
 *
 * ## 왜 "확대를 끄지 않고 상한만 두는가"
 *
 * 이 앱의 페르소나는 5060이다. `allowFontScaling={false}`로 확대를 막으면
 * 접근성 설정을 켠 사용자에게 앱만 작게 남는다 — 페르소나를 정면으로 배신한다.
 * 반대로 RN 기본값(무제한)을 그대로 두면, 폰트 크기가 Tailwind 토큰에 하드코딩돼
 * 있고 컨테이너 높이가 `h-[44px]` 같은 고정값이라 안드로이드 "가장 크게"(2.0배)에서
 * 글자가 컨테이너를 뚫는다.
 *
 * 그래서 **확대는 허용하되 배율에 상한을 둔다.** 상한은 두 단계로 나눈다.
 *   · 본문·설명 = 1.5배까지 — 읽어야 하는 글자라 최대한 키운다
 *   · 숫자·배지 = 1.25배까지 — 링 안 비율("3:1")이나 배지처럼 **자리가 정해진** 글자.
 *     여기가 커지면 레이아웃이 깨져 오히려 못 읽는다
 *
 * ⚠️ 상한을 두는 것으로 "대응 완료"가 되지 않는다. 실기기에서 시스템 글꼴을
 * 최대로 켜고 전 화면을 한 번 훑는 검증이 반드시 필요하다 → T-06.
 */
export const MAX_TEXT_SCALE = 1.5;
export const MAX_NUMERAL_SCALE = 1.25;

/** 본문 계열 텍스트에 공통으로 붙이는 props */
export const textScaling = {
  allowFontScaling: true,
  maxFontSizeMultiplier: MAX_TEXT_SCALE,
} as const;

/** 자리가 정해진 숫자·배지용 */
export const numeralScaling = {
  allowFontScaling: true,
  maxFontSizeMultiplier: MAX_NUMERAL_SCALE,
} as const;

export function H1({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text
      {...koreanWrap}
      {...textScaling}
      accessibilityRole="header"
      className={`font-kr-bold text-h1 text-ink dark:text-inkDark ${className}`}
    >
      {children}
    </Text>
  );
}

export function Body({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text
      {...koreanWrap}
      {...textScaling}
      className={`text-body text-muted dark:text-mutedDark ${className}`}
    >
      {children}
    </Text>
  );
}

/**
 * 설명·힌트 텍스트.
 *
 * ⚠️ 2026-08-06 기본색 변경: `subtle` → `muted` (AOS 리뷰 V-3).
 * Caption은 마킹 단계 안내·프리셋 설명·빈 상태·추천 근거 등 **앱이 사용자에게
 * 무언가를 설명하려는 거의 모든 자리**에 쓰인다. 그런데 `subtle`은 라이트·다크
 * 양쪽 전 조합에서 2.46~3.19:1이라 12px 텍스트 기준(4.5:1)에 한참 못 미쳤다.
 * 즉 **설명할 때마다 가장 안 읽히는 색으로 말하고 있었다.**
 *
 * `subtle`은 이제 구분선·비활성 아이콘 같은 **장식 요소 전용**이다.
 * 텍스트에 `subtle`을 쓰려면 그 텍스트가 안 읽혀도 되는지 먼저 자문할 것.
 */
export function Caption({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text
      {...koreanWrap}
      {...textScaling}
      className={`font-kr-medium text-caption text-muted dark:text-mutedDark ${className}`}
    >
      {children}
    </Text>
  );
}

/**
 * 잠금 배지 (2026-08-06, Premium 게이팅. 2026-08-08 settings.tsx에서 이곳으로 이동)
 *
 * 잠긴 항목을 **목록에서 감추지 않는다.** 무엇이 유료인지 보이지 않으면
 * 결제할 이유도 생기지 않고, 체험 중에 쓰던 게 갑자기 사라지면 "고장 났나"가 된다.
 * 대신 눌러도 적용되지 않는다는 걸 시각·스크린리더 양쪽으로 분명히 한다.
 *
 * 원래 settings.tsx(사운드팩·샷 간격)에만 있던 지역 컴포넌트였는데, T-39로
 * presets.tsx(어프로치·퍼팅)에도 같은 잠금 UI가 필요해져 공용으로 옮겼다.
 */
export function LockBadge() {
  const { t } = useTranslation('common');
  return (
    <View className="px-[6px] py-[2px] rounded-sm bg-surface2 dark:bg-surface2Dark">
      <Text {...textScaling} className="font-kr-bold text-[10px] text-muted dark:text-mutedDark">
        {t('premiumBadge')}
      </Text>
    </View>
  );
}

/**
 * 숫자 전용 — Space Grotesk. "3:1" 같은 값에 쓴다.
 * 숫자·기호에는 한글 줄바꿈 전략이 필요 없으므로 적용하지 않는다.
 */
export function Numeral({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Text
      {...numeralScaling}
      className={`font-display-bold text-ink dark:text-inkDark ${className}`}
    >
      {children}
    </Text>
  );
}

/* ───────────────────────── 카드 ───────────────────────── */

export function Card({ className = '', children, ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={`bg-surface dark:bg-surfaceDark border border-line dark:border-lineDark rounded-card ${className}`}
      {...rest}
    >
      {children}
    </View>
  );
}

/* ───────────────────────── 버튼 ───────────────────────── */

/**
 * 최소 터치 타겟 (2026-08-06, AOS 리뷰 A-4)
 *
 * Android Material·WCAG 2.2 Target Size(Minimum) 모두 44~48dp를 요구한다.
 * 손 떨림이 있는 5060 사용자, 그리고 연습장에서 장갑을 낀 채 조작하는 상황을
 * 생각하면 이건 규격 준수가 아니라 실사용 문제다.
 */
export const MIN_TOUCH = 48;

type ButtonProps = PressableProps & {
  label: string;
  /** primary = 확정/이동 액션. accent = 재생 전용(화면당 1곳). ghost = 보조 */
  variant?: 'primary' | 'accent' | 'ghost';
  className?: string;
  /** 스크린리더가 읽을 이름. 생략하면 label을 그대로 읽는다. */
  a11yLabel?: string;
  /** 버튼을 눌렀을 때 무슨 일이 일어나는지 (TalkBack 힌트) */
  a11yHint?: string;
};

export function Button({
  label,
  variant = 'primary',
  className = '',
  a11yLabel,
  a11yHint,
  ...rest
}: ButtonProps) {
  const base = 'rounded-card items-center justify-center py-s2 active:opacity-80';
  const styles =
    variant === 'primary'
      ? 'bg-primary dark:bg-primary-neon'
      : variant === 'accent'
        ? 'bg-accent dark:bg-accent-neon'
        : 'bg-surface2 dark:bg-surface2Dark border border-line dark:border-lineDark';

  /**
   * 2026-08-06 대비 수정 (AOS 리뷰 V-1).
   * accent(골드) 위에 onPrimary(#F2F5EE)를 얹으면 라이트에서 **1.75:1**이었다.
   * 골드 위 텍스트는 전용 토큰 onAccent를 쓴다 → 라이트 8.61 / 다크 12.45.
   */
  const textStyles =
    variant === 'ghost'
      ? 'text-ink dark:text-inkDark'
      : variant === 'accent'
        ? 'text-onAccent dark:text-onAccentDark'
        : 'text-onPrimary dark:text-onPrimaryDark';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityHint={a11yHint}
      style={{ minHeight: MIN_TOUCH }}
      className={`${base} ${styles} ${className}`}
      {...rest}
    >
      <Text {...textScaling} className={`font-kr-bold text-body ${textStyles}`}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * 아이콘만 있는 버튼 (2026-08-06 신설, AOS 리뷰 A-1)
 *
 * 리뷰에서 나온 문제: 코드베이스의 Pressable 39개 중 접근성 속성이 붙은 건 1개뿐이라
 * TalkBack이 닫기(X)·뒤로(<)·삭제 같은 **아이콘 전용 버튼을 이름 없이** 읽었다.
 * 그중에는 연습 세션을 저장하는 닫기 버튼과 되돌릴 수 없는 삭제 버튼도 있었다.
 *
 * 그래서 아이콘 버튼을 컴포넌트로 만들고 **라벨을 필수 prop으로** 강제한다.
 * 라벨을 빼먹으면 타입 에러가 나므로 같은 실수가 구조적으로 반복되지 않는다.
 * 48dp 최소 터치 영역도 여기서 한 번에 보장한다.
 */
export function IconButton({
  label,
  hint,
  onPress,
  children,
  className = '',
  disabled,
}: {
  /** ⚠️ 필수 — TalkBack이 읽을 이름 */
  label: string;
  hint?: string;
  onPress: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={12}
      style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH }}
      className={`items-center justify-center active:opacity-60 ${className}`}
    >
      {children}
    </Pressable>
  );
}

/* ───────────────────────── 토글 / 세그먼트 ───────────────────────── */

export function Switch({
  value,
  onPress,
  label,
}: {
  value: boolean;
  onPress: () => void;
  /** 스크린리더용 이름. 설정 Row의 라벨을 그대로 넘기면 된다. */
  label?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={12}
      className={`w-[52px] h-[30px] rounded-pill px-[3px] justify-center ${
        value ? 'bg-primary dark:bg-primary-neon' : 'bg-surface2 dark:bg-surface2Dark'
      }`}
    >
      <View
        className={`w-[24px] h-[24px] rounded-pill bg-surface dark:bg-inkDark ${
          value ? 'self-end' : 'self-start'
        }`}
      />
    </Pressable>
  );
}

/**
 * 세그먼트 하나당 폭이 옵션 수로 균등 분할되므로, 로케일이 영어일 때 "English"처럼
 * 긴 단어가 한 줄에 못 들어가 줄바꿈되며 필 모양이 깨지는 문제가 있었다(2026-08-19).
 * numberOfLines + adjustsFontSizeToFit로 줄바꿈 대신 글자를 축소해 한 줄을 지킨다.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  a11yLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  a11yLabel?: string;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={a11yLabel}
      className="flex-row bg-surface2 dark:bg-surface2Dark rounded-sm p-[3px]"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="radio"
            accessibilityLabel={opt.label}
            /* 선택 상태를 checked/selected 양쪽으로 준다 — TalkBack이 둘 중 하나만 읽는 기기가 있다 */
            accessibilityState={{ checked: active, selected: active }}
            style={{ minHeight: 40 }}
            className={`flex-1 py-[9px] rounded-[10px] items-center justify-center ${
              active ? 'bg-surface dark:bg-surfaceDark' : ''
            }`}
          >
            <Text
              {...textScaling}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              className={`text-caption ${
                active
                  ? 'font-kr-bold text-ink dark:text-inkDark'
                  : 'font-kr-medium text-muted dark:text-mutedDark'
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────────────────── 브랜드 (2026-07-31 로고 시스템) ───────────────────────── */

/**
 * Tempo Arc Mark — 브랜드 심볼.
 *
 * 링을 백스윙:다운스윙 = 3:1 각도로 쪼갠 형태. 짧은 호(임팩트 구간)에만 골드를 쓴다.
 * 원본 벡터: 📑_02_Workspace/product_design/brand-system-v2/svg-final/symbol/
 *
 * 좌표는 원본 SVG(240 뷰박스, r=92, gap=10°)에서 그대로 가져왔다 — 임의로 각도를 바꾸면
 * "3:1 비율"이라는 의미가 깨지므로 수정 금지.
 */
export function TempoMark({
  size = 24,
  color,
  accentColor,
}: {
  size?: number;
  color: string;
  accentColor: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" fill="none">
      <Path
        d="M 128.018 28.350 A 92 92 0 1 1 29.398 135.976"
        stroke={color}
        strokeWidth={20}
        strokeLinecap="round"
      />
      <Path
        d="M 28.000 120.000 A 92 92 0 0 1 111.982 28.350"
        stroke={accentColor}
        strokeWidth={20}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * 워드마크 — 소문자 `mytempo` 확정(2026-07-31 창업자 선택).
 *
 * 창업자 전략: 앱 아이콘은 심볼만 단순하게, 앱 내부에서는 워드마크를 적극 노출.
 * Space Grotesk(font-display) + 넓은 자간이 "프리미엄 기기" 톤을 만든다.
 */
export function Wordmark({ size = 15, className = '' }: { size?: number; className?: string }) {
  return (
    <Text
      /*
        로고는 글꼴 확대를 따르지 않는다 (2026-08-06).
        워드마크는 문장이 아니라 **고정 비율의 상표**다. 시스템 확대를 따르면
        심볼과 자간 비율이 깨져 로고가 아니게 된다. 대신 심볼과 묶어 한 덩어리로
        읽히도록 Logo 쪽에 accessibilityLabel을 둔다.
      */
      allowFontScaling={false}
      className={`font-display-bold text-ink dark:text-inkDark ${className}`}
      style={{ fontSize: size, letterSpacing: size * 0.04 }}
    >
      mytempo
    </Text>
  );
}

/** 심볼 + 워드마크 가로 로크업. */
export function Logo({
  size = 20,
  color,
  accentColor,
  className = '',
}: {
  size?: number;
  color: string;
  accentColor: string;
  className?: string;
}) {
  const { t } = useTranslation('common');
  return (
    <View
      /* 심볼과 워드마크를 한 덩어리로 읽는다 — 따로 읽으면 "mytempo"가 두 번 나온다 */
      accessible
      accessibilityRole="image"
      accessibilityLabel={t('appName')}
      className={`flex-row items-center ${className}`}
      style={{ gap: size * 0.4 }}
    >
      <TempoMark size={size} color={color} accentColor={accentColor} />
      <Wordmark size={size * 0.78} />
    </View>
  );
}

/* ───────────────────────── 아이콘 (24px, stroke 1.75, 아웃라인) ───────────────────────── */

type IconProps = { color: string; size?: number };

export function IconHome({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconTarget({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth={1.75} />
      <Circle cx="12" cy="12" r="3.5" stroke={color} strokeWidth={1.75} />
    </Svg>
  );
}

export function IconTrend({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 17l5.5-5.5 3.5 3.5L21 6"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M16 6h5v5"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/*
  2026-08-08: 톱니바퀴 → 슬라이더 3줄로 교체 (사용자 테스트 피드백).
  "조절/설정"을 직관적으로 표현하면서, 앱의 "템포 조절" 컨셉과도 톤이 맞는다.
  컴포넌트명·props는 그대로라 호출부(홈 등)는 수정할 필요가 없다.
*/
export function IconSettings({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 7h10M17 7h4" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Circle cx="14" cy="7" r="2.5" stroke={color} strokeWidth={1.75} fill="none" />
      <Path d="M3 12h4M11 12h10" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Circle cx="8" cy="12" r="2.5" stroke={color} strokeWidth={1.75} fill="none" />
      <Path d="M3 17h9M17 17h4" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
      <Circle cx="13" cy="17" r="2.5" stroke={color} strokeWidth={1.75} fill="none" />
    </Svg>
  );
}

export function IconPlay({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 5.5v13l11-6.5z" fill={color} />
    </Svg>
  );
}

export function IconStop({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill={color} />
    </Svg>
  );
}

export function IconBars({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="13" width="4" height="8" rx="1.6" fill={color} />
      <Rect x="10" y="9" width="4" height="12" rx="1.6" fill={color} />
      <Rect x="17" y="5" width="4" height="16" rx="1.6" fill={color} />
    </Svg>
  );
}

export function IconChevronLeft({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 5l-7 7 7 7"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function IconClose({ color, size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </Svg>
  );
}

export function IconCheck({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4.5 12.5l5 5 10-11"
        stroke={color}
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * 즐겨찾기 별 (2026-08-07, T-06 피드백 — 내 스윙 관리).
 * `filled`이 아니면 윤곽선만 그려 "즐겨찾기 아님"을 표시한다.
 */
export function IconStar({ color, size = 20, filled = false }: IconProps & { filled?: boolean }) {
  const d =
    'M12 3.5l2.47 5.18 5.53.63-4.12 3.88 1.1 5.6L12 15.9l-4.98 2.89 1.1-5.6-4.12-3.88 5.53-.63z';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={d}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
