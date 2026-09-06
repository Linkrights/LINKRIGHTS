// 권리정보 상세 페이지입니다. (예: /ko/rights/labor/labor-unpaid-wages)
// 화면 구성: ① 이런 상황인가요 ② 알아두어야 할 권리 ③ 이렇게 해보세요 ④ 도움받을 곳 ⑤ 함께 보면 좋은 정보

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

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {/* 이동 경로 */}
      <nav aria-label="breadcrumb" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
        <Link href={`/${locale}/rights`} className="hover:text-brand-700 hover:underline">
          {t.rights.title}
        </Link>
        <span aria-hidden="true">/</span>
        {category && (
          <Link href={`/${locale}/rights/${category.id}`} className="hover:text-brand-700 hover:underline">
            {pick(category.name, locale)}
          </Link>
        )}
      </nav>

      <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl">
        {body.title}
      </h1>
      <p className="mt-3 text-base leading-relaxed text-ink-700 sm:text-lg">{body.summary}</p>
      <p className="mt-3 text-sm text-ink-300">
        {t.common.reviewedAt} {formatDate(article.reviewed_at, locale)}
      </p>

      <div className="mt-5 space-y-3">
        {fallback && <Notice title={t.common.notTranslatedTitle} body={t.common.notTranslatedBody} />}
        {stale && <Notice tone="warn" title={t.common.staleTitle} body={t.common.staleBody} />}
      </div>

      {/* ① 이런 상황인가요? */}
      <section className="mt-10">
        <h2 className="text-xl font-extrabold text-ink-900 sm:text-2xl">{t.rights.situationHeading}</h2>
        <ul className="mt-4 space-y-2">
          {body.situations.map((situation) => (
            <li key={situation} className="flex gap-3 rounded-xl bg-white p-4 text-[15px] leading-relaxed text-ink-900">
              <span className="mt-0.5 shrink-0 text-brand-500" aria-hidden="true">
                <Icon name="check" size={18} />
              </span>
              {situation}
            </li>
          ))}
        </ul>
      </section>

      {/* ② 알아두어야 할 권리 */}
      <section className="mt-10">
        <h2 className="text-xl font-extrabold text-ink-900 sm:text-2xl">{t.rights.rightsHeading}</h2>
        <ul className="mt-4 space-y-3">
          {body.rights.map((item) => (
            <li key={item.title} className="lr-card p-5">
              <h3 className="font-bold text-ink-900">{item.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-ink-700">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ③ 이렇게 해보세요 */}
      <section className="mt-10">
        <h2 className="text-xl font-extrabold text-ink-900 sm:text-2xl">{t.rights.actionsHeading}</h2>
        <ol className="mt-4 space-y-3">
          {body.actions.map((item, index) => (
            <li key={item.title} className="lr-card flex gap-4 p-5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <h3 className="font-bold text-ink-900">{item.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-ink-700">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {body.note && (
        <div className="mt-6">
          <Notice tone="warn" title={t.rights.noteHeading} body={body.note} />
        </div>
      )}

      {/* ④ 도움받을 수 있는 곳 */}
      {orgs.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold text-ink-900 sm:text-2xl">{t.rights.orgsHeading}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
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
        <section className="mt-10 rounded-2xl border border-[var(--color-line)] bg-white p-5">
          <h2 className="text-sm font-bold text-ink-900">{t.rights.sourcesHeading}</h2>
          <ul className="mt-2 space-y-1.5">
            {article.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-ink-700 underline underline-offset-2 hover:text-brand-700"
                >
                  <Icon name="external" size={14} />
                  {source.title}
                  {source.publisher && <span className="text-ink-300">· {source.publisher}</span>}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ⑤ 함께 보면 좋은 정보 */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold text-ink-900 sm:text-2xl">{t.rights.relatedHeading}</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((item) => (
              <li key={item.id}>
                <ArticleCard article={item} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 rounded-2xl bg-brand-50 p-5 text-center">
        <p className="text-[15px] font-semibold text-brand-800">{t.ask.subtitle}</p>
        <Link href={`/${locale}/ask`} className="lr-btn lr-btn-primary mt-3">
          <Icon name="sparkles" size={18} />
          {t.nav.ask}
        </Link>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </article>
  );
}
