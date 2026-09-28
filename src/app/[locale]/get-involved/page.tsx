// 함께하기(Get involved) 페이지입니다.
// 멘티(이주배경청소년)·대학생 멘토·학교/기관 협력 문의는 모두 메일(content/site.json 의 contactEmail)로 받습니다.
// 새 신청 양식이나 개인정보 수집 기능은 만들지 않습니다.
// 협력기관은 content/partners.json, 커뮤니티 안내는 content/programs.json 의 community_notice 를 그대로 보여줍니다.

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon, type IconName } from '@/components/Icon';
import { PartnerList } from '@/components/PartnerList';
import { PageHeader, Section } from '@/components/Section';
import { SubmitBox, canSubmit } from '@/components/SubmitBox';
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
  // 글 보내기 칸을 쓸 수 있는지 (데이터베이스가 연결되어 있는지)
  const forms = canSubmit();

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
    // 멘토와 학교·기관뿐 아니라, 멘토링에 참여하고 싶은 청소년(멘티)도 여기에서 문의할 수 있습니다.
    {
      key: 'mentee',
      icon: 'message',
      title: t.involved.menteeTitle,
      body: t.involved.menteeBody,
      cta: t.involved.menteeCta,
      href: contactMailto(site.contactEmail, t.involved.menteeSubject),
      secondary: t.involved.mentorSecondary,
      secondaryHref: `/${locale}/programs#mentoring`,
    },
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
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ways.map((way) => (
            <li key={way.key} id={way.key} className="lr-card flex flex-col p-6 sm:p-7">
              <span className="lr-icon-badge h-11 w-11">
                <Icon name={way.icon} size={22} />
              </span>{' '}
              <h2 className="mt-4 text-xl font-extrabold text-ink-900">{way.title}</h2>{' '}
              <p className="lr-body mt-2 flex-1">{way.body}</p>
              {/* 문의는 사이트에서 바로 보냅니다. (메일 앱이 없어도 됩니다)
                  데이터베이스가 연결되어 있지 않으면 예전처럼 메일 쓰기 버튼이 보입니다. */}
              {forms ? (
                <div className="mt-6">
                  <details className="group">
                    <summary className="lr-btn lr-btn-primary lr-press w-full cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      {way.cta}
                      <span className="transition-transform group-open:rotate-180" aria-hidden="true">
                        ▾
                      </span>
                    </summary>
                    <div className="mt-4 border-t border-[var(--color-line)] pt-4">
                      <SubmitBox locale={locale} kind="join" detail={way.key} needContact withTitle={false} rows={5} />
                    </div>
                  </details>
                  <Link href={way.secondaryHref} className="lr-link mt-3 inline-block text-[15px] font-semibold">
                    {way.secondary}
                  </Link>
                </div>
              ) : (
                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
                  <a href={way.href} className="lr-btn lr-btn-primary lr-press">
                    {way.cta} <Icon name="arrow-right" size={18} />
                  </a>
                  <Link href={way.secondaryHref} className="lr-link text-[15px] font-semibold">
                    {way.secondary}
                  </Link>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-6 max-w-3xl rounded-[var(--radius-control)] border border-[var(--color-line)] bg-white p-5">
          <h2 className="text-base font-bold text-ink-900">{t.involved.howToTitle}</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-ink-700">
            {forms ? t.involved.howToBodyForm : t.involved.howToBody}
          </p>
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

      {/* 의견 보내기: 아직 고쳐 나가는 중이라 첫 화면의 시범 운영 안내에서 이곳으로 옵니다. */}
      <Section id="feedback" tone="soft" title={t.involved.feedbackTitle} subtitle={t.involved.feedbackBody}>
        <div className="max-w-2xl">
          <SubmitBox locale={locale} kind="correction" detail="feedback" withTitle={false} rows={5} />
        </div>
      </Section>
    </>
  );
}
