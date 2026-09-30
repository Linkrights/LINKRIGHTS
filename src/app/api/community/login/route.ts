// 커뮤니티 로그인: 고른 곳(구글·카카오·애플)의 로그인 화면으로 보냅니다. (승인 절차 없이 바로 들어올 수 있습니다)
// 돌아올 주소(redirect_uri)는 지금 접속한 주소를 그대로 씁니다. 각 개발자 화면에도 같은 주소를 등록해야 합니다.

import { NextResponse } from 'next/server';
import { STATE_COOKIE, authorizeUrl as googleAuthorizeUrl, createState } from '@/lib/googleAuth';
import { authorizeUrl as socialAuthorizeUrl, loginOrigin, providerReady, toProvider } from '@/lib/socialAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  // 어디로 로그인할지 (적지 않으면 구글)
  const provider = toProvider(url.searchParams.get('provider')) ?? 'google';
  if (!providerReady(provider)) return NextResponse.json({ error: 'disabled' }, { status: 503 });

  // 로그인한 뒤 돌아올 사이트 안 주소 (바깥 주소로는 보내지 않습니다)
  const next = url.searchParams.get('next') ?? '/';
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';

  // 미리보기 주소(linkrights-xxxxx.vercel.app)는 각 로그인 서비스에 등록할 수 없습니다.
  // 그런 주소에서 눌렀다면 정식 주소로 옮겨, 쪽지(쿠키)와 돌아올 주소가 같은 곳에 있게 합니다.
  const origin = loginOrigin(url.origin);
  if (origin !== url.origin) {
    const moved = new URL('/api/community/login', origin);
    moved.searchParams.set('provider', provider);
    moved.searchParams.set('next', safeNext);
    return NextResponse.redirect(moved);
  }

  /** 각 로그인 서비스에서 돌아올 주소. 개발자 화면의 "리디렉션 URI" 와 같아야 합니다. */
  const callbackUrl = `${origin}/api/community/callback`;
  const state = createState();
  const target =
    provider === 'google'
      ? googleAuthorizeUrl(callbackUrl, state.value)
      : socialAuthorizeUrl(provider, callbackUrl, state.value);

  const response = NextResponse.redirect(target);
  // 돌아왔을 때 같은 브라우저인지 확인하는 값 + 돌아갈 곳 + 어디로 로그인했는지
  response.cookies.set(STATE_COOKIE, `${state.value}|${safeNext}|${provider}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: state.maxAge,
  });
  return response;
}
