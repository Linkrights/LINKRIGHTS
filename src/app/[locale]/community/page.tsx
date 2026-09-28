// 이야기 나누기(커뮤니티) 목록 화면입니다. (/ko/community)
//
// 구글 계정으로 들어오면 별명으로 글을 쓰고 댓글을 달 수 있습니다. 승인 절차는 없습니다.
// 이름·이메일은 저장하지 않고, 신고가 쌓인 글은 자동으로 숨겨 운영팀이 확인합니다.
// 준비물(GOOGLE_CLIENT_ID 등)이 없으면 "준비 중" 안내만 보여줍니다. (docs/커뮤니티-설정.md)

import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { CommunityMe, CommunityWrite } from '@/components/CommunityClient';
import { Icon } from '@/components/Icon';
import { Notice, PageHeader, Section } from '@/components/Section';
import { BOARDS, type Board } from '@/lib/community';
import { getMember, listPosts } from '@/lib/communityDb';
import { hasDb } from '@/lib/db';
import { SESSION_COOKIE, hasCommunityAuth, readSession } from '@/lib/googleAuth';
import { formatDate, getMessages, toLocale } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const t = getMessages(toLocale(rawLocale));
  // 이용자가 쓴 글이 모이는 곳이라 검색 결과에는 올리지 않습니다. (robots.ts 에서도 막습니다)
  return { title: t.community.title, description: t.community.subtitle, robots: { index: false, follow: false } };
}

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ board?: string; login?: string; e?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const { board: rawBoard, login, e } = await searchParams;
  // 로그인이 실패한 단계 (정해 둔 값만 보여 줍니다)
  const failReason = ['nocode', 'state', 'token', 'save'].find((value) => value === e) ?? '';
  const locale = toLocale(rawLocale);
  const t = getMessages(locale);
  const c = t.community;
  const ready = hasCommunityAuth() && hasDb();
  const board: Board | 'all' = BOARDS.find((key) => key === rawBoard) ?? 'all';

  // 데이터베이스에 연결하지 못해도 화면은 열려야 합니다. (연결이 끊기면 "준비 중" 안내만 보여줍니다)
  const store = await cookies();
  const memberId = ready ? readSession(store.get(SESSION_COOKIE)?.value) : null;
  const member = memberId ? await getMember(memberId).catch(() => null) : null;
  const posts = ready ? await listPosts(board).catch(() => []) : [];

  const boardLabel: Record<string, string> = {
    all: c.boardAll,
    free: c.boardFree,
    ask: c.boardAsk,
    info: c.boardInfo,
  };

  return (
    <>
      <PageHeader title={c.title} subtitle={c.subtitle} />

      <Section>
        <div className="max-w-4xl space-y-6">
          {!ready ? (
            <Notice title={c.title} body={c.disabled} />
          ) : (
            <>
              {login === 'failed' && (
                <div>
                  <Notice title={c.loginFailed} body={c.loginNote} />
                  {/* 어느 단계에서 멈췄는지 짧게 남깁니다. 운영팀이 원인을 찾을 때 씁니다. (api/community/callback 참고) */}
                  {failReason && <p className="mt-2 text-[13px] text-ink-500">({failReason})</p>}
                </div>
              )}

              {/* 이야기 나눌 때 지키는 것 */}
              <section className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-surface-soft p-4 sm:p-5">
                <h2 className="text-[15px] font-bold text-ink-900">{c.rulesTitle}</h2>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-700">{c.rules}</p>
              </section>

              {member ? (
                <>
                  <CommunityMe labels={c} nickname={member.nickname} />
                  {member.banned ? (
                    <Notice title={c.banned} body={c.rules} />
                  ) : (
                    <CommunityWrite labels={c} locale={locale} board={board === 'all' ? 'free' : board} />
                  )}
                </>
              ) : (
                <div className="lr-card p-5 sm:p-6">
                  <a
                    href={`/api/community/login?next=${encodeURIComponent(`/${locale}/community`)}`}
                    className="lr-btn lr-btn-primary lr-press"
                  >
                    {c.loginCta} <Icon name="arrow-right" size={18} />
                  </a>
                  <p className="mt-3 text-[13px] leading-relaxed text-ink-500">{c.loginNote}</p>
                </div>
              )}

              {/* 묶음 고르기 */}
              <div className="flex flex-wrap gap-2">
                {(['all', ...BOARDS] as const).map((key) => (
                  <Link
                    key={key}
                    href={key === 'all' ? `/${locale}/community` : `/${locale}/community?board=${key}`}
                    className={`lr-btn lr-btn-sm ${board === key ? 'lr-btn-primary' : 'lr-btn-ghost'}`}
                  >
                    {boardLabel[key]}
                  </Link>
                ))}
              </div>

              {/* 글 목록 */}
              {posts.length === 0 ? (
                <p className="rounded-[var(--radius-control)] bg-surface-soft px-4 py-3.5 text-[15px] text-ink-700">
                  {c.empty}
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-line)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-line)] bg-white">
                  {posts.map((post) => (
                    <li key={post.id}>
                      <Link href={`/${locale}/community/${post.id}`} className="block px-4 py-4 hover:bg-brand-50 sm:px-5">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[13px] font-semibold text-brand-700">{boardLabel[post.board]}</span>
                          <span className="min-w-0 text-base font-bold leading-snug text-ink-900">{post.title}</span>
                        </span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-500">
                          <span>{post.nickname}</span>
                          <span>{formatDate(post.created_at.slice(0, 10), locale)}</span>
                          <span className="inline-flex items-center gap-1">
                            <Icon name="message" size={14} /> {c.comments.replace('{n}', String(post.comment_count))}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </Section>
    </>
  );
}
