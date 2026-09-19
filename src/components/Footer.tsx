// 사이트 아래쪽 영역입니다. 문의 이메일, 위치, 인스타그램·블로그·유튜브·카카오톡 채널 주소는 content/site.json 에서 바꿉니다.
// (주소가 비어 있는 채널은 보여주지 않습니다)
//
// 순서: 로고·한 줄 소개·SNS → 소개 / 바로가기 / 긴급 연락처 / 문의 → 저작권·안내 → 운영 정보(운영·이메일·위치)

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { getOrganizations, getPartners, getSite } from '@/lib/content';
import { getMessages, pick, type Locale } from '@/lib/i18n';

const linkClass = 'text-[15px] text-ink-700 hover:text-brand-700 hover:underline';

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="h-6 w-6">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.8" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YoutubeGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-6 w-6">
      <path d="M9.5 7.8v8.4l7-4.2z" />
    </svg>
  );
}

function KakaoGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-6 w-6">
      <path d="M12 4.5c-4.97 0-9 3.13-9 7 0 2.47 1.65 4.64 4.14 5.88l-.87 3.2c-.08.3.26.54.52.37l3.83-2.53c.45.05.91.08 1.38.08 4.97 0 9-3.13 9-7s-4.03-7-9-7z" />
    </svg>
  );
}

function FooterColumn({ id, title, className = '', children }: { id: string; title: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <h2 id={id} className="text-[17px] font-bold text-ink-900">
        {title}
      </h2>
      <div className="mt-4 sm:mt-5">{children}</div>
    </div>
  );
}

export function Footer({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const site = getSite();
  const emergencyOrgs = getOrganizations().filter((o) => o.emergency).slice(0, 4);
  const feedbackHref = `mailto:${site.contactEmail}?subject=${encodeURIComponent(t.footerNav.feedbackSubject)}`;
  const operator = pick(site.operator, locale);
  const locations = site.locations ?? [];
  // 운영 주체와 함께 일하는 기관을 있는 그대로 보여줍니다.
  // 관계 표시(예: 협력기관)는 content/partners.json 의 relation 값을 그대로 쓰며, 여기서 새로 만들지 않습니다.
  const partners = getPartners();

  const aboutLinks = [
    { href: `/${locale}/about`, label: t.footerNav.aboutLink },
    { href: `/${locale}/programs`, label: t.nav.programs },
    { href: `/${locale}/get-involved`, label: t.nav.getInvolved },
    { href: `/${locale}/faq`, label: t.nav.faq },
  ];
  const quickLinks = [
    { href: `/${locale}/ask`, label: t.nav.ask },
    { href: `/${locale}/rights`, label: t.nav.rights },
    { href: `/${locale}/organizations`, label: t.nav.organizations },
    { href: `/${locale}/checklists`, label: t.checklist.navLabel },
    { href: `/${locale}/qna`, label: t.qna.navLabel },
    { href: `/${locale}/saved`, label: t.saved.navLabel },
  ];

  const social = [
    {
      key: 'blog',
      label: t.footer.blog,
      link: site.social?.blog,
      tone: 'bg-[#03c75a] text-white',
      icon: <span className="text-[13px] font-extrabold tracking-tight">blog</span>,
    },
    {
      key: 'instagram',
      label: t.footer.instagram,
      link: site.social?.instagram,
      tone: 'bg-[linear-gradient(45deg,#f9a825,#ee2a7b_50%,#6228d7)] text-white',
      icon: <InstagramGlyph />,
    },
    { key: 'youtube', label: t.footerNav.youtube, link: site.social?.youtube, tone: 'bg-[#e62117] text-white', icon: <YoutubeGlyph /> },
    {
      key: 'kakaoChannel',
      label: t.footerNav.kakaoChannel,
      link: site.social?.kakaoChannel,
      tone: 'bg-[#fee500] text-[#191919]',
      icon: <KakaoGlyph />,
    },
  ].filter((item) => item.link?.url);
  const kakao = site.social?.kakaoChannel?.url ? site.social.kakaoChannel : null;

  return (
    <footer className="border-t border-[var(--color-line)] bg-surface-soft">
      <div className="lr-container py-12 sm:py-14">
        {/* 로고 · 한 줄 소개 · SNS */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href={`/${locale}`} className="inline-flex rounded-lg">
              <Logo className="h-10 w-10" />
            </Link>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
              {t.footer.aboutSite}
              <span aria-hidden="true" className="px-1.5 text-ink-300">
                ·
              </span>
              {pick(site.tagline, locale)}
            </p>
          </div>
          {social.length > 0 && (
            <ul aria-label={t.footerNav.socialLabel} className="flex shrink-0 gap-3">
              {social.map((item) => (
                <li key={item.key}>
                  <a
                    href={item.link!.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`${item.label} ${item.link!.label}`}
                    aria-label={`${item.label} ${item.link!.label} (${t.common.openInNew})`}
                    className={`lr-press flex h-12 w-12 items-center justify-center rounded-xl shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${item.tone}`}
                  >
                    {item.icon}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <hr className="my-10 border-[var(--color-line)] sm:my-12" />

        {/* 소개 · 바로가기 · 긴급 연락처 · 문의 */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
          <FooterColumn id="footer-about" title={t.footerNav.aboutTitle}>
            <nav aria-labelledby="footer-about">
              <ul className="space-y-3">
                {aboutLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </FooterColumn>

          <FooterColumn id="footer-links" title={t.footer.sitemapTitle}>
            <nav aria-labelledby="footer-links">
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </FooterColumn>

          <FooterColumn id="footer-emergency" title={t.footer.helpTitle} className="col-span-2 md:col-span-1">
            <ul className="space-y-3">
              {emergencyOrgs.map((org) => (
                <li key={org.id} className="flex flex-wrap items-baseline gap-x-2 text-[15px] text-ink-700">
                  <a href={`tel:${org.phone}`} className="whitespace-nowrap font-bold text-brand-700 hover:underline">
                    {org.phone}
                  </a>
                  <span className="text-ink-500">{pick(org.name, locale)}</span>
                </li>
              ))}
            </ul>
            <Link href={`/${locale}/emergency`} className="lr-link mt-4 inline-block text-[15px] font-semibold">
              {t.emergency.navTitle}
            </Link>
          </FooterColumn>

          <FooterColumn id="footer-contact" title={t.footer.contact} className="col-span-2 md:col-span-1">
            <ul className="space-y-3">
              <li>
                <a href={feedbackHref} className="lr-link text-[15px] font-semibold">
                  {t.footerNav.feedback}
                </a>
              </li>
              <li>
                <a href={`mailto:${site.contactEmail}`} className={`${linkClass} break-words`}>
                  {site.contactEmail}
                </a>
              </li>
              {kakao && (
                <li>
                  <a
                    href={kakao.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t.footerNav.kakaoCta} ${kakao.label} (${t.common.openInNew})`}
                    className={linkClass}
                  >
                    {t.footerNav.kakaoCta}
                  </a>
                </li>
              )}
            </ul>
          </FooterColumn>
        </div>

        <hr className="my-10 border-[var(--color-line)] sm:my-12" />

        {/* 저작권 · 안내 */}
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-10">
          <p className="shrink-0 text-[15px] text-ink-700">
            © {new Date().getFullYear()} {operator}. {t.footerNav.rights}
          </p>
          <p className="text-[13px] leading-relaxed text-ink-500 md:max-w-xl md:text-right">{t.footer.notAdvice}</p>
        </div>
      </div>

      {/* 운영 정보 */}
      <div className="border-t border-[var(--color-line)]">
        <div className="lr-container space-y-1.5 py-8 text-[13px] leading-relaxed text-ink-500">
          <p className="flex flex-col gap-y-1.5 sm:flex-row sm:flex-wrap sm:gap-x-2">
            <span>
              {t.footerNav.operatorLabel}: {operator}
            </span>
            <span aria-hidden="true" className="hidden text-ink-300 sm:inline">
              |
            </span>
            <span>
              {t.footerNav.emailLabel}:{' '}
              <a href={`mailto:${site.contactEmail}`} className="break-all hover:text-brand-700 hover:underline">
                {site.contactEmail}
              </a>
            </span>
          </p>
          {/* 함께 일하는 기관: content/partners.json 에 등록된 기관과 그 관계만 그대로 보여줍니다. */}
          {partners.length > 0 && (
            <p className="flex flex-wrap gap-x-2 gap-y-1">
              {partners.map((partner) => (
                <span key={partner.id}>
                  {pick(partner.relation, locale)}: {pick(partner.name, locale)}
                </span>
              ))}
            </p>
          )}
          {locations.length > 0 && (
            <div className="flex gap-1.5">
              <span className="shrink-0">{t.footerNav.locationLabel}:</span>
              <ul className="space-y-1.5">
                {locations.map((place) => (
                  <li key={place.address.ko}>{pick(place.address, locale)}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="pt-4">
            <Link href={`/${locale}/privacy`} className="font-semibold text-ink-700 hover:text-brand-700 hover:underline">
              {t.footer.privacy}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
