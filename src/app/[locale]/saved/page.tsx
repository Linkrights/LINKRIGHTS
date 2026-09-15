// 저장한 권리정보 페이지입니다. (/ko/saved)
// 목록은 이 브라우저에만 저장되어 있으므로 검색엔진에는 노출하지 않습니다.

import type { Metadata } from 'next';
import { SavedList } from '@/components/SavedList';
import { Notice, PageHeader, Section } from '@/components/Section';
import { articleHref, getArticles, getCategory, resolveArticle } from '@/lib/content';
import { getMessages, pick, toLocale } from '@/lib/i18n';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const t = getMessages(toLocale(rawLocale));
  return { title: t.saved.title, description: t.saved.subtitle, robots: { index: false, follow: true } };
}

export default async function SavedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);

  const articles = getArticles().map((article) => {
    const { body } = resolveArticle(article, locale);
    const category = getCategory(article.category);
    return {
      id: article.id,
      title: body.title,
      summary: body.summary,
      category: category ? pick(category.name, locale) : '',
      href: articleHref(locale, article),
    };
  });

  return (
    <>
      <PageHeader title={t.saved.title} subtitle={t.saved.subtitle} />
      <Section>
        <div className="mx-auto max-w-3xl space-y-6">
          <Notice title={t.saved.noticeTitle} body={t.saved.notice} />
          <SavedList
            articles={articles}
            rightsHref={`/${locale}/rights`}
            labels={{
              empty: t.saved.empty,
              emptyCta: t.saved.emptyCta,
              remove: t.saved.remove,
              clearAll: t.saved.clearAll,
              count: t.saved.count,
            }}
          />
        </div>
      </Section>
    </>
  );
}
