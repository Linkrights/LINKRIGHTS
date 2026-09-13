// 권리정보 전체 목록 페이지입니다.

import type { Metadata } from 'next';
import Link from 'next/link';
import { ArticleCard } from '@/components/ArticleCard';
import { CategoryCard } from '@/components/CategoryCard';
import { Icon } from '@/components/Icon';
import { PageHeader, Section } from '@/components/Section';
import { getArticlesByCategory, getCategories, getRightsCategories } from '@/lib/content';
import { getMessages, pick, toLocale } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  return { title: t.rights.title, description: t.rights.subtitle };
}

export default async function RightsIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const categories = getCategories();

  return (
    <>
      <PageHeader title={t.rights.title} subtitle={t.rights.subtitle} />

      <Section>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <li key={category.id}>
              <CategoryCard category={category} locale={locale} />
            </li>
          ))}
        </ul>
      </Section>

      {getRightsCategories().map((category) => {
        const articles = getArticlesByCategory(category.id);
        if (articles.length === 0) return null;
        return (
          <Section
            key={category.id}
            tone="soft"
            title={pick(category.name, locale)}
            subtitle={pick(category.tagline, locale)}
            action={
              <Link href={`/${locale}/rights/${category.id}`} className="lr-btn lr-btn-ghost">
                {t.common.viewAll}
                <Icon name="arrow-right" size={16} />
              </Link>
            }
          >
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {articles.slice(0, 3).map((article) => (
                <li key={article.id}>
                  <ArticleCard article={article} locale={locale} />
                </li>
              ))}
            </ul>
          </Section>
        );
      })}
    </>
  );
}
