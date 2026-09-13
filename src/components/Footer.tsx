// 사이트 아래쪽 영역입니다. 문의 이메일과 인스타그램·블로그 주소는 content/site.json 에서 바꿉니다.

import Link from 'next/link';
import { Logo } from './Logo';
import { getOrganizations, getSite } from '@/lib/content';
import { getMessages, pick, type Locale } from '@/lib/i18n';

export function Footer({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const site = getSite();
  const emergencyOrgs = getOrganizations().filter((o) => o.emergency).slice(0, 4);

  const links = [
    { href: `/${locale}/ask`, label: t.nav.ask },
    { href: `/${locale}/rights`, label: t.nav.rights },
    { href: `/${locale}/organizations`, label: t.nav.organizations },
    { href: `/${locale}/programs`, label: t.nav.programs },
    { href: `/${locale}/about`, label: t.nav.about },
    { href: `/${locale}/faq`, label: t.nav.faq },
    { href: `/${locale}/privacy`, label: t.footer.privacy },
  ];

  const social = [
    { key: 'instagram', label: t.footer.instagram, link: site.social?.instagram },
    { key: 'blog', label: t.footer.blog, link: site.social?.blog },
  ].filter((item) => item.link?.url);

  return (
    <footer className="border-t border-[var(--color-line)] bg-white">
      <div className="lr-container grid gap-10 py-12 sm:py-14 md:grid-cols-12">
        {/* 로고 · 소개 · 문의 */}
        <div className="md:col-span-5">
          <Link href={`/${locale}`} className="inline-flex" aria-label="LINKRIGHTS">
            <Logo className="h-12 w-12" />
          </Link>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-ink-700">{t.footer.aboutSite}</p>
          <ul className="mt-5 space-y-2 text-[15px] text-ink-700">
            <li>
              <span className="font-semibold text-ink-900">{t.footer.contact}</span>{' '}
              <a className="lr-link break-all" href={`mailto:${site.contactEmail}`}>
                {site.contactEmail}
              </a>
            </li>
            {social.map((item) => (
              <li key={item.key}>
                <span className="font-semibold text-ink-900">{item.label}</span>{' '}
                <a
                  className="lr-link break-all"
                  href={item.link!.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${item.label} ${item.link!.label} (${t.common.openInNew})`}
                >
                  {item.link!.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* 바로가기 */}
        <nav aria-labelledby="footer-links" className="md:col-span-3">
          <h2 id="footer-links" className="text-sm font-bold text-ink-900">
            {t.footer.sitemapTitle}
          </h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 md:grid-cols-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-[15px] text-ink-700 hover:text-brand-700 hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* 긴급 연락처 */}
        <div className="md:col-span-4">
          <h2 className="text-sm font-bold text-ink-900">{t.footer.helpTitle}</h2>
          <ul className="mt-4 space-y-2.5">
            {emergencyOrgs.map((org) => (
              <li key={org.id} className="flex flex-wrap items-baseline gap-x-2 text-[15px] text-ink-700">
                <a href={`tel:${org.phone}`} className="whitespace-nowrap font-bold text-brand-700 hover:underline">
                  {org.phone}
                </a>{' '}
                <span className="text-ink-500">{pick(org.name, locale)}</span>
              </li>
            ))}
          </ul>
          <Link href={`/${locale}/emergency`} className="lr-link mt-4 inline-block text-[15px] font-semibold">
            {t.emergency.navTitle}
          </Link>
        </div>
      </div>

      <div className="border-t border-[var(--color-line)] bg-surface-soft">
        <div className="lr-container flex flex-col gap-2 py-6 text-[13px] leading-relaxed text-ink-500 md:flex-row md:items-center md:justify-between md:gap-8">
          <p>{t.footer.notAdvice}</p>
          <p className="shrink-0">
            © {new Date().getFullYear()} {pick(site.operator, locale)} ·{' '}
            <Link href={`/${locale}/privacy`} className="hover:text-brand-700 hover:underline">
              {t.footer.privacy}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
