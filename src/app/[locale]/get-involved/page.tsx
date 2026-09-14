// 함께하기(Get involved) 페이지입니다.
// 대학생 멘토·학교/기관 협력 문의는 메일(content/site.json 의 contactEmail)로 받습니다. 새 신청 양식이나 개인정보 수집 기능은 만들지 않습니다.
// 협력기관은 content/partners.json, 커뮤니티 안내는 content/programs.json 의 community_notice 를 그대로 보여줍니다.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/Icon';
import { PartnerList } from '@/components/PartnerList';
import { PageHeader, Section } from '@/components/Section';
import { getPartners, getPrograms, getSite } from '@/lib/content';
import { getMessages, pick, toLocale } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const t = getMessages(toLocale(rawLocale));
  return { title: t.involved.title, description: t.involved.subtitle };
}

/** 제목이 미리 채워진 문의 메일 주소 */
function contactMailto(email: string, subject: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

export default async function GetInvolvedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const site = getSite();
  const community = getPrograms().community_notice;

  const ways: {
    key: string;
    icon: IconName;
    title: string;
    body: string;
    cta: string;
    href: string;
    secondary: string;
    secondaryHref: string;
  }[] = [
    {
      key: 'mentor',
      icon: 'book',
      title: t.involved.mentorTitle,
      body: t.involved.mentorBody,
      cta: t.involved.mentorCta,
      href: contactMailto(site.contactEmail, t.involved.mentorSubject),
      secondary: t.involved.mentorSecondary,
      secondaryHref: `/${locale}/programs#mentoring`,
    },
    {
      key: 'partner',
      icon: 'briefcase',
      title: t.involved.partnerTitle,
      body: t.involved.partnerBody,
      cta: t.involved.partnerCta,
      href: contactMailto(site.contactEmail, t.involved.partnerSubject),
      secondary: t.nav.programs,
      secondaryHref: `/${locale}/programs`,
    },
  ];

  return (
    <>
      <PageHeader title={t.involved.title} subtitle={t.involved.subtitle} />

      <Section>
        <ul className="grid gap-4 md:grid-cols-2">
          {ways.map((way) => (
            <li key={way.key} id={way.key} className="lr-card flex flex-col p-6 sm:p-7">
              <span className="lr-icon-badge h-11 w-11">
                <Icon name={way.icon} size={22} />
              </span>{' '}
              <h2 className="mt-4 text-xl font-extrabold text-ink-900">{way.title}</h2>{' '}
              <p className="lr-body mt-2 flex-1">{way.body}</p>
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
                <a href={way.href} className="lr-btn lr-btn-primary lr-press">
                  {way.cta} <Icon name="arrow-right" size={18} />
                </a>
                <Link href={way.secondaryHref} className="lr-link text-[15px] font-semibold">
                  {way.secondary}
                </Link>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-6 max-w-3xl rounded-[var(--radius-control)] border border-[var(--color-line)] bg-white p-5">
          <h2 className="text-base font-bold text-ink-900">{t.involved.howToTitle}</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{t.involved.howToBody}</p>
          <p className="mt-2 text-[15px] text-ink-700">
            <span className="font-semibold text-ink-900">{t.involved.emailLabel}</span>{' '}
            <a className="lr-link break-all" href={`mailto:${site.contactEmail}`}>
              {site.contactEmail}
            </a>
          </p>
          <p className="mt-1 text-sm text-ink-500">{t.involved.mailNote}</p>
        </div>
      </Section>

      {getPartners().length > 0 && (
        <Section tone="soft" title={t.involved.partnersTitle} subtitle={t.involved.partnersSubtitle}>
          <PartnerList locale={locale} />
        </Section>
      )}

      {community && (
        <Section title={t.involved.communityTitle}>
          <p className="lr-body max-w-3xl">{pick(community, locale)}</p>
        </Section>
      )}
    </>
  );
}
