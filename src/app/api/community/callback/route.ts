// 구글에서 로그인을 마치고 돌아오는 곳입니다.
// 받은 code 를 계정 번호로 바꾸고, 그 번호를 한 방향으로 바꾼 값(sub_hash)으로 이용자를 찾거나 새로 만듭니다.
// 이름·이메일은 요청하지도, 저장하지도 않습니다.

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { findOrCreateMember } from '@/lib/communityDb';
import { hasDb } from '@/lib/db';
import { SESSION_COOKIE, STATE_COOKIE, createSession, exchangeCodeForSub, hashSub, hasCommunityAuth, verifyState } from '@/lib/googleAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (to: string) => NextResponse.redirect(new URL(to, url.origin));
  if (!hasCommunityAuth() || !hasDb()) return back('/');

  const store = await cookies();
  const saved = store.get(STATE_COOKIE)?.value ?? '';
  const [savedState, savedNext = '/'] = saved.split('|');
  const state = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code') ?? '';

  // 돌아온 값이 우리가 보낸 것이 맞는지 확인합니다. (다른 곳에서 보낸 요청을 막습니다)
  if (!code || !state || state !== savedState || !verifyState(savedState)) {
    const response = back(`${savedNext}?login=failed`);
    response.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 });
    return response;
  }

  try {
    const sub = await exchangeCodeForSub(code, `${url.origin}/api/community/callback`);
    if (!sub) return back(`${savedNext}?login=failed`);
    const member = await findOrCreateMember(hashSub(sub));
    const session = createSession(member.id);
    const response = back(savedNext);
    response.cookies.set(SESSION_COOKIE, session.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: session.maxAge,
    });
    response.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 });
    return response;
  } catch (error) {
    console.error('[community] 로그인 처리 실패:', error instanceof Error ? error.message : error);
    return back(`${savedNext}?login=failed`);
  }
}
