// 주소창에 https://사이트주소/ 만 입력했을 때 무엇을 보여줄지 정합니다.
//
// - 처음 온 사람: 언어를 고르는 화면을 보여줍니다. (주소는 / 그대로, 화면만 /언어/welcome 을 그립니다)
//   고른 언어는 /start/언어 에서 이 브라우저에 저장합니다.
// - 전에 언어를 고른 사람: 저장된 언어 페이지로 바로 보냅니다.
// - 언어를 고르는 화면에서는 브라우저 언어를 먼저 보여주기만 하고, 마음대로 정하지 않습니다.

import { NextResponse, type NextRequest } from 'next/server';

const LOCALES = ['ko', 'en', 'zh', 'vi'] as const;
type Locale = (typeof LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'ko';
/** 고른 언어를 기억해 두는 이름 (이 브라우저에만 저장되고, 서버로 보내는 개인정보가 아닙니다) */
export const LOCALE_COOKIE = 'lr-locale';

function isLocale(value: string | undefined): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** 브라우저가 알려주는 언어 (고르는 화면에서 "이 언어일까요?" 표시에만 씁니다) */
function detectLocale(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.toLowerCase().split(',')) {
    const tag = part.split(';')[0].trim();
    if (tag.startsWith('ko')) return 'ko';
    if (tag.startsWith('en')) return 'en';
    if (tag.startsWith('zh')) return 'zh';
    if (tag.startsWith('vi')) return 'vi';
  }
  return DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const url = request.nextUrl.clone();

  // 전에 언어를 고른 적이 있으면 그 언어로 바로 보냅니다.
  if (isLocale(saved)) {
    url.pathname = `/${saved}`;
    return NextResponse.redirect(url);
  }

  // 처음이면 언어를 고르는 화면을 보여줍니다. (주소는 그대로 / 입니다)
  url.pathname = `/${detectLocale(request.headers.get('accept-language'))}/welcome`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: '/',
};
