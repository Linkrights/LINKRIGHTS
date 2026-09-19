// 질문 게시판 글 하나 페이지입니다. (예: /ko/qna/notice-how-to-ask)
//
// 화면 구성: 목록으로 → 제목·글쓴이·날짜 → 질문 → 운영팀의 답(또는 준비 중 안내)
//           → 함께 볼 권리정보·기관 → 참고 안내 → 질문 보내기(작성 가이드)

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleCard } from '@/components/ArticleCard';
import { Icon } from '@/components/Icon';
import { OrgCard } from '@/components/OrgCard';
import { QnaGuide } from '@/components/QnaGuide';
import { Notice } from '@/components/Section';
import { getArticle, getCategory, getQnaPost, getQnaPosts, getSite, resolveOrganizations } from '@/lib/content';
import { LOCALES, formatDate, getMessages, isFallback, pick, toLocale } from '@/lib/i18n';
import type { RightsArticle } from '@/lib/types';

export const dynamicParams = false;

export function generateStaticParams() {
  const posts = getQnaPosts();
  return LOCALES.flatMap((locale) => posts.map((post) => ({ locale, id: post.id })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = toLocale(rawLocale);
  const post = getQnaPost(id);
  if (!post) return {};
  return { title: pick(post.title, locale), description: pick(post.question, locale).slice(0, 150) };
}

/** 줄바꿈으로 나눈 문단을 그립니다. (글에는 HTML 을 쓰지 않습니다) */
function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line, index) => (
          <p key={index} className={index === 0 ? '' : 'mt-3'}>
            {line}
          </p>
        ))}
    </>
  );
}

export default async function QnaPostPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale = toLocale(rawLocale);
  const post = getQnaPost(id);
  if (!post) notFound();

  const t = getMessages(locale);
  const site = getSite();
  const category = post.category ? getCategory(post.category) : undefined;
  const articles = (post.articles ?? []).map((articleId) => getArticle(articleId)).filter((a): a is RightsArticle => Boolean(a));
  const orgs = resolveOrganizations(post.organizations ?? []);
  const answer = post.answer ? pick(post.answer, locale) : '';
  const fallback = isFallback(post.title, locale) || (post.answer ? isFallback(post.answer, locale) : false);

  return (
    <>
      <header className="border-b border-[var(--color-line)] bg-white">
        <div className="lr-container-narrow py-8 sm:py-12">
          <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
            <Link href={`/${locale}/qna`} className="font-semibold text-brand-700 hover:underline">
              {t.qna.title}
            </Link>
          </nav>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {post.kind === 'notice' && (
              <span className="rounded-full bg-navy-900 px-2.5 py-1 text-xs font-bold text-white">{t.qna.notice}</span>
            )}
            {category && <span className="text-sm font-semibold text-brand-700">{pick(category.name, locale)}</span>}
          </div>
          <h1 className="lr-h1 mt-2">{pick(post.title, locale)}</h1>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
            <span>{pick(post.author, locale)}</span>
            <span>
              {t.qna.askedAt} {formatDate(post.asked_at, locale)}
            </span>
            {post.answered_at && (
              <span>
                {t.qna.answeredAt} {formatDate(post.answered_at, locale)}
              </span>
            )}
          </p>

          {fallback && (
            <div className="mt-5">
              <Notice title={t.common.notTranslatedTitle} body={t.common.notTranslatedBody} />
            </div>
          )}
        </div>
      </header>

      <article className="lr-container-narrow space-y-10 py-10 sm:py-14">
        {/* 질문 */}
        <section className="rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink-900">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-900 text-[13px] font-bold text-white">
              Q
            </span>{' '}
            {t.qna.questionHeading}
          </h2>
          <div className="mt-3 text-[16px] leading-relaxed text-ink-900">
            <Paragraphs text={pick(post.question, locale)} />
          </div>
        </section>

        {/* 답 */}
        {answer ? (
          <section className="rounded-[var(--radius-card)] border-2 border-navy-900 bg-white p-5 sm:p-6">
            <h2 className="flex flex-wrap items-center gap-2 text-base font-bold text-ink-900">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-[13px] font-bold text-white">
                A
              </span>{' '}
              {t.qna.answerHeading}
              {post.answered_by && (
                <span className="text-sm font-semibold text-ink-500">{pick(post.answered_by, locale)}</span>
              )}
            </h2>
            <div className="mt-3 text-[16px] leading-relaxed text-ink-700">
              <Paragraphs text={answer} />
            </div>
          </section>
        ) : (
          <Notice title={t.qna.waitingTitle} body={t.qna.waitingBody} />
        )}

        {/* 함께 볼 권리정보 */}
        {articles.length > 0 && (
          <section>
            <h2 className="text-xl font-extrabold text-ink-900 sm:text-2xl">{t.qna.relatedArticles}</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {articles.map((article) => (
                <li key={article.id}>
                  <ArticleCard article={article} locale={locale} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 함께 볼 기관 */}
        {orgs.length > 0 && (
          <section>
            <h2 className="text-xl font-extrabold text-ink-900 sm:text-2xl">{t.qna.relatedOrgs}</h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {orgs.map((org) => (
                <li key={org.id}>
                  <OrgCard org={org} locale={locale} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-[13px] leading-relaxed text-ink-500">{t.footer.notAdvice}</p>

        <QnaGuide locale={locale} contactEmail={site.contactEmail} />

        <Link href={`/${locale}/qna`} className="lr-btn lr-btn-ghost lr-press">
          <Icon name="arrow-right" size={18} className="rotate-180" /> {t.qna.backToList}
        </Link>
      </article>
    </>
  );
}
