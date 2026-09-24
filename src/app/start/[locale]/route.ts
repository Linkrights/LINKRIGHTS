// 언어를 고르면 여기로 옵니다. 고른 언어를 이 브라우저에 저장하고 그 언어의 첫 화면으로 보냅니다.
// (자바스크립트 없이도 동작하도록 일반 링크 → 주소 이동으로 처리합니다)
//
// 저장하는 것: 고른 언어 하나뿐입니다. 이름·연락처 같은 개인정보는 저장하지 않습니다.
// 언어는 화면 위 언어 단추로 언제든 바꿀 수 있고, 바꾸면 저장된 값도 함께 바뀝니다.

import { NextResponse } from 'next/server';
import { isLocale } from '@/lib/i18n';

export const runtime = 'nodejs';
// 응답에 "이 브라우저에 언어 저장"이 들어가므로 미리 만들어 두지 않고 그때그때 응답합니다.
export const dynamic = 'force-dynamic';

/** 저장 기간: 1년 */
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function GET(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const target = isLocale(locale) ? locale : 'ko';
  const response = NextResponse.redirect(new URL(`/${target}`, request.url));
  response.cookies.set('lr-locale', target, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    httpOnly: false,
  });
  return response;
}
