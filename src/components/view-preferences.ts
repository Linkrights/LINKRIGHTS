// 보기 설정(글자 크기·밝은 화면/어두운 화면)에서 함께 쓰는 값입니다.
//
// 저장 위치: 이용자의 브라우저(localStorage)에만 저장하고 서버로 보내지 않습니다.
// 저장하는 것은 "글자를 얼마나 크게 볼지", "밝은 화면/어두운 화면 중 무엇을 볼지" 두 가지뿐입니다.
// 저장소를 쓸 수 없는 브라우저에서는 그 화면에서만 적용됩니다.

export const THEME_KEY = 'linkrights:theme';
export const FONT_KEY = 'linkrights:font';

/** 화면 밝기: system = 기기 설정을 따름 */
export const THEMES = ['system', 'light', 'dark'] as const;
export type ThemeChoice = (typeof THEMES)[number];

/** 글자 크기 단계 (작게 → 가장 크게). globals.css 의 --lr-font-scale 과 짝을 이룹니다. */
export const FONT_SIZES = ['small', 'base', 'large', 'xlarge'] as const;
export type FontSize = (typeof FONT_SIZES)[number];

export const DEFAULT_THEME: ThemeChoice = 'system';
export const DEFAULT_FONT: FontSize = 'base';

/**
 * 화면이 그려지기 전에 먼저 실행되는 아주 작은 스크립트입니다.
 * 저장해 둔 설정을 <html> 에 바로 적어, 어두운 화면을 고른 사람에게 흰 화면이 잠깐 번쩍이지 않게 합니다.
 * (설정이 없으면 아무것도 적지 않고, 기기 설정을 그대로 따릅니다)
 */
export const PREFERENCES_INIT_SCRIPT = `(function(){try{
var t=localStorage.getItem('${THEME_KEY}');
if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);
var f=localStorage.getItem('${FONT_KEY}');
if(f==='small'||f==='large'||f==='xlarge')document.documentElement.setAttribute('data-font',f);
}catch(e){}})();`;

export function applyTheme(theme: ThemeChoice): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function applyFont(size: FontSize): void {
  const root = document.documentElement;
  if (size === 'base') root.removeAttribute('data-font');
  else root.setAttribute('data-font', size);
}

export function readTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return (THEMES as readonly string[]).includes(value ?? '') ? (value as ThemeChoice) : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function readFont(): FontSize {
  try {
    const value = localStorage.getItem(FONT_KEY);
    return (FONT_SIZES as readonly string[]).includes(value ?? '') ? (value as FontSize) : DEFAULT_FONT;
  } catch {
    return DEFAULT_FONT;
  }
}

export function saveTheme(theme: ThemeChoice): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // 저장소를 쓸 수 없으면 이 화면에서만 적용됩니다.
  }
}

export function saveFont(size: FontSize): void {
  try {
    localStorage.setItem(FONT_KEY, size);
  } catch {
    // 저장소를 쓸 수 없으면 이 화면에서만 적용됩니다.
  }
}

/** 지금 단계에서 한 칸 작게 / 크게 (끝에서는 그대로) */
export function stepFont(current: FontSize, direction: -1 | 1): FontSize {
  const index = FONT_SIZES.indexOf(current);
  const next = Math.min(FONT_SIZES.length - 1, Math.max(0, index + direction));
  return FONT_SIZES[next];
}
