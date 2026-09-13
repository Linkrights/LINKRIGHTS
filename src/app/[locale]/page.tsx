// 홈(첫 화면)입니다.
// 첫 화면에서는 LINKRIGHTS의 핵심 메시지와 "내 상황 질문하기"를 가장 먼저 보여주고,
// 아래로 내려가며 분야, 우리가 주목한 문제, AI 안내 원칙, 권리정보, 기관, 활동, SDGs, 자주 묻는 질문을 보여줍니다.

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

  const viewAll = (href: string) => (
    <Link href={href} className="lr-btn lr-btn-ghost lr-btn-sm">
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
        <div className="lr-container grid gap-10 py-12 sm:py-16 lg:grid-cols-12 lg:items-center lg:gap-14 lg:py-20">
          <div className="lg:col-span-6">
            <p className="lr-eyebrow">LINKRIGHTS</p>
            <h1 className="lr-display mt-4 whitespace-pre-line">{t.home.heroTitle}</h1>
            <p className="lr-lead mt-5 max-w-xl">{t.home.heroSubtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link href={`/${locale}/ask`} className="lr-btn lr-btn-primary lr-btn-lg">
                {t.home.ctaAsk} <Icon name="arrow-right" size={18} />
              </Link>
              <Link href={`/${locale}/rights`} className="lr-btn lr-btn-ghost lr-btn-lg">
                {t.home.ctaRights}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="lr-panel bg-white p-5 shadow-[var(--shadow-raised)] sm:p-7">
              <AskBox locale={locale} examples={examples} />
            </div>
          </div>
        </div>
      </section>

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
          <Link href={`/${locale}/ask`} className="lr-btn lr-btn-primary">
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

      {/* 5. 많이 찾는 권리정보 -------------------------------------- */}
      <Section
        tone="soft"
        title={t.home.featuredTitle}
        subtitle={t.home.featuredSubtitle}
        action={viewAll(`/${locale}/rights`)}
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
      <Section title={t.home.orgTitle} subtitle={t.home.orgSubtitle} action={viewAll(`/${locale}/organizations`)}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <li key={org.id}>
              <OrgCard org={org} locale={locale} />
            </li>
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
          {programs.map((program) => (
            <li key={program.id} className="border-t-2 border-brand-600 pt-5">
              <span className="text-sm font-semibold text-brand-700">{pick(program.tag, locale)}</span>{' '}
              <h3 className="lr-h3 mt-1.5">{pick(program.title, locale)}</h3>{' '}
              <p className="mt-2 text-[15px] leading-relaxed text-ink-500">{pick(program.body, locale)}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* 8. SDGs ---------------------------------------------------- */}
      <Section title={t.home.sdgTitle} subtitle={t.home.sdgSubtitle}>
        <ul className="grid gap-8 sm:grid-cols-2">
          {about.sdgs.map((sdg, index) => (
            <li key={sdg.code} className="flex gap-4">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-[var(--radius-control)] text-base font-extrabold text-white"
                style={{ background: index === 0 ? 'var(--color-sdg4)' : 'var(--color-sdg10)' }}
              >
                {sdg.code.replace('SDG ', '')}
              </span>{' '}
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
