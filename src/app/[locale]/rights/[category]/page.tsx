// 분야별 권리정보 목록 페이지입니다. (예: /ko/rights/labor)

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';
import { OrgCard } from '@/components/OrgCard';
import { PageHeader, Section } from '@/components/Section';
import { getArticlesByCategory, getCategory, getOrganizations, getRightsCategories } from '@/lib/content';
import { LOCALES, getMessages, pick, toLocale } from '@/lib/i18n';

export const dynamicParams = false;

export function generateStaticParams() {
  const categories = getRightsCategories();
  return LOCALES.flatMap((locale) => categories.map((category) => ({ locale, category: category.id })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, category: categoryId } = await params;
  const locale = toLocale(rawLocale);
  const category = getCategory(categoryId);
  if (!category) return {};
  return {
    title: pick(category.name, locale),
    description: pick(category.tagline, locale),
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale: rawLocale, category: categoryId } = await params;
  const locale = toLocale(rawLocale);
  const category = getCategory(categoryId);
  if (!category || category.kind !== 'rights') notFound();

  const t = getMessages(locale);
  const articles = getArticlesByCategory(categoryId);

  // 이 분야와 관련된 기관을 함께 보여줍니다. (등록된 기관 목록에서만 가져옵니다)
  const relatedOrgIds = new Set(articles.flatMap((article) => article.organizations));
  const orgs = getOrganizations().filter((org) => relatedOrgIds.has(org.id)).slice(0, 6);

  return (
    <>
      <PageHeader
        kicker={t.rights.title}
        title={pick(category.name, locale)}
        subtitle={pick(category.tagline, locale)}
      />

      <Section title={t.rights.categoryTitle}>
        {articles.length === 0 ? (
          <p className="lr-card p-6 text-center text-ink-500">{t.rights.empty}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <li key={article.id}>
                <ArticleCard article={article} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {orgs.length > 0 && (
        <Section tone="soft" title={t.rights.orgsHeading}>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((org) => (
              <li key={org.id}>
                <OrgCard org={org} locale={locale} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
