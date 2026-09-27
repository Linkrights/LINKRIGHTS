// 관리자 로그인·로그아웃입니다. (비밀번호 하나, 환경변수 ADMIN_PASSWORD)

import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, checkPassword, createToken, hasAdmin } from '@/lib/adminAuth';
import { checkLimits } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: Request) {
  if (!hasAdmin()) return NextResponse.json({ error: 'disabled' }, { status: 503 });

  let payload: { password?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'payload' }, { status: 400 });
  }

  // 비밀번호를 계속 넣어 보는 것을 막습니다.
  if (!checkLimits(`admin:${clientIp(request)}`).ok) return NextResponse.json({ error: 'rate_limit' }, { status: 429 });

  if (!checkPassword(payload.password)) return NextResponse.json({ error: 'password' }, { status: 401 });

  const token = createToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: token.maxAge,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}
