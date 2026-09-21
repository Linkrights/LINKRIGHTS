// AI에게 질문하는 페이지입니다.

import type { Metadata } from 'next';
import { AskClient } from '@/components/AskClient';
import { PageHeader } from '@/components/Section';
import { getGlossary, getNationwideOrganizations, getRightsCategories, getSite } from '@/lib/content';
import { getMessages, pick, toLocale } from '@/lib/i18n';
import { fallbackArticles } from '@/lib/search';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  return {
    title: t.ask.title,
    description: t.ask.subtitle,
    // 질문 내용이 주소에 남는 페이지이므로 검색 색인은 하지 않습니다.
    robots: { index: false, follow: true },
  };
}

export default async function AskPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const search = await searchParams;
  // 홈에서 넘어온 질문(?q=...)을 읽습니다.
  const q = typeof search.q === 'string' ? search.q : '';
  const t = getMessages(locale);
  const site = getSite();
  const examples = site.exampleQuestions[locale] ?? site.exampleQuestions.ko;
  // 자료가 없거나 답변을 만들지 못했을 때 보여줄, 누구나 이용할 수 있는 청소년 상담 기관 (AI가 고른 기관이 아닌 등록 기관)
  const generalHelp = getNationwideOrganizations().filter((org) => org.category === 'youth');
  const categoryNames = Object.fromEntries(getRightsCategories().map((category) => [category.id, pick(category.name, locale)]));

  return (
    <>
      <PageHeader title={t.ask.title} subtitle={t.ask.subtitle} />
      <AskClient
        locale={locale}
        examples={examples}
        initialQuestion={q.slice(0, 500)}
        fallbackLinks={fallbackArticles(locale)}
        glossaryTerms={getGlossary()}
        generalHelp={generalHelp}
        categoryNames={categoryNames}
      />
    </>
  );
}
