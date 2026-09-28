// 커뮤니티에서 글·댓글을 쓰고 지우고 신고하는 곳입니다. (로그인한 사람만)
//
// POST /api/community  { action: 'post' | 'comment' | 'report' | 'remove' | 'nickname' | 'logout', ... }
// 한 곳에서 받고 action 으로 나눕니다. (화면이 단순해지고, 확인해야 할 곳도 한 군데입니다)

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { validateComment, validateNickname, validatePost } from '@/lib/community';
import { createComment, createPost, getMember, removeOwn, report, setNickname } from '@/lib/communityDb';
import { hasDb } from '@/lib/db';
import { SESSION_COOKIE, hasCommunityAuth, readSession } from '@/lib/googleAuth';
import { LOCALES } from '@/lib/i18n';
import { checkLimits } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: Request) {
  if (!hasCommunityAuth() || !hasDb()) return NextResponse.json({ error: 'disabled' }, { status: 503 });

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'payload' }, { status: 400 });
  }

  const store = await cookies();
  const memberId = readSession(store.get(SESSION_COOKIE)?.value);

  // 로그아웃은 로그인 상태가 아니어도 받습니다.
  if (payload.action === 'logout') {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    return response;
  }

  if (!memberId) return NextResponse.json({ error: 'login' }, { status: 401 });
  const member = await getMember(memberId);
  if (!member) return NextResponse.json({ error: 'login' }, { status: 401 });
  if (member.banned) return NextResponse.json({ error: 'banned' }, { status: 403 });

  // 같은 사람이 짧은 시간에 너무 많이 올리지 못하게 합니다.
  if (!checkLimits(`community:${clientIp(request)}`).ok) return NextResponse.json({ error: 'rate_limit' }, { status: 429 });

  try {
    switch (payload.action) {
      case 'post': {
        const checked = validatePost(payload, LOCALES);
        if (!checked.ok) return NextResponse.json({ error: checked.reason }, { status: 400 });
        const id = await createPost(memberId, checked.value);
        return NextResponse.json({ ok: true, id });
      }
      case 'comment': {
        const postId = Number(payload.postId);
        if (!Number.isInteger(postId) || postId <= 0) return NextResponse.json({ error: 'id' }, { status: 400 });
        const checked = validateComment(payload);
        if (!checked.ok) return NextResponse.json({ error: checked.reason }, { status: 400 });
        const id = await createComment(memberId, postId, checked.value);
        return NextResponse.json({ ok: true, id });
      }
      case 'report': {
        const id = Number(payload.id);
        const kind = payload.kind === 'comment' ? 'comment' : 'post';
        if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'id' }, { status: 400 });
        const count = await report(kind, id, memberId);
        return NextResponse.json({ ok: true, reports: count });
      }
      case 'remove': {
        const id = Number(payload.id);
        const kind = payload.kind === 'comment' ? 'comment' : 'post';
        if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'id' }, { status: 400 });
        const done = await removeOwn(kind, id, memberId);
        return NextResponse.json({ ok: done }, { status: done ? 200 : 403 });
      }
      case 'nickname': {
        const checked = validateNickname(payload.nickname);
        if (!checked.ok) return NextResponse.json({ error: checked.reason }, { status: 400 });
        await setNickname(memberId, checked.value);
        return NextResponse.json({ ok: true, nickname: checked.value });
      }
      default:
        return NextResponse.json({ error: 'action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[community] 처리하지 못했습니다:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
