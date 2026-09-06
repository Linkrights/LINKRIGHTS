// 주소창에 https://사이트주소/ 만 입력했을 때 어떤 언어 페이지로 보낼지 정합니다.
// 브라우저 언어를 확인해 보고, 지원하지 않는 언어면 한국어로 보냅니다.

import { NextResponse, type NextRequest } from 'next/server';

const LOCALES = ['ko', 'en', 'zh', 'vi'] as const;
const DEFAULT_LOCALE = 'ko';

function detectLocale(header: string | null): string {
  if (!header) return DEFAULT_LOCALE;
  const lower = header.toLowerCase();
  // 브라우저가 보내는 언어 목록을 앞에서부터 확인합니다.
  for (const part of lower.split(',')) {
    const tag = part.split(';')[0].trim();
    if (tag.startsWith('ko')) return 'ko';
    if (tag.startsWith('en')) return 'en';
    if (tag.startsWith('zh')) return 'zh';
    if (tag.startsWith('vi')) return 'vi';
  }
  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const locale = detectLocale(request.headers.get('accept-language'));
  const url = request.nextUrl.clone();
  url.pathname = `/${LOCALES.includes(locale as (typeof LOCALES)[number]) ? locale : DEFAULT_LOCALE}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: '/',
};
