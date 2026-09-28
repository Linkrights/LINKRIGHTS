// 커뮤니티 로그인: 구글 로그인 화면으로 보냅니다. (승인 절차 없이 바로 들어올 수 있습니다)
// 돌아올 주소(redirect_uri)는 지금 접속한 주소를 그대로 씁니다. Google Cloud Console 에도 같은 주소를 등록해야 합니다.

import { NextResponse } from 'next/server';
import { STATE_COOKIE, authorizeUrl, createState, hasCommunityAuth } from '@/lib/googleAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 구글에서 돌아올 주소. Google Cloud Console 의 "승인된 리디렉션 URI" 와 같아야 합니다. */
function callbackUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/api/community/callback`;
}

export async function GET(request: Request) {
  if (!hasCommunityAuth()) return NextResponse.json({ error: 'disabled' }, { status: 503 });

  const url = new URL(request.url);
  // 로그인한 뒤 돌아올 사이트 안 주소 (바깥 주소로는 보내지 않습니다)
  const next = url.searchParams.get('next') ?? '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  const state = createState();
  const response = NextResponse.redirect(authorizeUrl(callbackUrl(request), state.value));
  response.cookies.set(STATE_COOKIE, `${state.value}|${safeNext}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: state.maxAge,
  });
  return response;
}
