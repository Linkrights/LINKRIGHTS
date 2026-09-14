// 권리정보 검색 결과 페이지입니다. (예: /ko/rights/search?q=월급)
//
// AI 질문(/api/ask)과 같은 검색 방법(search.ts 의 findEvidence)을 쓰지만, AI를 부르지 않고 등록된 권리정보만 보여줍니다.
//  - 찾은 권리정보: 등록 키워드나 상황 사전에서 검색어와 직접 맞는 글
//  - 상황에 따라 관련될 수 있는 정보: 조건이 맞을 때만 해당되는 글 (안내 문구와 함께)
//  - 둘 다 없으면 비슷한 낱말이 들어 있는 글과 관련 분야를 보여줍니다.
// 인기 검색어나 조회수는 실제 자료가 없으므로 만들지 않고, 검색어도 저장하지 않습니다.
// 검색어가 주소에 들어가는 페이지이므로 검색엔진에 올리지 않습니다.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import { Icon } from '@/components/Icon';
import { MAX_SEARCH_LENGTH, RightsSearchForm } from '@/components/RightsSearchForm';
import { PageHeader, Section } from '@/components/Section';
import { getRightsCategories } from '@/lib/content';
import { detectEmergency } from '@/lib/emergency';
import { getMessages, pick, toLocale } from '@/lib/i18n';
import { findEvidence, findRelevantArticles } from '@/lib/search';
import type { RightsArticle } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** 검색 결과 수 (AI 질문보다 넉넉하게 보여줍니다) */
const SEARCH_LIMITS = { direct: 12, possible: 6, total: 18 };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const t = getMessages(toLocale(rawLocale));
  return { title: t.search.title, description: t.search.subtitle, robots: { index: false, follow: true } };
}

function ArticleGrid({ articles, locale }: { articles: RightsArticle[]; locale: ReturnType<typeof toLocale> }) {
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <li key={article.id}>
          <ArticleCard article={article} locale={locale} />
        </li>
      ))}
    </ul>
  );
}

export default async function RightsSearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const rawQuery = (await searchParams).q;
  const q = (Array.isArray(rawQuery) ? rawQuery[0] ?? '' : rawQuery ?? '').trim().slice(0, MAX_SEARCH_LENGTH);

  const { matches } = q ? findEvidence(q, SEARCH_LIMITS) : { matches: [] };
  const direct = matches.filter((match) => match.tier === 'direct').map((match) => match.article);
  const possible = matches.filter((match) => match.tier === 'possible').map((match) => match.article);
  // 직접 맞는 글이 없을 때만, 제목·요약에 비슷한 낱말이 있는 글을 참고로 보여줍니다.
  const shownIds = new Set(matches.map((match) => match.article.id));
  const similar =
    q && matches.length === 0
      ? findRelevantArticles(q, 6)
          .filter((match) => match.score >= 1 && !shownIds.has(match.article.id))
          .map((match) => match.article)
      : [];
  const total = direct.length + possible.length + similar.length;

  // 검색어가 분야 이름과 겹치면 그 분야로 가는 링크를 함께 보여줍니다.
  const lowered = q.toLowerCase();
  const categories = q
    ? getRightsCategories().filter((category) =>
        Object.values(category.name).some((name) => {
          const value = typeof name === 'string' ? name.toLowerCase() : '';
          return value.length > 0 && (value.includes(lowered) || lowered.includes(value));
        }),
      )
    : [];

  const emergency = q ? detectEmergency(q) : false;

  return (
    <>
      <PageHeader kicker={t.rights.title} title={t.search.title} subtitle={t.search.subtitle} />

      <Section>
        <div className="max-w-3xl">
          <RightsSearchForm locale={locale} defaultValue={q} />
        </div>

        {/* 검색어가 위험한 상황을 뜻하면 긴급 안내를 먼저 보여줍니다. (검색 결과는 그대로 보여줍니다) */}
        {emergency && (
          <div
            role="note"
            className="mt-6 max-w-3xl rounded-[var(--radius-control)] border-l-4 border-[var(--color-danger-700)] bg-[var(--color-danger-50)] px-4 py-3.5"
          >
            <p className="font-bold text-[var(--color-danger-700)]">{t.search.emergencyTitle}</p>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{t.home.emergencyBanner}</p>
            <Link
              href={`/${locale}/emergency`}
              className="mt-2 inline-flex items-center gap-1 text-[15px] font-bold text-[var(--color-danger-700)] underline underline-offset-2"
            >
              {t.nav.emergency} <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        )}

        <div className="mt-10">
          {!q ? (
            <p className="text-[15px] text-ink-500">{t.search.emptyQuery}</p>
          ) : (
            <>
              <h2 className="lr-h2">
                {t.search.resultsFor.replace('{q}', q)}{' '}
                <span className="text-lg font-semibold text-ink-500">{t.search.resultCount.replace('{n}', String(total))}</span>
              </h2>

              {categories.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-ink-500">{t.search.categoriesTitle}</p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <Link href={`/${locale}/rights/${category.id}`} className="lr-btn lr-btn-ghost lr-btn-sm lr-press">
                          {pick(category.name, locale)} <Icon name="arrow-right" size={16} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {direct.length > 0 && (
                <section className="mt-8">
                  <h3 className="text-lg font-bold text-ink-900">{t.search.directTitle}</h3>
                  <ArticleGrid articles={direct} locale={locale} />
                </section>
              )}

              {possible.length > 0 && (
                <section className="mt-10">
                  <h3 className="text-lg font-bold text-ink-900">{t.search.possibleTitle}</h3>
                  <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-ink-500">{t.search.possibleNote}</p>
                  <ArticleGrid articles={possible} locale={locale} />
                </section>
              )}

              {similar.length > 0 && (
                <section className="mt-10">
                  <h3 className="text-lg font-bold text-ink-900">{t.search.similarTitle}</h3>
                  <ArticleGrid articles={similar} locale={locale} />
                </section>
              )}

              {total === 0 && (
                <div className="lr-card mt-6 max-w-3xl p-6 text-center">
                  <p className="text-[15px] leading-relaxed text-ink-700">{t.search.empty}</p>
                  <Link href={`/${locale}/rights`} className="lr-btn lr-btn-ghost lr-press mt-4">
                    {t.search.browseAll} <Icon name="arrow-right" size={16} />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </Section>
    </>
  );
}
