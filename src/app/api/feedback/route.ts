// "이 답변(정보)이 도움이 되었나요?" 버튼이 보내는 곳입니다.
//
// 무엇을 받나요? (이것 외에는 아무것도 받지 않습니다)
//   helpful : 도움이 됐어요(true) / 아쉬워요(false)
//   kind    : ai(AI 답변) 또는 article(권리정보 페이지)
//   locale  : 어떤 언어 화면이었는지 (ko/en/zh/vi)
//   topic   : 등록된 분야 id 또는 등록된 권리정보 id. 등록되지 않은 값은 버립니다.
//   evidence: AI 답변이 등록 자료를 근거로 썼는지 (found/possible/none)
//
// 무엇을 받지 않나요?
//   질문 내용, 답변 내용, 이름·연락처 등 어떤 글자도 받지 않습니다. (위 다섯 가지 값만 받습니다)
//   따라서 이 기록만으로는 누가 무엇을 물었는지 알 수 없습니다.
//
// 어디에 남나요?
//   데이터베이스가 없으므로 서버 실행 기록(Vercel 로그)에 한 줄로만 남습니다.
//   "어떤 종류의 답변이 도움이 되었는지" 를 세어 보기 위한 것이며, 계정이나 사람과 연결하지 않습니다.
//
// 같은 사람이 계속 누르는 것을 막기 위해 AI 질문과 같은 사용량 제한을 씁니다.

import { NextResponse } from 'next/server';
import { getArticles, getCategories } from '@/lib/content';
import { isLocale } from '@/lib/i18n';
import { checkLimits } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KINDS = ['ai', 'article'] as const;
const EVIDENCE = ['found', 'possible', 'none'] as const;

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: Request) {
  let payload: { helpful?: unknown; kind?: unknown; locale?: unknown; topic?: unknown; evidence?: unknown };
  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  if (typeof payload.helpful !== 'boolean') return new NextResponse(null, { status: 400 });
  const kind = KINDS.find((value) => value === payload.kind);
  if (!kind) return new NextResponse(null, { status: 400 });

  // 사용량 제한(AI 질문과 같은 계산)을 함께 씁니다. 넘으면 조용히 받아들이고 세지 않습니다.
  if (!checkLimits(clientIp(request)).ok) return new NextResponse(null, { status: 204 });

  const locale = typeof payload.locale === 'string' && isLocale(payload.locale) ? payload.locale : 'ko';
  // 등록된 분야 id 또는 등록된 권리정보 id 만 남깁니다. (모르는 값은 그냥 버립니다)
  const allowedTopics = new Set([...getCategories().map((c) => c.id), ...getArticles().map((a) => a.id)]);
  const topic = typeof payload.topic === 'string' && allowedTopics.has(payload.topic) ? payload.topic : '-';
  const evidence = EVIDENCE.find((value) => value === payload.evidence) ?? '-';

  // 한 줄 기록: 질문·답변 내용은 들어 있지 않습니다.
  console.log(
    `[feedback] kind=${kind} helpful=${payload.helpful ? 'yes' : 'no'} locale=${locale} topic=${topic} evidence=${evidence}`,
  );

  return new NextResponse(null, { status: 204 });
}
