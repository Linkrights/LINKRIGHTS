// 사이트 아래쪽 영역입니다. 문의 이메일과 인스타그램·블로그 주소는 content/site.json 에서 바꿉니다.

import Link from 'next/link';
import { Icon } from './Icon';
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
    <footer className="mt-16 border-t border-[var(--color-line)] bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
              <Icon name="lifebuoy" size={20} />
            </span>
            <span className="text-lg font-extrabold text-brand-800">LINKRIGHTS</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-700">{t.footer.aboutSite}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-500">
            <li>
              {t.footer.contact}:{' '}
              <a className="lr-link break-all" href={`mailto:${site.contactEmail}`}>
                {site.contactEmail}
              </a>
            </li>
            {social.map((item) => (
              <li key={item.key}>
                {item.label}:{' '}
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

        <nav aria-labelledby="footer-links">
          <h2 id="footer-links" className="text-sm font-bold text-ink-900">
            {t.footer.sitemapTitle}
          </h2>
          <ul className="mt-3 space-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-ink-700 hover:text-brand-700 hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-bold text-ink-900">{t.footer.helpTitle}</h2>
          <ul className="mt-3 space-y-2">
            {emergencyOrgs.map((org) => (
              <li key={org.id} className="text-sm text-ink-700">
                <a href={`tel:${org.phone}`} className="whitespace-nowrap font-semibold text-brand-700 hover:underline">
                  {org.phone}
                </a>{' '}
                <span className="text-ink-500">{pick(org.name, locale)}</span>
              </li>
            ))}
          </ul>
          <Link href={`/${locale}/emergency`} className="lr-link mt-3 inline-block text-sm font-semibold">
            {t.emergency.navTitle}
          </Link>
        </div>
      </div>

      <div className="border-t border-[var(--color-line)] bg-surface-soft">
        <div className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-ink-500 sm:px-6">
          <p>{t.footer.notAdvice}</p>
          <p className="mt-2">
            © {new Date().getFullYear()} {pick(site.operator, locale)}
          </p>
        </div>
      </div>
    </footer>
  );
}
