'use client';

// 보기 설정입니다. 글자 크기(A- A A+)와 밝은 화면/어두운 화면을 고를 수 있습니다.
//
// - 고른 값은 이 브라우저에만 저장되고 서버로 보내지 않습니다. (preferences.ts 참고)
// - 화면 밝기의 기본값은 "기기 설정 따르기"입니다. 밤에 어두운 화면을 쓰는 기기라면 자동으로 어둡게 보입니다.
// - 글자 크기는 <html> 의 기본 크기를 바꾸므로 본문·권리정보·카드 글자가 함께 커집니다. (globals.css 참고)
//
// 모양은 두 가지입니다.
//   variant="menu"   : 위쪽 메뉴에서 버튼을 누르면 열리는 작은 창 (넓은 화면)
//   variant="inline" : 줄로 펼쳐 놓은 형태 (휴대폰 메뉴, 권리정보 본문 위)

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import {
  applyFont,
  applyTheme,
  readFont,
  readTheme,
  saveFont,
  saveTheme,
  stepFont,
  type FontSize,
  type ThemeChoice,
} from './view-preferences';
import { getMessages, type Locale } from '@/lib/i18n';

export function Preferences({
  locale,
  variant = 'menu',
  onDark = false,
  className = '',
}: {
  locale: Locale;
  variant?: 'menu' | 'inline';
  /** 어두운 배경(첫 화면 영상 위) 에 놓일 때 흰 글자로 보여줍니다. */
  onDark?: boolean;
  className?: string;
}) {
  const t = getMessages(locale);
  const a = t.prefs;
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeChoice>('system');
  const [font, setFont] = useState<FontSize>('base');
  const boxRef = useRef<HTMLDivElement>(null);

  // 저장해 둔 설정을 읽어 화면에 반영합니다. (첫 그리기는 서버와 같게 두어 깜빡임이 없습니다)
  useEffect(() => {
    setTheme(readTheme());
    setFont(readFont());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  function chooseTheme(next: ThemeChoice) {
    setTheme(next);
    applyTheme(next);
    saveTheme(next);
  }

  function chooseFont(next: FontSize) {
    setFont(next);
    applyFont(next);
    saveFont(next);
  }

  const themeOptions: { key: ThemeChoice; label: string; icon: 'monitor' | 'sun' | 'moon' }[] = [
    { key: 'system', label: a.themeSystem, icon: 'monitor' },
    { key: 'light', label: a.themeLight, icon: 'sun' },
    { key: 'dark', label: a.themeDark, icon: 'moon' },
  ];

  const fontButton = (direction: -1 | 1, label: string, glyph: string) => {
    const next = stepFont(font, direction);
    const disabled = next === font;
    return (
      <button
        type="button"
        onClick={() => chooseFont(next)}
        disabled={disabled}
        aria-label={label}
        className="lr-press grid h-10 min-w-10 place-items-center rounded-[var(--radius-control)] border border-[var(--color-line)] bg-white font-bold text-ink-900 transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:text-ink-300"
      >
        <span aria-hidden="true">{glyph}</span>
      </button>
    );
  };

  const panel = (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-bold text-ink-900">{a.fontLabel}</p>
        <div className="mt-2 flex items-center gap-2">
          {fontButton(-1, a.fontSmaller, 'A-')}
          <button
            type="button"
            onClick={() => chooseFont('base')}
            aria-label={a.fontReset}
            className="lr-press grid h-10 min-w-10 place-items-center rounded-[var(--radius-control)] border border-[var(--color-line)] bg-white text-[17px] font-bold text-ink-900 transition-colors hover:border-brand-300 hover:bg-brand-50"
          >
            <span aria-hidden="true">A</span>
          </button>
          {fontButton(1, a.fontLarger, 'A+')}
          <span aria-live="polite" className="ml-1 text-sm text-ink-500">
            {a.fontNames[font]}
          </span>
        </div>
      </div>

      <div className="border-t border-[var(--color-line)] pt-4">
        <p className="text-sm font-bold text-ink-900">{a.themeLabel}</p>
        <div role="group" aria-label={a.themeLabel} className="mt-2 flex flex-wrap gap-2">
          {themeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={theme === option.key}
              onClick={() => chooseTheme(option.key)}
              className={`lr-press inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-control)] border px-3 text-sm font-semibold transition-colors ${
                theme === option.key
                  ? 'border-brand-600 bg-brand-50 text-brand-800'
                  : 'border-[var(--color-line)] bg-white text-ink-700 hover:border-brand-300'
              }`}
            >
              <Icon name={option.icon} size={16} /> {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (variant === 'inline') {
    return <div className={className}>{panel}</div>;
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="view-preferences"
        aria-label={a.title}
        className={`lr-press inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] border px-2.5 text-sm font-semibold transition-colors ${
          onDark
            ? 'border-white/30 bg-white/5 text-white hover:border-white/60'
            : 'border-[var(--color-line)] bg-white text-ink-700 hover:border-brand-300'
        }`}
      >
        <Icon name="text-size" size={16} />
        {/* 1024~1279px 화면에서는 아이콘만 보이고(이름은 aria-label 로 읽힘), 더 넓은 화면에서는 이름도 보입니다. */}
        <span className="hidden xl:inline">{a.title}</span>
      </button>

      {open && (
        <div
          id="view-preferences"
          role="region"
          aria-label={a.title}
          className="absolute right-0 top-full z-50 mt-2 w-[min(19rem,calc(100vw-2rem))] rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-4 shadow-lg"
        >
          {panel}
          <p className="mt-3 border-t border-[var(--color-line)] pt-3 text-[13px] leading-relaxed text-ink-500">
            {a.note}
          </p>
        </div>
      )}
    </div>
  );
}
