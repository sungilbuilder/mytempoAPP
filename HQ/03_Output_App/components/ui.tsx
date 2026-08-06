/**
 * 공용 UI 조각 — 8pt 그리드/라운드/타입 토큰을 화면마다 다시 쓰지 않도록 모아둔 곳.
 * 시안 근거: Premium.dc.html (카드 이중 그림자, 재생 버튼 글로우, 아웃라인 아이콘 24px/stroke 1.75)
 */
import { Pressable, Text, View, type PressableProps, type ViewProps } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

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

export function H1({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <Text {...koreanWrap} className={`font-kr-bold text-h1 text-ink dark:text-inkDark ${className}`}>
      {children}
    </Text>
  );
}

export function Body({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <Text {...koreanWrap} className={`text-body text-muted dark:text-mutedDark ${className}`}>
      {children}
    </Text>
  );
}

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
      className={`font-kr-medium text-caption text-subtle dark:text-subtleDark ${className}`}
    >
      {children}
    </Text>
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
  return <Text className={`font-display-bold text-ink dark:text-inkDark ${className}`}>{children}</Text>;
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

type ButtonProps = PressableProps & {
  label: string;
  /** primary = 확정/이동 액션. accent = 재생 전용(화면당 1곳). ghost = 보조 */
  variant?: 'primary' | 'accent' | 'ghost';
  className?: string;
};

export function Button({ label, variant = 'primary', className = '', ...rest }: ButtonProps) {
  const base = 'rounded-card items-center justify-center py-s2 active:opacity-80';
  const styles =
    variant === 'primary'
      ? 'bg-primary dark:bg-primary-neon'
      : variant === 'accent'
        ? 'bg-accent dark:bg-accent-neon'
        : 'bg-surface2 dark:bg-surface2Dark border border-line dark:border-lineDark';

  const textStyles =
    variant === 'ghost'
      ? 'text-ink dark:text-inkDark'
      : 'text-onPrimary dark:text-onPrimaryDark';

  return (
    <Pressable className={`${base} ${styles} ${className}`} {...rest}>
      <Text className={`font-kr-bold text-body ${textStyles}`}>{label}</Text>
    </Pressable>
  );
}

/* ───────────────────────── 토글 / 세그먼트 ───────────────────────── */

export function Switch({ value, onPress }: { value: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
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

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row bg-surface2 dark:bg-surface2Dark rounded-sm p-[3px]">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-1 py-[9px] rounded-[10px] items-center ${
              active ? 'bg-surface dark:bg-surfaceDark' : ''
            }`}
          >
            <Text
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
export function Wordmark({
  size = 15,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Text
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
  return (
    <View className={`flex-row items-center ${className}`} style={{ gap: size * 0.4 }}>
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
      <Path d="M16 6h5v5" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconSettings({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={1.75} />
      <Path
        d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
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
