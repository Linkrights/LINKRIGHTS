'use client';

// 사이트 위쪽 메뉴입니다. 넓은 화면에서는 메뉴가 모두 보이고, 좁은 화면에서는 메뉴 버튼으로 열립니다.
// 모든 페이지에서 "긴급 112·119" 버튼으로 경찰·구급 번호에 바로 전화할 수 있습니다. (휴대폰에서는 메뉴 버튼 옆)

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { LOCALES, getMessages, localeNames, type Locale } from '@/lib/i18n';

/** 등록된 긴급 기관의 이름과 번호 (layout.tsx 가 content/organizations.json 에서 넘겨줍니다) */
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

export function Header({ locale, emergencyContacts = [] }: { locale: Locale; emergencyContacts?: EmergencyContact[] }) {
  const t = getMessages(locale);
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // 페이지를 이동하면 모바일 메뉴와 긴급 연락처 창을 닫습니다.
  useEffect(() => {
    setOpen(false);
    setSosOpen(false);
  }, [pathname]);

  // 긴급 연락처 창: Esc 키나 메뉴 바깥을 누르면 닫습니다.
  useEffect(() => {
    if (!sosOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSosOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) setSosOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [sosOpen]);

  const askHref = `/${locale}/ask`;
  const emergencyHref = `/${locale}/emergency`;
  const links = [
    { href: `/${locale}/rights`, label: t.nav.rights },
    { href: `/${locale}/organizations`, label: t.nav.organizations },
    { href: `/${locale}/programs`, label: t.nav.programs },
    { href: `/${locale}/about`, label: t.nav.about },
    // 넓은 메뉴는 글자가 긴 언어(베트남어 등)에서 공간이 부족해 휴대폰 메뉴에만 넣습니다. (넓은 화면에서는 아래쪽 정보·홈 "나는 누구인가요?"·소개 페이지에서 연결)
    { href: `/${locale}/get-involved`, label: t.nav.getInvolved, mobileOnly: true },
  ];

  function changeLocale(next: string) {
    const segments = pathname.split('/');
    segments[1] = next;
    router.push(segments.join('/') || `/${next}`);
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const languageSelect = (id: string) => (
    <span className="relative flex w-full items-center">
      <Icon name="globe" size={16} className="pointer-events-none absolute left-3 text-ink-500" />
      <select
        id={id}
        value={locale}
        onChange={(event) => changeLocale(event.target.value)}
        className="h-10 w-full cursor-pointer appearance-none rounded-[var(--radius-control)] border border-[var(--color-line)] bg-white py-0 pl-9 pr-8 text-sm font-semibold text-ink-700 transition-colors hover:border-brand-300"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {localeNames[code]}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 text-xs text-ink-500" aria-hidden="true">
        ▾
      </span>
    </span>
  );

  // 긴급 버튼 (넓은 화면과 휴대폰에서 모양만 다르고 같은 창을 엽니다)
  // 넓은 메뉴(1024~1279px)는 글자가 긴 언어에서 공간이 부족해 아이콘만 보이고, 1280px 이상에서 "112·119"를 함께 보여줍니다.
  // 휴대폰에서는 메뉴 버튼 옆에 항상 "112·119"가 보입니다. 화면낭독기는 어느 화면에서나 "긴급 112·119"로 읽습니다.
  const sosButton = (className: string, variant: 'desktop' | 'mobile') => (
    <button
      type="button"
      onClick={() => {
        setSosOpen((value) => !value);
        setOpen(false);
      }}
      aria-expanded={sosOpen}
      aria-controls="emergency-quick"
      aria-label={t.nav.emergencyQuick}
      className={`lr-press inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] font-bold text-[var(--color-danger-700)] hover:bg-[var(--color-danger-50)] ${
        sosOpen ? 'bg-[var(--color-danger-50)]' : ''
      } ${className}`}
    >
      <Icon name="alert" size={16} />
      <span className={variant === 'mobile' ? '' : 'hidden xl:inline'}>112·119</span>
    </button>
  );

  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-white/95 backdrop-blur">
      <div className="lr-container relative flex h-16 items-center gap-3 sm:h-[72px]">
        <Link href={`/${locale}`} className="shrink-0 rounded-[var(--radius-control)]">
          <Logo className="h-11 w-11 sm:h-12 sm:w-12" />
        </Link>

        <nav aria-label="주요 메뉴" className="ml-4 hidden flex-1 items-center gap-0.5 lg:flex xl:ml-8 xl:gap-1">
          {links.filter((link) => !('mobileOnly' in link)).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={`whitespace-nowrap rounded-[var(--radius-control)] px-2.5 py-2 text-sm font-semibold transition-colors xl:px-3 xl:text-[15px] ${
                isActive(link.href) ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-surface-soft hover:text-brand-700'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {sosButton('h-10 px-2.5 text-sm', 'desktop')}

          <div className="w-36">
            <label htmlFor="header-language" className="sr-only">
              {t.nav.language}
            </label>
            {languageSelect('header-language')}
          </div>

          <Link
            href={askHref}
            aria-current={isActive(askHref) ? 'page' : undefined}
            className="lr-btn lr-btn-primary lr-btn-sm lr-press whitespace-nowrap"
          >
            {t.nav.askShort}
          </Link>
        </div>

        {/* 휴대폰: 메뉴를 열지 않아도 긴급 번호에 바로 닿도록 메뉴 버튼 옆에 둡니다. */}
        {sosButton('ml-auto h-11 border border-[var(--color-line)] bg-white px-3 text-sm lg:hidden', 'mobile')}

        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            setSosOpen(false);
          }}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="grid h-11 w-11 place-items-center rounded-[var(--radius-control)] border border-[var(--color-line)] bg-white text-ink-700 transition-colors hover:bg-surface-soft lg:hidden"
        >
          <span className="sr-only">{open ? t.nav.close : t.nav.menu}</span>
          <Icon name={open ? 'close' : 'menu'} size={22} />
        </button>

        {/* 긴급 연락처 창: 등록된 경찰·구급 번호와 긴급 도움 페이지 링크 */}
        {sosOpen && (
          <div
            id="emergency-quick"
            role="region"
            aria-label={t.nav.emergencyQuick}
            className="absolute right-4 top-full z-50 mt-2 w-[min(21rem,calc(100vw-2rem))] rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-4 shadow-lg sm:right-6"
          >
            <p className="text-[15px] font-bold leading-snug text-ink-900">{t.nav.emergencyQuickTitle}</p>
            <ul className="mt-3 space-y-2">
              {emergencyContacts.map((contact) => (
                <li key={contact.id}>
                  <a
                    href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] bg-[var(--color-danger-50)] px-3.5 py-3 font-bold text-[var(--color-danger-700)] hover:underline"
                  >
                    <span className="text-base">{contact.name}</span>
                    <span className="shrink-0 text-sm">{t.nav.emergencyCall}</span>
                  </a>
                </li>
              ))}
            </ul>
            <Link href={emergencyHref} className="lr-link mt-3 inline-flex items-center gap-1 text-sm font-semibold">
              {t.nav.emergencyMore} <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        )}
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="주요 메뉴" className="border-t border-[var(--color-line)] bg-white lg:hidden">
          <div className="lr-container space-y-4 py-4">
            <Link href={askHref} className="lr-btn lr-btn-primary lr-press w-full">
              {t.nav.askShort}
              <Icon name="arrow-right" size={18} />
            </Link>

            <ul className="divide-y divide-[var(--color-line)]">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    className={`flex items-center justify-between px-1 py-3.5 text-base font-semibold ${
                      isActive(link.href) ? 'text-brand-700' : 'text-ink-900'
                    }`}
                  >
                    {link.label}
                    <Icon name="arrow-right" size={18} className="text-ink-300" />
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={emergencyHref}
                  className="flex items-center gap-2 px-1 py-3.5 text-base font-bold text-[var(--color-danger-700)]"
                >
                  <Icon name="alert" size={18} />
                  {t.nav.emergency}
                </Link>
              </li>
            </ul>

            <div className="space-y-2 border-t border-[var(--color-line)] pt-4">
              <label htmlFor="mobile-language" className="block text-sm font-semibold text-ink-700">
                {t.nav.language}
              </label>
              {languageSelect('mobile-language')}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
