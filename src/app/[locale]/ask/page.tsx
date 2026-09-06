// AI에게 질문하는 페이지입니다.

import type { Metadata } from 'next';
import { AskClient } from '@/components/AskClient';
import { PageHeader } from '@/components/Section';
import { getSite } from '@/lib/content';
import { getMessages, toLocale } from '@/lib/i18n';
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

  return (
    <>
      <PageHeader title={t.ask.title} subtitle={t.ask.subtitle} kicker="AI" />
      <AskClient
        locale={locale}
        examples={examples}
        initialQuestion={q.slice(0, 500)}
        fallbackLinks={fallbackArticles(locale)}
      />
    </>
  );
}
