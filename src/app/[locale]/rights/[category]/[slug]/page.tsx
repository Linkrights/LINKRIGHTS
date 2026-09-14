// 권리정보 상세 페이지입니다. (예: /ko/rights/labor/labor-unpaid-wages)
// 화면 구성: 이동 경로·제목·핵심 요약 → ① 이런 상황인가요 ② 알아두어야 할 권리 ③ 이렇게 해보세요
//           → 확인해 주세요 → ④ 도움받을 곳 → 출처 → ⑤ 함께 보면 좋은 정보

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';
import { Icon } from '@/components/Icon';
import { Notice } from '@/components/Section';
import { OrgCard } from '@/components/OrgCard';
import {
  getArticle,
  getArticles,
  getCategory,
  isStale,
  resolveArticle,
  resolveOrganizations,
} from '@/lib/content';
import { LOCALES, formatDate, getMessages, pick, toLocale } from '@/lib/i18n';

export const dynamicParams = false;

export function generateStaticParams() {
  const articles = getArticles();
  return LOCALES.flatMap((locale) =>
    articles.map((article) => ({ locale, category: article.category, slug: article.id })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = toLocale(rawLocale);
  const article = getArticle(slug);
  if (!article) return {};
  const { body } = resolveArticle(article, locale);
  return {
    title: body.title,
    description: body.summary,
    openGraph: { title: body.title, description: body.summary, type: 'article' },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; category: string; slug: string }>;
}) {
  const { locale: rawLocale, category: categoryId, slug } = await params;
  const locale = toLocale(rawLocale);
  const article = getArticle(slug);
  if (!article || article.category !== categoryId) notFound();

  const t = getMessages(locale);
  const { body, fallback } = resolveArticle(article, locale);
  const category = getCategory(article.category);
  const orgs = resolveOrganizations(article.organizations);
  const related = article.related.map((id) => getArticle(id)).filter((a): a is NonNullable<typeof a> => Boolean(a));
  const stale = isStale(article.reviewed_at);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: body.title,
    description: body.summary,
    inLanguage: locale,
    dateModified: article.reviewed_at,
    isAccessibleForFree: true,
  };

  const sectionTitle = 'text-xl font-extrabold text-ink-900 sm:text-2xl';

  return (
    <>
      {/* 제목 영역 */}
      <header className="border-b border-[var(--color-line)] bg-white">
        <div className="lr-container-narrow py-8 sm:py-12">
          <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
            <Link href={`/${locale}/rights`} className="hover:text-brand-700 hover:underline">
              {t.rights.title}
            </Link>
            {category && (
              <>
                <Icon name="arrow-right" size={14} className="text-ink-300" />{' '}
                <Link
                  href={`/${locale}/rights/${category.id}`}
                  className="font-semibold text-brand-700 hover:underline"
                >
                  {pick(category.name, locale)}
                </Link>
              </>
            )}
          </nav>

          <h1 className="lr-h1 mt-4">{body.title}</h1>
          <p className="lr-lead mt-4">{body.summary}</p>
          <p className="mt-4 text-sm text-ink-500">
            {t.common.reviewedAt} {formatDate(article.reviewed_at, locale)}
          </p>

          {(fallback || stale) && (
            <div className="mt-5 space-y-3">
              {fallback && <Notice title={t.common.notTranslatedTitle} body={t.common.notTranslatedBody} />}
              {stale && <Notice tone="warn" title={t.common.staleTitle} body={t.common.staleBody} />}
            </div>
          )}
        </div>
      </header>

      <article className="lr-container-narrow space-y-12 py-10 sm:space-y-14 sm:py-14">
        {/* ① 이런 상황인가요? */}
        <section>
          <h2 className={sectionTitle}>{t.rights.situationHeading}</h2>
          <ul className="mt-5 space-y-3">
            {body.situations.map((situation) => (
              <li key={situation} className="flex gap-3 text-base leading-relaxed text-ink-900">
                <span className="mt-1 shrink-0 text-brand-600" aria-hidden="true">
                  <Icon name="check" size={18} />
                </span>{' '}
                <span>{situation}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ② 알아두어야 할 권리: 중요한 내용이므로 강조 상자로 보여줍니다 */}
        <section>
          <h2 className={sectionTitle}>{t.rights.rightsHeading}</h2>
          <ul className="mt-5 space-y-3">
            {body.rights.map((item) => (
              <li key={item.title} className="lr-callout">
                <h3 className="text-base font-bold text-ink-900">{item.title}</h3>{' '}
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ③ 이렇게 해보세요: 순서가 보이도록 번호와 선으로 나눕니다 */}
        <section>
          <h2 className={sectionTitle}>{t.rights.actionsHeading}</h2>
          <ol className="mt-5 divide-y divide-[var(--color-line)] rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white">
            {body.actions.map((item, index) => (
              <li key={item.title} className="flex gap-4 p-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-[15px] font-bold text-white">
                  {index + 1}
                  <span className="sr-only">.</span>
                </span>{' '}
                <div className="min-w-0 pt-1">
                  <h3 className="text-base font-bold text-ink-900">{item.title}</h3>{' '}
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {body.note && <Notice tone="warn" title={t.rights.noteHeading} body={body.note} />}

        {/* ④ 도움받을 수 있는 곳 */}
        {orgs.length > 0 && (
          <section>
            <h2 className={sectionTitle}>{t.rights.orgsHeading}</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {orgs.map((org) => (
                <li key={org.id}>
                  <OrgCard org={org} locale={locale} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 출처 */}
        {article.sources.length > 0 && (
          <section className="border-t border-[var(--color-line)] pt-8">
            <h2 className="text-base font-bold text-ink-900">{t.rights.sourcesHeading}</h2>
            <ul className="mt-3 space-y-2">
              {article.sources.map((source) => (
                <li key={source.url} className="text-[15px] leading-relaxed text-ink-700">
                  {source.publisher && <span className="text-ink-500">{source.publisher} · </span>}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${source.title} (${t.common.openInNew})`}
                    className="underline underline-offset-2 hover:text-brand-700"
                  >
                    {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ⑤ 함께 보면 좋은 정보 */}
        {related.length > 0 && (
          <section>
            <h2 className={sectionTitle}>{t.rights.relatedHeading}</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {related.map((item) => (
                <li key={item.id}>
                  <ArticleCard article={item} locale={locale} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 내 상황 질문하기 */}
        <div className="lr-panel border-brand-100 bg-brand-50 p-6 sm:p-8">
          <p className="text-base font-semibold leading-relaxed text-brand-900">{t.ask.subtitle}</p>
          <Link href={`/${locale}/ask`} className="lr-btn lr-btn-primary lr-press mt-4">
            {t.home.ctaAsk} <Icon name="arrow-right" size={18} />
          </Link>
        </div>
      </article>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
