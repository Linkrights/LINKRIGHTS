// 이야기 나누기: 글 하나와 댓글 화면입니다. (/ko/community/12)
// 숨겨진 글(신고가 쌓였거나 운영팀이 숨긴 글)은 없는 페이지로 처리합니다.

import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { CommunityComment, CommunityItemActions } from '@/components/CommunityClient';
import { Icon } from '@/components/Icon';
import { PageHeader, Section } from '@/components/Section';
import { getMember, getPost, listComments } from '@/lib/communityDb';
import { hasDb } from '@/lib/db';
import { SESSION_COOKIE, hasCommunityAuth, readSession } from '@/lib/googleAuth';
import { formatDate, getMessages, toLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const t = getMessages(toLocale(rawLocale));
  // 이용자가 쓴 글이므로 검색엔진에는 올리지 않습니다.
  return { title: t.community.title, robots: { index: false, follow: false } };
}

export default async function CommunityPostPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const c = t.community;
  if (!hasCommunityAuth() || !hasDb()) notFound();

  const number = Number(id);
  if (!Number.isInteger(number) || number <= 0) notFound();
  // 데이터베이스에 연결하지 못하면 없는 페이지로 보여 줍니다. (화면이 깨지지 않도록)
  const post = await getPost(number).catch(() => null);
  if (!post || post.hidden) notFound();

  const store = await cookies();
  const memberId = readSession(store.get(SESSION_COOKIE)?.value);
  const member = memberId ? await getMember(memberId).catch(() => null) : null;
  const comments = await listComments(number).catch(() => []);
  const boardLabel: Record<string, string> = { free: c.boardFree, ask: c.boardAsk, info: c.boardInfo };

  return (
    <>
      <PageHeader
        kicker={boardLabel[post.board] ?? c.boardFree}
        title={post.title}
        subtitle={`${post.nickname} · ${formatDate(post.created_at.slice(0, 10), locale)}`}
      />

      <Section>
        <div className="max-w-3xl space-y-6">
          <article className="lr-card p-5 sm:p-6">
            <p className="whitespace-pre-line text-[17px] leading-relaxed text-ink-900">{post.body}</p>
            {member && (
              <p className="mt-5 border-t border-[var(--color-line)] pt-4">
                <CommunityItemActions labels={c} kind="post" id={post.id} mine={member.id === post.member_id} backToList />
              </p>
            )}
          </article>

          <section>
            <h2 className="text-lg font-bold text-ink-900">{c.comments.replace('{n}', String(comments.length))}</h2>
            {comments.length === 0 ? (
              <p className="mt-3 rounded-[var(--radius-control)] bg-surface-soft px-4 py-3 text-[15px] text-ink-700">
                {c.commentEmpty}
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {comments.map((comment) => (
                  <li key={comment.id} className="lr-card p-4">
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-500">
                      <span className="font-semibold text-ink-900">{comment.nickname}</span>
                      <span>{formatDate(comment.created_at.slice(0, 10), locale)}</span>
                      {member && (
                        <CommunityItemActions
                          labels={c}
                          kind="comment"
                          id={comment.id}
                          mine={member.id === comment.member_id}
                        />
                      )}
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-ink-900">{comment.body}</p>
                  </li>
                ))}
              </ul>
            )}

            {member ? (
              member.banned ? null : (
                <CommunityComment labels={c} postId={post.id} />
              )
            ) : (
              <a
                href={`/api/community/login?next=${encodeURIComponent(`/${locale}/community/${post.id}`)}`}
                className="lr-btn lr-btn-primary lr-press mt-4"
              >
                {c.loginCta} <Icon name="arrow-right" size={18} />
              </a>
            )}
          </section>

          <Link href={`/${locale}/community`} className="lr-link inline-flex items-center gap-1 text-[15px] font-semibold">
            <Icon name="arrow-right" size={16} className="rotate-180" /> {c.backToList}
          </Link>
        </div>
      </Section>
    </>
  );
}
