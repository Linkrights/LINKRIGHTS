'use client';

// 사이트 위쪽 메뉴입니다. 모바일에서는 햄버거 버튼으로 열립니다.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
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

  const links = [
    { href: `/${locale}/ask`, label: t.nav.ask },
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

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href={`/${locale}`} className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
            <Icon name="lifebuoy" size={20} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-brand-800">LINKRIGHTS</span>
        </Link>

        <nav aria-label="주요 메뉴" className="ml-4 hidden flex-1 items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={`rounded-lg px-3 py-2 text-[15px] font-semibold transition-colors ${
                isActive(link.href)
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-700 hover:bg-brand-50 hover:text-brand-700'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/${locale}/emergency`}
            className="hidden items-center gap-1.5 rounded-lg border border-[var(--color-danger-200)] bg-[var(--color-danger-50)] px-3 py-2 text-sm font-bold text-[var(--color-danger-700)] sm:inline-flex"
          >
            <Icon name="alert" size={16} />
            {t.nav.emergency}
          </Link>

          <label className="relative flex items-center">
            <span className="sr-only">{t.nav.language}</span>
            <Icon name="globe" size={16} className="pointer-events-none absolute left-2.5 text-ink-500" />
            <select
              value={locale}
              onChange={(event) => changeLocale(event.target.value)}
              className="h-10 cursor-pointer appearance-none rounded-lg border border-[var(--color-line)] bg-white py-0 pl-8 pr-7 text-sm font-semibold text-ink-700"
            >
              {LOCALES.map((code) => (
                <option key={code} value={code}>
                  {localeNames[code]}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 text-ink-500" aria-hidden="true">
              ▾
            </span>
          </label>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--color-line)] bg-white text-ink-700 lg:hidden"
          >
            <span className="sr-only">{open ? t.nav.close : t.nav.menu}</span>
            <Icon name={open ? 'close' : 'menu'} size={20} />
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="주요 메뉴" className="border-t border-[var(--color-line)] bg-white lg:hidden">
          <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center justify-between rounded-lg px-2 py-3.5 text-base font-semibold text-ink-900"
                >
                  {link.label}
                  <Icon name="arrow-right" size={18} className="text-ink-300" />
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={`/${locale}/emergency`}
                className="flex items-center gap-2 rounded-lg px-2 py-3.5 text-base font-bold text-[var(--color-danger-700)]"
              >
                <Icon name="alert" size={18} />
                {t.nav.emergency}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
