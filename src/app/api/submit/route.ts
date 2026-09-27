// 이용자가 사이트에서 보낸 글(질문·참여 문의·정보 수정 제보)을 받는 곳입니다.
//
// 받는 것: 종류, 세부 구분, 화면 언어, 제목, 내용, 답장 받을 곳(질문은 비워도 됩니다).
// 받지 않는 것: 그 밖의 어떤 값도 받지 않습니다. 접속 기록(IP)은 횟수를 세는 데에만 쓰고 저장하지 않습니다.
//
// 보낸 글은 운영팀이 관리자 페이지에서 확인하기 전까지 사이트 어디에도 보이지 않습니다.
// 데이터베이스가 연결되어 있지 않으면(환경변수 없음) 받지 않고, 화면은 메일 주소를 안내합니다.

import { NextResponse } from 'next/server';
import { hasDb, insertSubmission } from '@/lib/db';
import { LOCALES } from '@/lib/i18n';
import { checkLimits } from '@/lib/rateLimit';
import { validateSubmission } from '@/lib/submissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: Request) {
  if (!hasDb()) return NextResponse.json({ error: 'disabled' }, { status: 503 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'payload' }, { status: 400 });
  }

  const checked = validateSubmission(payload, LOCALES);
  if (!checked.ok) {
    // 자동 프로그램(보이지 않는 칸을 채운 경우)에는 성공한 것처럼 보여주고 저장하지 않습니다.
    if (checked.reason === 'bot') return NextResponse.json({ ok: true, id: 0 });
    return NextResponse.json({ error: checked.reason }, { status: 400 });
  }

  // 같은 사람이 짧은 시간에 너무 많이 보내는 것을 막습니다. (AI 질문과 같은 계산)
  if (!checkLimits(clientIp(request)).ok) return NextResponse.json({ error: 'rate_limit' }, { status: 429 });

  try {
    const id = await insertSubmission(checked.value);
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('[submit] 저장하지 못했습니다:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'server' }, { status: 500 });
  }
}
