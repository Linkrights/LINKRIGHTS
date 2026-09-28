// 구글에서 로그인을 마치고 돌아오는 곳입니다.
// 받은 code 를 계정 번호로 바꾸고, 그 번호를 한 방향으로 바꾼 값(sub_hash)으로 이용자를 찾거나 새로 만듭니다.
// 이름·이메일은 요청하지도, 저장하지도 않습니다.
//
// 잘 안 될 때: 어느 단계에서 멈췄는지 주소 끝에 ?login=failed&e=... 로 남기고, 자세한 내용은 로그에 적습니다.
//   e=nocode  구글이 code 를 주지 않았습니다. (이용자가 취소했거나 주소가 잘못됨)
//   e=state   로그인하러 갈 때 심은 쪽지가 돌아오지 않았습니다. (쿠키 차단, 10분 초과, 다른 브라우저에서 이어받음)
//   e=token   구글이 code 를 받아주지 않았습니다. (보안 비밀·리디렉션 주소 문제 — 로그에 이유가 적힙니다)
//   e=save    저장소에 이용자를 만들지 못했습니다. (DATABASE_URL 문제)

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

  /** 실패했을 때: 어디까지 갔는지 남기고 원래 화면으로 돌려보냅니다. */
  const fail = (step: string, detail = '') => {
    console.error(`[community] 로그인 실패 (${step})${detail ? ': ' + detail : ''}`);
    const separator = savedNext.includes('?') ? '&' : '?';
    const response = back(`${savedNext}${separator}login=failed&e=${step}`);
    response.cookies.set(STATE_COOKIE, '', { path: '/', maxAge: 0 });
    return response;
  };

  if (!code) return fail('nocode', url.searchParams.get('error') ?? '');
  // 돌아온 값이 우리가 보낸 것이 맞는지 확인합니다. (다른 곳에서 보낸 요청을 막습니다)
  if (!saved) return fail('state', '쿠키가 돌아오지 않았습니다.');
  if (!state || state !== savedState) return fail('state', '보낸 값과 돌아온 값이 다릅니다.');
  if (!verifyState(savedState)) return fail('state', '서명이 맞지 않거나 10분이 지났습니다.');

  let sub = '';
  try {
    sub = await exchangeCodeForSub(code, `${url.origin}/api/community/callback`);
  } catch (error) {
    return fail('token', error instanceof Error ? error.message : String(error));
  }
  if (!sub) return fail('token');

  try {
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
    return fail('save', error instanceof Error ? error.message : String(error));
  }
}
