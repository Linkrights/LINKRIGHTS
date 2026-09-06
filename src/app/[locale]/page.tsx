// 홈(첫 화면)입니다.

import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import { AskBox } from '@/components/AskBox';
import { CategoryCard } from '@/components/CategoryCard';
import { Icon } from '@/components/Icon';
import { OrgCard } from '@/components/OrgCard';
import { Section } from '@/components/Section';
import {
  getAbout,
  getCategories,
  getFaq,
  getFeaturedArticles,
  getOrganizations,
  getPrograms,
  getSite,
} from '@/lib/content';
import { getMessages, pick, toLocale } from '@/lib/i18n';

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
  const faq = getFaq().items.slice(0, 4);
  const examples = site.exampleQuestions[locale] ?? site.exampleQuestions.ko;

  return (
    <>
      {/* 1. 히어로 ------------------------------------------------ */}
      <section className="border-b border-[var(--color-line)] bg-white">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14">
          <Link
            href={`/${locale}/emergency`}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--color-danger-200)] bg-[var(--color-danger-50)] px-4 py-2 text-sm font-semibold text-[var(--color-danger-700)]"
          >
            <Icon name="alert" size={16} />
            {t.home.emergencyBanner}
          </Link>

          <h1 className="mt-6 max-w-3xl text-[32px] font-extrabold leading-[1.25] tracking-tight text-ink-900 sm:text-5xl sm:leading-[1.15]">
            {t.home.heroTitle}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-700 sm:text-lg">{t.home.heroSubtitle}</p>

          <div className="mt-7 max-w-2xl">
            <AskBox locale={locale} examples={examples} />
          </div>
        </div>
      </section>

      {/* 2. 분야별 빠른 탐색 --------------------------------------- */}
      <Section title={t.home.browseTitle} subtitle={t.home.browseSubtitle}>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <li key={category.id}>
              <CategoryCard category={category} locale={locale} />
            </li>
          ))}
        </ul>
      </Section>

      {/* 3. 우리가 주목한 문제 ------------------------------------- */}
      <Section tone="soft" title={t.home.problemTitle} subtitle={t.home.problemSubtitle}>
        <ul className="grid gap-4 sm:grid-cols-2">
          {about.problems.map((problem) => (
            <li key={problem.title} className="rounded-2xl bg-surface-soft p-5">
              <h3 className="font-bold text-ink-900">{problem.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{problem.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 4. AI 정보 안내 소개 -------------------------------------- */}
      <Section
        title={t.home.aiTitle}
        subtitle={t.home.aiSubtitle}
        action={
          <Link href={`/${locale}/ask`} className="lr-btn lr-btn-primary">
            <Icon name="sparkles" size={18} />
            {t.nav.ask}
          </Link>
        }
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {t.home.aiPoints.map((point) => (
            <li key={point.title} className="lr-card flex flex-col gap-2 p-5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <Icon name="check" size={18} />
              </span>
              <h3 className="font-bold text-ink-900">{point.title}</h3>
              <p className="text-sm leading-relaxed text-ink-500">{point.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 5. 주요 권리정보 ------------------------------------------ */}
      <Section
        tone="soft"
        title={t.home.featuredTitle}
        subtitle={t.home.featuredSubtitle}
        action={
          <Link href={`/${locale}/rights`} className="lr-btn lr-btn-ghost">
            {t.common.viewAll}
            <Icon name="arrow-right" size={16} />
          </Link>
        }
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((article) => (
            <li key={article.id}>
              <ArticleCard article={article} locale={locale} />
            </li>
          ))}
        </ul>
      </Section>

      {/* 6. 도움받을 수 있는 기관 ---------------------------------- */}
      <Section
        title={t.home.orgTitle}
        subtitle={t.home.orgSubtitle}
        action={
          <Link href={`/${locale}/organizations`} className="lr-btn lr-btn-ghost">
            {t.common.viewAll}
            <Icon name="arrow-right" size={16} />
          </Link>
        }
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <li key={org.id}>
              <OrgCard org={org} locale={locale} />
            </li>
          ))}
        </ul>
      </Section>

      {/* 7. 프로그램 및 활동 --------------------------------------- */}
      <Section
        tone="soft"
        title={t.home.programsTitle}
        subtitle={t.home.programsSubtitle}
        action={
          <Link href={`/${locale}/programs`} className="lr-btn lr-btn-ghost">
            {t.common.viewAll}
            <Icon name="arrow-right" size={16} />
          </Link>
        }
      >
        <ul className="grid gap-3 sm:grid-cols-3">
          {programs.map((program) => (
            <li key={program.id} className="lr-card p-5">
              <span className="lr-chip">{pick(program.tag, locale)}</span>
              <h3 className="mt-3 font-bold text-ink-900">{pick(program.title, locale)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{pick(program.body, locale)}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 8. SDGs --------------------------------------------------- */}
      <Section title={t.home.sdgTitle} subtitle={t.home.sdgSubtitle}>
        <ul className="grid gap-4 sm:grid-cols-2">
          {about.sdgs.map((sdg, index) => (
            <li key={sdg.code} className="lr-card flex gap-4 p-5">
              <span
                className="grid h-14 w-14 shrink-0 place-items-center rounded-xl text-sm font-extrabold leading-tight text-white"
                style={{ background: index === 0 ? 'var(--color-sdg4)' : 'var(--color-sdg10)' }}
              >
                {sdg.code.replace('SDG ', '')}
              </span>
              <div>
                <h3 className="font-bold text-ink-900">
                  {sdg.code} · {sdg.name}
                </h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{sdg.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      {/* 9. 자주 묻는 질문 ----------------------------------------- */}
      <Section
        tone="soft"
        title={t.home.faqTitle}
        action={
          <Link href={`/${locale}/faq`} className="lr-btn lr-btn-ghost">
            {t.common.viewAll}
            <Icon name="arrow-right" size={16} />
          </Link>
        }
      >
        <ul className="space-y-2">
          {faq.map((item) => (
            <li key={item.id}>
              <details className="lr-card group p-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-bold text-ink-900">
                  {pick(item.q, locale)}
                  <span className="shrink-0 text-ink-300 transition-transform group-open:rotate-180" aria-hidden="true">
                    ▾
                  </span>
                </summary>
                <p className="px-5 pb-5 text-[15px] leading-relaxed text-ink-700">{pick(item.a, locale)}</p>
              </details>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
