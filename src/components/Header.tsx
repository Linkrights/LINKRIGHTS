'use client';

// 사이트 위쪽 메뉴입니다. 넓은 화면에서는 메뉴가 모두 보이고, 좁은 화면에서는 메뉴 버튼으로 열립니다.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { LOCALES, getMessages, localeNames, type Locale } from '@/lib/i18n';

export function Header({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // 페이지를 이동하면 모바일 메뉴를 닫습니다.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const askHref = `/${locale}/ask`;
  const links = [
    { href: `/${locale}/rights`, label: t.nav.rights },
    { href: `/${locale}/organizations`, label: t.nav.organizations },
    { href: `/${locale}/programs`, label: t.nav.programs },
    { href: `/${locale}/about`, label: t.nav.about },
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

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-white/95 backdrop-blur">
      <div className="lr-container flex h-16 items-center gap-3 sm:h-[72px]">
        <Link href={`/${locale}`} className="shrink-0 rounded-[var(--radius-control)]">
          <Logo className="h-11 w-11 sm:h-12 sm:w-12" />
        </Link>

        <nav aria-label="주요 메뉴" className="ml-4 hidden flex-1 items-center gap-0.5 lg:flex xl:ml-8 xl:gap-1">
          {links.map((link) => (
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
          <Link
            href={`/${locale}/emergency`}
            className="lr-press inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-control)] px-2.5 text-sm font-bold text-[var(--color-danger-700)] hover:bg-[var(--color-danger-50)]"
          >
            <Icon name="alert" size={16} />
            <span className="sr-only xl:not-sr-only">{t.nav.emergency}</span>
          </Link>

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

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="ml-auto grid h-11 w-11 place-items-center rounded-[var(--radius-control)] border border-[var(--color-line)] bg-white text-ink-700 transition-colors hover:bg-surface-soft lg:hidden"
        >
          <span className="sr-only">{open ? t.nav.close : t.nav.menu}</span>
          <Icon name={open ? 'close' : 'menu'} size={22} />
        </button>
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
                  href={`/${locale}/emergency`}
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
