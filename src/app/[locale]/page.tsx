// 홈(첫 화면)입니다.
// 첫 화면은 LINKRIGHTS 소개 영상을 배경으로 한 hero(HomeHero)로 브랜드와 핵심 메시지를 먼저 보여주고,
// 아래로 내려가며 브랜드 소개 → 어떤 상황인가요(분야) → 내 상황 말하기(AI) → 숫자 → 권리정보 → 기관 → 프로그램
// → 우리에게 도움을 주는 곳 → 나는 누구인가요 → SDGs → 자주 묻는 질문 순서로 이어집니다.
// 카드는 꼭 필요한 곳에만 쓰고, 소개·분야는 큰 글씨와 가는 선으로 구분합니다.

import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import { AskBox } from '@/components/AskBox';
import { CountUp } from '@/components/CountUp';
import { HomeHero } from '@/components/HomeHero';
import { Icon, type IconName } from '@/components/Icon';
import { OrgCard } from '@/components/OrgCard';
import { PartnerList } from '@/components/PartnerList';
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
  getPartners,
  getPrograms,
  getSite,
  resolveOrganizations,
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

  // 소개 영상: 팀이 만든 LINKRIGHTS 소개 영상 전체(144초, 자르지 않은 웹용 압축본, 소리 없음).
  // public 폴더에 파일이 있을 때만 씁니다. (없으면 대표 이미지 또는 네이비 배경만)
  const publicFile = (file: string) => fs.existsSync(path.join(process.cwd(), 'public', file));
  const heroVideo = {
    desktop: '/videos/linkrights-hero-full-720.mp4',
    mobile: '/videos/linkrights-hero-full-480.mp4',
    poster: '/images/hero-poster.jpg',
  };
  // 첫 화면 긴급 연락처는 등록된 기관(content/organizations.json)의 번호만 씁니다.
  const heroContacts = resolveOrganizations(['police-112', 'fire-119']).map((org) => ({
    id: org.id,
    name: pick(org.name, locale),
    phone: org.phone,
  }));

  // 브랜드 소개: LINKRIGHTS가 함께 알려주는 세 가지
  const introSteps = [
    { title: t.ask.resultRights, body: t.homeBrand.step1 },
    { title: t.ask.resultActions, body: t.homeBrand.step2 },
    { title: t.ask.resultOrgs, body: t.homeBrand.step3 },
  ];

  // 숫자로 보는 LINKRIGHTS: 함께하는 청소년 수는 content/impact.json 의 실제 숫자, 나머지는 등록된 자료를 그대로 셉니다.
  const stats = [
    { key: 'participants', label: t.home.impactParticipants, unit: t.home.impactParticipantsUnit, value: impact.participants.count },
    { key: 'articles', label: t.home.impactArticles, unit: t.home.impactArticlesUnit, value: getArticles().length },
    { key: 'organizations', label: t.home.impactOrganizations, unit: t.home.impactOrganizationsUnit, value: getOrganizations().length },
    { key: 'languages', label: t.home.impactLanguages, unit: t.home.impactLanguagesUnit, value: LOCALES.length },
  ];

  const viewAll = (href: string) => (
    <Link href={href} className="lr-btn lr-btn-ghost lr-btn-sm lr-press">
      {t.common.viewAll} <Icon name="arrow-right" size={16} />
    </Link>
  );

  return (
    <>
      {/* 1. 첫 화면: 소개 영상 + 핵심 메시지 ---------------------------- */}
      <HomeHero
        rightsHref={`/${locale}/rights`}
        askHref={`/${locale}/ask`}
        emergencyHref={`/${locale}/emergency`}
        contacts={heroContacts}
        sources={
          publicFile(heroVideo.desktop)
            ? { desktop: heroVideo.desktop, mobile: publicFile(heroVideo.mobile) ? heroVideo.mobile : undefined }
            : undefined
        }
        poster={publicFile(heroVideo.poster) ? heroVideo.poster : undefined}
        labels={{
          eyebrow: t.homeBrand.eyebrow,
          title: t.home.heroTitle,
          subtitle: t.home.heroSubtitle,
          ctaRights: t.home.ctaRights,
          ctaAsk: t.home.ctaAsk,
          emergency: t.home.emergencyBanner,
          call: t.nav.emergencyCall,
          scrollDown: t.homeBrand.scrollDown,
          play: t.heroVideo.play,
          pause: t.heroVideo.pause,
        }}
      />

      {/* 2. 브랜드 소개: 권리를 아는 것에서 시작합니다 ------------------ */}
      <section id="home-intro" className="scroll-mt-20 border-b border-[var(--color-line)] bg-white">
        <div className="lr-container py-20 sm:py-28">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <p className="lr-eyebrow">LINKRIGHTS</p>
              <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-[2.5rem]">
                {about.hero_title}
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-ink-700">{about.change_body}</p>
              <Link
                href={`/${locale}/about`}
                className="lr-link mt-7 inline-flex items-center gap-1.5 text-[15px] font-semibold"
              >
                {t.nav.about} <Icon name="arrow-right" size={16} />
              </Link>
            </div>
            <ol className="border-t-2 border-ink-900 lg:col-span-7">
              {introSteps.map((step, index) => (
                <Reveal
                  key={step.title}
                  index={index}
                  className="grid grid-cols-[3.5rem_1fr] gap-4 border-b border-[var(--color-line)] py-7 sm:grid-cols-[5.5rem_1fr] sm:py-9"
                >
                  <span className="text-3xl font-extrabold tabular-nums text-brand-600 sm:text-[2.5rem]">
                    {String(index + 1).padStart(2, '0')}
                    <span className="sr-only">.</span>
                  </span>{' '}
                  <div>
                    <h3 className="text-xl font-bold text-ink-900 sm:text-2xl">{step.title}</h3>{' '}
                    <p className="mt-2 text-[17px] leading-relaxed text-ink-500">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 3. 어떤 상황에 있나요?: 분야를 큰 글씨 목록으로 ----------------- */}
      <Section title={t.homeBrand.situationTitle} subtitle={t.home.browseSubtitle}>
        <ul className="grid border-t border-[var(--color-line)] sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id} className="border-b border-[var(--color-line)]">
              <Link
                href={category.kind === 'directory' ? `/${locale}/organizations` : `/${locale}/rights/${category.id}`}
                className="group flex items-center gap-4 py-5"
              >
                <Icon name={category.icon as IconName} size={24} className="shrink-0 text-brand-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-ink-900 group-hover:text-brand-700">
                    {pick(category.name, locale)}
                  </span>{' '}
                  <span className="mt-0.5 block text-[15px] leading-snug text-ink-500">{pick(category.tagline, locale)}</span>
                </span>
                <Icon
                  name="arrow-right"
                  size={18}
                  className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-1 group-hover:text-brand-600"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* 4. 내 상황을 말해 보세요: AI는 권리를 알아가는 도구 --------------- */}
      <Section tone="soft" title={t.homeBrand.askTitle} subtitle={t.ask.subtitle}>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7">
            <div className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-surface-soft p-5 sm:p-7">
              <AskBox locale={locale} examples={examples} />
            </div>
          </div>
          <div className="lg:col-span-5">
            <h3 className="text-lg font-bold text-ink-900">{t.home.aiTitle}</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{t.home.aiSubtitle}</p>
            <ul className="mt-5 border-t border-[var(--color-line)]">
              {t.home.aiPoints.slice(0, 3).map((point) => (
                <li key={point.title} className="border-b border-[var(--color-line)] py-4">
                  <p className="font-bold text-ink-900">{point.title}</p>{' '}
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-500">{point.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* 5. 숫자로 보는 LINKRIGHTS: 짙은 네이비 띠 ------------------------ */}
      <section aria-labelledby="impact-title" className="bg-[#0b1730] text-white">
        <div className="lr-container py-14 sm:py-16">
          <h2 id="impact-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t.home.impactTitle}
          </h2>
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.key} className="flex flex-col-reverse border-l-2 border-brand-400 pl-4">
                <dt className="mt-1 text-[15px] font-semibold leading-snug text-white/75">{stat.label}</dt>
                <dd className="flex items-baseline gap-1 text-white">
                  <span className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                    <CountUp value={stat.value} />
                  </span>
                  {stat.unit && <span className="text-lg font-bold text-white/85">{stat.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 text-[13px] leading-relaxed text-white/60">
            {t.home.impactNote.replace('{date}', formatDate(impact.participants.as_of, locale))}
          </p>
        </div>
      </section>

      {/* 6. 많이 찾는 권리정보 -------------------------------------- */}
      <Section title={t.home.featuredTitle} subtitle={t.home.featuredSubtitle} action={viewAll(`/${locale}/rights`)}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((article, index) => (
            <Reveal key={article.id} index={index}>
              <ArticleCard article={article} locale={locale} />
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* 7. 실제 도움을 받을 수 있는 곳 ----------------------------- */}
      <Section
        tone="soft"
        title={t.home.orgTitle}
        subtitle={t.home.orgSubtitle}
        action={viewAll(`/${locale}/organizations`)}
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org, index) => (
            <Reveal key={org.id} index={index}>
              <OrgCard org={org} locale={locale} />
            </Reveal>
          ))}
        </ul>
      </Section>

      {/* 8. 프로그램 및 활동: 선으로 나눈 목록 ---------------------- */}
      <Section title={t.home.programsTitle} subtitle={t.home.programsSubtitle} action={viewAll(`/${locale}/programs`)}>
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

      {/* 9. 우리에게 도움을 주는 곳 (content/partners.json 에 등록된 기관만) ------ */}
      {getPartners().length > 0 && (
        <Section
          tone="soft"
          title={t.involved.partnersTitle}
          subtitle={t.involved.partnersSubtitle}
          action={
            <Link href={`/${locale}/get-involved`} className="lr-btn lr-btn-ghost lr-btn-sm lr-press">
              {t.nav.getInvolved} <Icon name="arrow-right" size={16} />
            </Link>
          }
        >
          <PartnerList locale={locale} />
        </Section>
      )}

      {/* 10. 나는 누구인가요?: 청소년 · 대학생 멘토 · 학교/기관 ----------- */}
      <Section title={t.involved.whoTitle} subtitle={t.involved.whoSubtitle}>
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
            <Reveal key={item.key} index={index} className="flex flex-col border-t-2 border-ink-900 pt-6">
              <span className="lr-icon-badge h-11 w-11">
                <Icon name={item.icon} size={22} />
              </span>{' '}
              <h3 className="lr-h3 mt-4">{item.title}</h3>{' '}
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink-500">{item.body}</p>
              <div className="mt-5 flex flex-col items-start gap-3">
                {item.href.startsWith('mailto:') ? (
                  <a href={item.href} className="lr-btn lr-btn-ghost lr-press">
                    {item.cta} <Icon name="arrow-right" size={18} />
                  </a>
                ) : (
                  <Link href={item.href} className="lr-btn lr-btn-ghost lr-press">
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

      {/* 11. SDGs ---------------------------------------------------- */}
      <Section tone="soft" title={t.home.sdgTitle} subtitle={t.home.sdgSubtitle}>
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

      {/* 12. 자주 묻는 질문: 하나의 카드 안에서 선으로 구분 ----------- */}
      <Section title={t.home.faqTitle} action={viewAll(`/${locale}/faq`)}>
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
