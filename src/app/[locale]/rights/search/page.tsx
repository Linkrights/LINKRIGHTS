// 권리정보 검색 결과 페이지입니다. (예: /ko/rights/search?q=월급)
//
// AI 질문(/api/ask)과 같은 검색 방법(search.ts 의 findEvidence)을 쓰지만, AI를 부르지 않고 등록된 권리정보만 보여줍니다.
//  - 찾은 권리정보: 등록 키워드나 상황 사전에서 검색어와 직접 맞는 글
//  - 상황에 따라 관련될 수 있는 정보: 조건이 맞을 때만 해당되는 글 (안내 문구와 함께)
//  - 둘 다 없으면 비슷한 낱말이 들어 있는 글과 관련 분야를 보여줍니다.
// 권리정보 말고도 검색어와 연결된 체크리스트·질문게시판 글·도움받을 곳을 유형 이름([권리정보] [체크리스트] [질문게시판])과 함께 보여줍니다.
//  (체크리스트·질문게시판은 contentSearch.ts, 도움받을 곳은 찾은 권리정보에 등록된 기관만)
// 인기 검색어나 조회수는 실제 자료가 없으므로 만들지 않고, 검색어도 저장하지 않습니다.
// 검색어가 주소에 들어가는 페이지이므로 검색엔진에 올리지 않습니다.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import { Icon } from '@/components/Icon';
import { NoResultHelp } from '@/components/NoResultHelp';
import { MAX_SEARCH_LENGTH, RightsSearchForm } from '@/components/RightsSearchForm';
import { PageHeader, Section } from '@/components/Section';
import { OrgCard } from '@/components/OrgCard';
import {
  articleHref,
  getCategory,
  getNationwideOrganizations,
  getRightsCategories,
  getSite,
  resolveArticle,
  resolveOrganizations,
} from '@/lib/content';
import { findChecklists, findQnaPosts } from '@/lib/contentSearch';
import { materialRequestHref } from '@/lib/materialRequest';
import { organizationArea } from '@/lib/regions';
import { detectEmergency } from '@/lib/emergency';
import { getMessages, pick, toLocale } from '@/lib/i18n';
import { findByRegisteredKeyword, findEvidence, findRelevantArticles, findSimilarArticles, searchSuggestions } from '@/lib/search';
import type { Locale, RightsArticle } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** 검색 결과 수 (AI 질문보다 넉넉하게 보여줍니다) */
const SEARCH_LIMITS = { direct: 12, possible: 6, total: 18 };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const t = getMessages(toLocale(rawLocale));
  return { title: t.search.title, description: t.search.subtitle, robots: { index: false, follow: true } };
}

/** 결과 묶음 제목 옆의 콘텐츠 유형 표시 */
function TypeBadge({ label }: { label: string }) {
  return <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">{label}</span>;
}

function ResultHeading({ type, title, note }: { type: string; title: string; note?: string }) {
  return (
    <div>
      <h3 className="flex flex-wrap items-center gap-2 text-lg font-bold text-ink-900">
        <TypeBadge label={type} /> <span>{title}</span>
      </h3>
      {note && <p className="mt-1 max-w-2xl text-[15px] leading-relaxed text-ink-500">{note}</p>}
    </div>
  );
}

function ArticleGrid({ articles, locale }: { articles: RightsArticle[]; locale: Locale }) {
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
  const matchedIds = new Set(matches.map((match) => match.article.id));
  // "알바", "비자" 처럼 한 낱말만 적은 경우: 등록된 키워드 안에 그 낱말이 들어 있는 글도 함께 찾습니다.
  // (AI 근거 찾기와는 별개의, 검색 화면 전용 보강입니다)
  const byKeyword = q ? findByRegisteredKeyword(q, SEARCH_LIMITS.direct).filter((article) => !matchedIds.has(article.id)) : [];
  const direct = [...matches.filter((match) => match.tier === 'direct').map((match) => match.article), ...byKeyword];
  const possible = matches.filter((match) => match.tier === 'possible').map((match) => match.article);
  // 직접 맞는 글이 없을 때만, 제목·요약에 비슷한 낱말이 있는 글을 참고로 보여줍니다.
  const shownIds = new Set([...matchedIds, ...byKeyword.map((article) => article.id)]);
  const similar =
    q && direct.length === 0 && possible.length === 0
      ? findRelevantArticles(q, 6)
          .filter((match) => match.score >= 1 && !shownIds.has(match.article.id))
          .map((match) => match.article)
      : [];
  // 찾은 권리정보와 연결된 체크리스트·질문게시판 글 (등록 자료만)
  const foundIds = new Set([...direct, ...possible].map((article) => article.id));
  const checklists = q ? findChecklists(q, locale, foundIds) : [];
  const qnaPosts = q ? findQnaPosts(q, locale, foundIds) : [];
  // 관련 도움받을 곳: 직접 찾은 권리정보에 등록된 기관 중 전국 기관 (긴급 번호는 위의 긴급 안내로)
  const linkedOrgs = resolveOrganizations([...new Set(direct.flatMap((article) => article.organizations))])
    .filter((org) => !org.emergency && organizationArea(org).nationwide)
    .slice(0, 3);
  const total = direct.length + possible.length + similar.length + checklists.length + qnaPosts.length;
  // 결과가 없을 때: 제목·상황·할 일에 비슷한 낱말이 있는 등록 권리정보(링크만)와, 누구나 이용할 수 있는 청소년 상담 기관(등록 기관)
  const similarLinks =
    q && total === 0
      ? findSimilarArticles(q, 3).map((article) => ({
          id: article.id,
          title: resolveArticle(article, locale).body.title,
          href: articleHref(locale, article),
        }))
      : [];
  const generalHelp = q && total === 0 ? getNationwideOrganizations().filter((org) => org.category === 'youth') : [];
  const materialHref = materialRequestHref(getSite().contactEmail, t.materialRequest);

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
          <RightsSearchForm locale={locale} defaultValue={q} suggestions={searchSuggestions(locale)} />
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
                  <ResultHeading type={t.search.typeArticle} title={t.search.directTitle} />
                  <ArticleGrid articles={direct} locale={locale} />
                </section>
              )}

              {possible.length > 0 && (
                <section className="mt-10">
                  <ResultHeading type={t.search.typeArticle} title={t.search.possibleTitle} note={t.search.possibleNote} />
                  <ArticleGrid articles={possible} locale={locale} />
                </section>
              )}

              {similar.length > 0 && (
                <section className="mt-10">
                  <ResultHeading type={t.search.typeArticle} title={t.search.similarTitle} />
                  <ArticleGrid articles={similar} locale={locale} />
                </section>
              )}

              {/* 체크리스트: 찾은 권리정보로 만든 것, 또는 제목·항목에 검색어가 들어 있는 것 */}
              {checklists.length > 0 && (
                <section className="mt-10">
                  <ResultHeading type={t.search.typeChecklist} title={t.search.checklistsTitle} />
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {checklists.map((checklist) => {
                      const body = checklist.i18n[locale] ?? checklist.i18n.ko;
                      const category = getCategory(checklist.category);
                      return (
                        <li key={checklist.id} className="lr-card lr-card-hover group relative flex flex-col p-5">
                          {category && <span className="text-sm font-semibold text-brand-700">{pick(category.name, locale)}</span>}{' '}
                          <h4 className="mt-1 text-[17px] font-extrabold leading-snug text-ink-900 group-hover:text-brand-800">
                            <Link
                              href={`/${locale}/checklists/${checklist.id}`}
                              className="after:absolute after:inset-0 after:rounded-[var(--radius-card)] after:content-['']"
                            >
                              {body.title}
                            </Link>
                          </h4>{' '}
                          <p className="mt-1.5 flex-1 text-[15px] leading-relaxed text-ink-500">{body.summary}</p>
                          <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                            <Icon name="check" size={16} /> {t.checklist.itemCount.replace('{n}', String(checklist.items.length))}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              {/* 질문게시판: 찾은 글이 있으면 보여주고, 없어도 게시판에서 묻는 길을 알려줍니다.
                  (검색 결과가 하나도 없을 때는 아래 "다음에 할 수 있는 일" 상자만 보여줍니다) */}
              {total > 0 && (
                <section className="mt-10">
                  <ResultHeading type={t.search.typeQna} title={qnaPosts.length > 0 ? t.search.qnaTitle : t.qna.title} />
                  {qnaPosts.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {qnaPosts.map((post) => (
                        <li key={post.id}>
                          <Link
                            href={`/${locale}/qna/${post.id}`}
                            className="lr-link inline-flex items-start gap-1.5 text-[15px] font-semibold"
                          >
                            <Icon name="arrow-right" size={16} className="mt-1 shrink-0" /> <span>{pick(post.title, locale)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] leading-relaxed text-ink-700">
                    <span>{t.search.qnaNote}</span>
                    <Link href={`/${locale}/qna`} className="lr-link inline-flex items-center gap-1 font-semibold">
                      {t.search.qnaCta} <Icon name="arrow-right" size={16} />
                    </Link>
                  </p>
                </section>
              )}

              {/* 관련 도움받을 곳: 찾은 권리정보에 등록된 기관만 + 지역별 찾기 */}
              {total > 0 && (
                <section className="mt-10">
                  <h3 className="text-lg font-bold text-ink-900">{t.search.orgsTitle}</h3>
                  {linkedOrgs.length > 0 && (
                    <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {linkedOrgs.map((org) => (
                        <li key={org.id}>
                          <OrgCard org={org} locale={locale} compact />
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link href={`/${locale}/organizations`} className="lr-btn lr-btn-ghost lr-btn-sm lr-press mt-4">
                    <Icon name="map-pin" size={16} /> {t.search.orgsMore}
                  </Link>
                </section>
              )}

              {/* 결과가 없을 때: "자료 없음"으로 끝내지 않고 다음에 할 수 있는 일을 보여줍니다. (등록 자료·기관만) */}
              {total === 0 && (
                <div className="mt-6 max-w-4xl">
                  <NoResultHelp
                    t={t}
                    locale={locale}
                    title={t.answerUi.noEvidenceTitle}
                    body={t.search.empty}
                    links={similarLinks}
                    generalHelp={generalHelp}
                    askHref={`/${locale}/ask`}
                    materialHref={materialHref}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Section>
    </>
  );
}
