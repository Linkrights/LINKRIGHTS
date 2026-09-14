// 홈(첫 화면)입니다.
// 첫 화면에서는 LINKRIGHTS의 핵심 메시지와 "내 상황 질문하기"를 가장 먼저 보여주고,
// 아래로 내려가며 분야, 우리가 주목한 문제, AI 안내 원칙, 권리정보, 기관, 활동, SDGs, 자주 묻는 질문을 보여줍니다.

import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import { AskBox } from '@/components/AskBox';
import { HeroVideoPanel } from '@/components/HeroVideoPanel';
import { CategoryCard } from '@/components/CategoryCard';
import { CountUp } from '@/components/CountUp';
import { Icon, type IconName } from '@/components/Icon';
import { Marquee } from '@/components/Marquee';
import { OrgCard } from '@/components/OrgCard';
import { Reveal } from '@/components/Reveal';
import { SdgIcon } from '@/components/SdgIcon';
import { Section } from '@/components/Section';
import {
  getAbout,
  getArticles,
  getCategories,
  getFaq,
  getFeaturedArticles,
  getOrganizations,
  getPrograms,
  getSite,
} from '@/lib/content';
import { LOCALES, formatDate, getMessages, pick, toLocale } from '@/lib/i18n';
import impact from '../../../content/impact.json';

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const site = getSite();
  const categories = getCategories();
  const featured = getFeaturedArticles(6);
  const orgs = getOrganizations().filter((o) => !o.emergency).slice(0, 3);
  const about = getAbout().i18n[locale] ?? getAbout().i18n.ko;
  const programs = getPrograms().items.filter((p) => p.status === 'published').slice(0, 3);
  // 홈에는 content/faq.json 에서 featured 로 표시한 핵심 질문(최대 4개)만 보여주고, 나머지는 FAQ 페이지에서 봅니다.
  const faq = getFaq().items.filter((item) => item.featured).slice(0, 4);
  const examples = site.exampleQuestions[locale] ?? site.exampleQuestions.ko;

  // 숫자로 보는 LINKRIGHTS: 함께하는 청소년 수는 content/impact.json 의 실제 숫자, 나머지는 등록된 자료를 그대로 셉니다.
  const stats = [
    { key: 'participants', label: t.home.impactParticipants, unit: t.home.impactParticipantsUnit, value: impact.participants.count },
    { key: 'articles', label: t.home.impactArticles, unit: t.home.impactArticlesUnit, value: getArticles().length },
    { key: 'organizations', label: t.home.impactOrganizations, unit: t.home.impactOrganizationsUnit, value: getOrganizations().length },
    { key: 'languages', label: t.home.impactLanguages, unit: t.home.impactLanguagesUnit, value: LOCALES.length },
  ];

  // 소개 영상: public/videos 에 파일이 있을 때만 보여줍니다. (전체 영상이 없으면 "전체 영상 보기" 버튼만 숨깁니다)
  const publicFile = (file: string) => fs.existsSync(path.join(process.cwd(), 'public', file));
  const heroVideo = {
    loop: '/videos/linkrights-promo-loop.mp4',
    full: '/videos/linkrights-promo.mp4',
    poster: '/images/hero-poster.jpg',
  };
  const hasHeroVideo = publicFile(heroVideo.loop) && publicFile(heroVideo.poster);

  const viewAll = (href: string) => (
    <Link href={href} className="lr-btn lr-btn-ghost lr-btn-sm lr-press">
      {t.common.viewAll} <Icon name="arrow-right" size={16} />
    </Link>
  );

  return (
    <>
      {/* 긴급 안내: 가장 위에 얇게 */}
      <div className="border-b border-[var(--color-danger-200)] bg-[var(--color-danger-50)]">
        <div className="lr-container py-2.5">
          <Link
            href={`/${locale}/emergency`}
            className="inline-flex items-start gap-2 text-sm font-semibold leading-snug text-[var(--color-danger-700)] hover:underline"
          >
            <Icon name="alert" size={16} className="mt-0.5 shrink-0" /> <span>{t.home.emergencyBanner}</span>
          </Link>
        </div>
      </div>

      {/* 1. 첫 화면: 핵심 메시지 + 내 상황을 말해보는 공간 ------------ */}
      <section className="border-b border-[var(--color-line)] bg-white">
        {/* 넓은 화면: 왼쪽 위 핵심 메시지, 왼쪽 아래 소개 영상, 오른쪽 질문 공간 / 휴대폰: 메시지 → 질문 공간 → 영상 */}
        <div className="lr-container grid gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:gap-x-14 lg:gap-y-10 lg:py-20">
          <div className={`lg:col-span-6 lg:row-start-1 ${hasHeroVideo ? 'lg:self-end' : 'lg:self-center'}`}>
            <p className="lr-eyebrow">LINKRIGHTS</p>
            <h1 className="lr-display mt-4 whitespace-pre-line">{t.home.heroTitle}</h1>
            <p className="lr-lead mt-5 max-w-xl">{t.home.heroSubtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={`/${locale}/ask`} className="lr-btn lr-btn-primary lr-btn-lg lr-press">
                {t.home.ctaAsk} <Icon name="arrow-right" size={18} />
              </Link>
              <Link href={`/${locale}/rights`} className="lr-btn lr-btn-ghost lr-btn-lg lr-press">
                {t.home.ctaRights}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:self-center">
            <div className="lr-panel bg-white p-5 shadow-[var(--shadow-raised)] sm:p-7">
              <AskBox locale={locale} examples={examples} />
            </div>
          </div>

          {hasHeroVideo && (
            <div className="lg:col-span-6 lg:col-start-1 lg:row-start-2 lg:self-start">
              <HeroVideoPanel
                loopSrc={heroVideo.loop}
                fullSrc={publicFile(heroVideo.full) ? heroVideo.full : undefined}
                poster={heroVideo.poster}
                labels={t.heroVideo}
              />
            </div>
          )}
        </div>
      </section>

      {/* 1-1. 분야 이름이 천천히 흐르는 띠: 아래 분야 카드와 같은 곳으로 연결됩니다 */}
      <nav aria-label={t.home.browseTitle} className="border-b border-[var(--color-line)] bg-white">
        <div className="lr-container py-3">
          <Marquee pauseLabel={t.common.pauseMotion} playLabel={t.common.playMotion}>
            <ul className="flex gap-2.5 pr-2.5">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={category.kind === 'directory' ? `/${locale}/organizations` : `/${locale}/rights/${category.id}`}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-[15px] font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Icon name={category.icon as IconName} size={16} className="shrink-0 text-brand-600" />
                    {pick(category.name, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </Marquee>
        </div>
      </nav>

      {/* 1-2. 나는 누구인가요?: 청소년 · 대학생 멘토 · 학교/기관 ----------- */}
      <Section tone="soft" title={t.involved.whoTitle} subtitle={t.involved.whoSubtitle}>
        <ul className="grid gap-3 md:grid-cols-3">
          {(
            [
              {
                key: 'youth',
                icon: 'sparkles',
                title: t.involved.youthTitle,
                body: t.involved.youthBody,
                cta: t.involved.youthCta,
                href: `/${locale}/ask`,
                secondary: t.involved.youthSecondary,
                secondaryHref: `/${locale}/rights`,
              },
              {
                key: 'mentor',
                icon: 'book',
                title: t.involved.mentorTitle,
                body: t.involved.mentorBody,
                cta: t.involved.mentorCta,
                href: `mailto:${site.contactEmail}?subject=${encodeURIComponent(t.involved.mentorSubject)}`,
                secondary: t.involved.mentorSecondary,
                secondaryHref: `/${locale}/programs#mentoring`,
              },
              {
                key: 'partner',
                icon: 'briefcase',
                title: t.involved.partnerTitle,
                body: t.involved.partnerBody,
                cta: t.involved.partnerCta,
                href: `mailto:${site.contactEmail}?subject=${encodeURIComponent(t.involved.partnerSubject)}`,
                secondary: t.involved.partnerSecondary,
                secondaryHref: `/${locale}/get-involved`,
              },
            ] as { key: string; icon: IconName; title: string; body: string; cta: string; href: string; secondary: string; secondaryHref: string }[]
          ).map((item, index) => (
            <Reveal key={item.key} index={index} className="lr-card flex flex-col p-6">
              <span className="lr-icon-badge h-11 w-11">
                <Icon name={item.icon} size={22} />
              </span>{' '}
              <h3 className="lr-h3 mt-4">{item.title}</h3>{' '}
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-500">{item.body}</p>
              <div className="mt-5 flex flex-col items-start gap-3">
                {item.href.startsWith('mailto:') ? (
                  <a href={item.href} className="lr-btn lr-btn-primary lr-press w-full">
                    {item.cta} <Icon name="arrow-right" size={18} />
                  </a>
                ) : (
                  <Link href={item.href} className="lr-btn lr-btn-primary lr-press w-full">
                    {item.cta} <Icon name="arrow-right" size={18} />
                  </Link>
                )}
                <Link href={item.secondaryHref} className="lr-link text-[15px] font-semibold">
                  {item.secondary}
                </Link>
              </div>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* 2. 분야별로 찾아보기 --------------------------------------- */}
      <Section title={t.home.browseTitle} subtitle={t.home.browseSubtitle}>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <CategoryCard category={category} locale={locale} />
            </li>
          ))}
        </ul>
      </Section>

      {/* 3. 우리가 주목한 문제: 카드 대신 번호 목록 ------------------ */}
      <Section tone="soft" title={t.home.problemTitle} subtitle={t.home.problemSubtitle}>
        <ol className="grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {about.problems.map((problem, index) => (
            <li key={problem.title} className="flex gap-4">
              <span className="w-8 shrink-0 pt-0.5 text-[15px] font-extrabold tabular-nums text-brand-600">
                {String(index + 1).padStart(2, '0')}
                <span className="sr-only">.</span>
              </span>{' '}
              <div>
                <h3 className="lr-h3">{problem.title}</h3>{' '}
                <p className="lr-body mt-1.5">{problem.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* 4. AI 정보 안내의 원칙 ----------------------------------- */}
      <Section
        title={t.home.aiTitle}
        subtitle={t.home.aiSubtitle}
        action={
          <Link href={`/${locale}/ask`} className="lr-btn lr-btn-primary lr-press">
            {t.home.ctaAsk} <Icon name="arrow-right" size={18} />
          </Link>
        }
      >
        <ul className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
          {t.home.aiPoints.map((point) => (
            <li key={point.title} className="flex gap-3.5">
              <span className="lr-icon-badge h-10 w-10">
                <Icon name="check" size={20} />
              </span>{' '}
              <div>
                <h3 className="lr-h3">{point.title}</h3>{' '}
                <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{point.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* 4-1. 숫자로 보는 LINKRIGHTS: 화면에 들어오면 숫자가 0부터 한 번만 올라갑니다 */}
      <section aria-labelledby="impact-title" className="border-y border-[var(--color-line)] bg-brand-50">
        <div className="lr-container py-12 sm:py-14">
          <h2 id="impact-title" className="lr-h2">
            {t.home.impactTitle}
          </h2>
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.key} className="flex flex-col-reverse border-l-2 border-brand-600 pl-4">
                <dt className="mt-1 text-[15px] font-semibold leading-snug text-ink-700">{stat.label}</dt>
                <dd className="flex items-baseline gap-1 text-brand-700">
                  <span className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                    <CountUp value={stat.value} />
                  </span>
                  {stat.unit && <span className="text-lg font-bold">{stat.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-[13px] leading-relaxed text-ink-500">
            {t.home.impactNote.replace('{date}', formatDate(impact.participants.as_of, locale))}
          </p>
        </div>
      </section>

      {/* 5. 많이 찾는 권리정보 -------------------------------------- */}
      <Section
        tone="soft"
        title={t.home.featuredTitle}
        subtitle={t.home.featuredSubtitle}
        action={viewAll(`/${locale}/rights`)}
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((article, index) => (
            <Reveal key={article.id} index={index}>
              <ArticleCard article={article} locale={locale} />
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* 6. 도움받을 수 있는 기관 ---------------------------------- */}
      <Section title={t.home.orgTitle} subtitle={t.home.orgSubtitle} action={viewAll(`/${locale}/organizations`)}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org, index) => (
            <Reveal key={org.id} index={index}>
              <OrgCard org={org} locale={locale} />
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* 7. 프로그램 및 활동: 선으로 나눈 목록 ---------------------- */}
      <Section
        tone="soft"
        title={t.home.programsTitle}
        subtitle={t.home.programsSubtitle}
        action={viewAll(`/${locale}/programs`)}
      >
        <ul className="grid gap-8 sm:grid-cols-3">
          {programs.map((program, index) => (
            <Reveal key={program.id} index={index} className="border-t-2 border-brand-600 pt-5">
              <span className="text-sm font-semibold text-brand-700">{pick(program.tag, locale)}</span>{' '}
              <h3 className="lr-h3 mt-1.5">{pick(program.title, locale)}</h3>{' '}
              <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{pick(program.body, locale)}</p>
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* 8. SDGs ---------------------------------------------------- */}
      <Section title={t.home.sdgTitle} subtitle={t.home.sdgSubtitle}>
        <ul className="grid gap-8 sm:grid-cols-2">
          {about.sdgs.map((sdg) => (
            <li key={sdg.code} className="flex gap-4">
              <SdgIcon code={sdg.code} />{' '}
              <div>
                <h3 className="lr-h3">
                  {sdg.code} · {sdg.name}
                </h3>{' '}
                <p className="lr-body mt-1">{sdg.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* 9. 자주 묻는 질문: 하나의 카드 안에서 선으로 구분 ----------- */}
      <Section tone="soft" title={t.home.faqTitle} action={viewAll(`/${locale}/faq`)}>
        <ul className="lr-card divide-y divide-[var(--color-line)] overflow-hidden">
          {faq.map((item) => (
            <li key={item.id}>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-base font-bold text-ink-900 hover:bg-surface-soft sm:px-6">
                  {pick(item.q, locale)}
                  <span className="shrink-0 text-ink-300 transition-transform group-open:rotate-180" aria-hidden="true">
                    ▾
                  </span>
                </summary>
                <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-700 sm:px-6">{pick(item.a, locale)}</p>
              </details>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
