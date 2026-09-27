// 사이트에서 보내 주신 질문 한 건을 보여주는 화면입니다. (/ko/qna/s/12)
//
// 운영팀이 답하고 "게시판에 올리기"를 누른 글만 보입니다. 그 밖의 글은 없는 페이지로 처리합니다.
// 연락처는 화면에 가져오지 않습니다. (데이터베이스에서 아예 불러오지 않습니다)

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { Notice, PageHeader, Section } from '@/components/Section';
import { getPublishedQuestion } from '@/lib/db';
import { formatDate, getMessages, toLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const t = getMessages(toLocale(rawLocale));
  // 이용자가 보낸 글이므로 검색엔진에는 올리지 않습니다.
  return { title: t.qna.title, robots: { index: false, follow: true } };
}

export default async function SentQuestionPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);

  const number = Number(id);
  if (!Number.isInteger(number) || number <= 0) notFound();
  const post = await getPublishedQuestion(number);
  if (!post) notFound();

  const answered = Boolean(post.answer.trim());

  return (
    <>
      <PageHeader title={post.title || t.qna.questionHeading} subtitle={`${t.qna.userAuthor} · ${t.qna.askedAt} ${formatDate(post.created_at.slice(0, 10), locale)}`} />

      <Section>
        <div className="max-w-3xl space-y-6">
          <section className="lr-card p-5 sm:p-6">
            <h2 className="text-[15px] font-bold text-brand-700">{t.qna.questionHeading}</h2>
            <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed text-ink-900">{post.body}</p>
          </section>

          {answered ? (
            <section className="lr-card p-5 sm:p-6">
              <h2 className="text-[15px] font-bold text-brand-700">{t.qna.answerHeading}</h2>
              <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed text-ink-900">{post.answer}</p>
              {post.answered_at && (
                <p className="mt-4 text-sm text-ink-500">
                  {t.qna.answeredAt} {formatDate(post.answered_at.slice(0, 10), locale)}
                </p>
              )}
            </section>
          ) : (
            <Notice title={t.qna.waitingTitle} body={t.qna.waitingBody} />
          )}

          <Link href={`/${locale}/qna`} className="lr-link inline-flex items-center gap-1 text-[15px] font-semibold">
            <Icon name="arrow-right" size={16} className="rotate-180" /> {t.qna.backToList}
          </Link>
        </div>
      </Section>
    </>
  );
}
