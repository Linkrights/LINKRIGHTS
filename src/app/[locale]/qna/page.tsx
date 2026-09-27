// 질문 게시판(Q&A) 목록 페이지입니다. (/ko/qna)
//
// 화면 구성: 안내 → 질문 보내는 방법(작성 가이드) → 검색 → 공지·질문 목록
// 글은 content/qna.json 에 등록된 것만 보여줍니다. (운영팀이 검토해 올린 글)

import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { QnaBoard, type QnaRow } from '@/components/QnaBoard';
import { QnaGuide } from '@/components/QnaGuide';
import { Notice, PageHeader, Section } from '@/components/Section';
import { getCategory, getQnaPosts } from '@/lib/content';
import { listPublishedQuestions } from '@/lib/db';
import { LOCALES, formatDate, getMessages, pick, toLocale } from '@/lib/i18n';

// 사이트에서 보낸 질문에 운영팀이 답하면 5분 안에 이 목록에 나타납니다.
// (등록 글 content/qna.json 은 예전처럼 배포할 때 그대로 들어갑니다)
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const t = getMessages(toLocale(rawLocale));
  return { title: t.qna.title, description: t.qna.subtitle };
}

export default async function QnaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const posts = getQnaPosts();

  const rows: QnaRow[] = posts.map((post) => {
    const category = post.category ? getCategory(post.category) : undefined;
    return {
      id: post.id,
      href: `/${locale}/qna/${post.id}`,
      notice: post.kind === 'notice',
      title: pick(post.title, locale),
      author: pick(post.author, locale),
      date: formatDate(post.asked_at, locale),
      category: category ? pick(category.name, locale) : undefined,
      answered: Boolean(post.answer?.ko?.trim()),
      // 어떤 언어로 검색해도 같은 글을 찾을 수 있도록 등록된 모든 언어의 글을 넣습니다.
      search: [
        ...LOCALES.map((code) => post.title[code] ?? ''),
        ...LOCALES.map((code) => post.question[code] ?? ''),
        ...LOCALES.map((code) => post.answer?.[code] ?? ''),
        ...(category ? LOCALES.map((code) => category.name[code] ?? '') : []),
      ]
        .filter(Boolean)
        .join(' '),
    };
  });

  // 사이트에서 보내 주신 질문 가운데, 운영팀이 답하고 게시판에 올리기로 한 글만 함께 보여줍니다.
  // (이 화면 언어로 보낸 질문만 보여줍니다. 번역은 하지 않습니다)
  const sent = (await listPublishedQuestions()).filter((row) => row.locale === locale);
  const sentRows: QnaRow[] = sent.map((row) => ({
    id: `s-${row.id}`,
    href: `/${locale}/qna/s/${row.id}`,
    notice: false,
    title: row.title || row.body.replace(/\s+/g, ' ').slice(0, 60),
    author: t.qna.userAuthor,
    date: formatDate(row.created_at.slice(0, 10), locale),
    answered: Boolean(row.answer.trim()),
    search: [row.title, row.body, row.answer].filter(Boolean).join(' '),
  }));
  // 공지는 맨 위에 두고, 그 아래에 새로 답한 질문부터 보여줍니다.
  rows.splice(rows.filter((row) => row.notice).length, 0, ...sentRows);

  return (
    <>
      <PageHeader title={t.qna.title} subtitle={t.qna.subtitle} />

      <Section>
        <div className="max-w-4xl space-y-8">
          <Notice title={t.qna.howTitle} body={t.qna.how} />

          <QnaGuide locale={locale} />

          <QnaBoard locale={locale} rows={rows} />

          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--color-line)] pt-5 text-[15px] text-ink-500">
            <span>{t.qna.askAiNote}</span>
            <Link href={`/${locale}/ask`} className="lr-link inline-flex items-center gap-1 font-semibold">
              {t.nav.ask} <Icon name="arrow-right" size={16} />
            </Link>
          </p>
        </div>
      </Section>
    </>
  );
}
