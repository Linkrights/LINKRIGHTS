// AI 질문을 처리하는 서버 코드입니다.
// 브라우저는 이 주소(/api/ask)로 질문만 보내고, OpenAI 키는 서버에만 있습니다.
//
// 처리 순서
//  1) 질문 길이 확인 (너무 길면 거절 → 비용 보호)
//  2) 긴급 키워드 확인 (걸리면 AI를 부르지 않고 즉시 긴급 안내)
//  3) 사용량 제한 확인 (같은 사람의 반복 요청, 하루 총량)
//  4) 등록된 권리정보 중 관련 있는 것만 골라 AI에게 전달
//  5) AI 답변에서 등록되지 않은 기관·번호·링크를 걸러내고 화면으로 보냄

import { NextResponse } from 'next/server';
import {
  getArticle,
  getCategories,
  getGroundingArticles,
  getOrganizations,
  resolveArticle,
  resolveOrganizations,
} from '@/lib/content';
import { buildEmergencyCard, detectEmergency } from '@/lib/emergency';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n';
import { askOpenAi, buildContext } from '@/lib/openai';
import { checkLimits } from '@/lib/rateLimit';
import { buildAllowlist, scrub, scrubBlocks } from '@/lib/sanitize';
import { findRelevantArticles, fallbackArticles } from '@/lib/search';
import type { AiAnswer, AskApiResponse, Locale } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 질문 최대 길이. 길수록 비용이 늘어나므로 제한합니다. */
const MAX_QUESTION_LENGTH = 500;
const MAX_CONTEXT_ARTICLES = 4;

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function json(body: AskApiResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  let question = '';
  let locale: Locale = DEFAULT_LOCALE;

  try {
    const payload = (await request.json()) as { question?: unknown; locale?: unknown };
    question = typeof payload.question === 'string' ? payload.question.trim() : '';
    if (typeof payload.locale === 'string' && isLocale(payload.locale)) locale = payload.locale;
  } catch {
    return json({ ok: false, error: 'server' }, 400);
  }

  if (!question) return json({ ok: false, error: 'empty' }, 400);
  if (question.length > MAX_QUESTION_LENGTH) return json({ ok: false, error: 'too_long' }, 400);

  // --- 2) 긴급상황: AI를 호출하지 않고 검토된 안내만 즉시 보여줍니다 ---
  if (detectEmergency(question)) {
    const card = buildEmergencyCard(locale);
    return json({
      ok: true,
      mode: 'emergency',
      answer: null,
      organizations: resolveOrganizations(card.organizationIds),
      sources: [],
      emergency: { title: card.title, message: card.message, steps: card.steps, note: card.note },
    });
  }

  // --- 3) 사용량 제한 ---
  const limit = checkLimits(clientIp(request));
  if (!limit.ok) {
    return json({ ok: false, error: limit.reason, fallback: fallbackArticles(locale) }, 429);
  }

  // --- 4) 관련 권리정보 고르기 ---
  const matches = findRelevantArticles(question, MAX_CONTEXT_ARTICLES);
  const contextArticles = matches.map((m) => m.article);
  const organizations = getOrganizations();
  const categoryIds = getCategories()
    .filter((c) => c.kind === 'rights')
    .map((c) => c.id);

  const context = buildContext(contextArticles, locale, organizations, categoryIds);

  // --- 5) AI 호출 ---
  const raw = await askOpenAi({ question, context });
  if (!raw) {
    return json({ ok: false, error: 'server', fallback: fallbackArticles(locale) }, 502);
  }

  // --- 6) 답변 검증: 등록되지 않은 정보 제거 ---
  const allow = buildAllowlist(organizations, getGroundingArticles());
  const allowedArticleIds = new Set(contextArticles.map((a) => a.id));

  const answer: AiAnswer = {
    category: raw.category ?? 'other',
    urgency: raw.urgency === 'urgent' ? 'urgent' : 'normal',
    summary: scrub(raw.summary ?? '', allow),
    rights: scrubBlocks((raw.rights ?? []).slice(0, 3), allow),
    actions: scrubBlocks((raw.actions ?? []).slice(0, 4), allow),
    // 등록된 기관 id 만 통과시킵니다.
    organizations: (raw.organizations ?? []).filter((id) => organizations.some((o) => o.id === id)).slice(0, 4),
    // CONTEXT 로 실제 보낸 글의 id 만 출처로 인정합니다.
    sources: (raw.sources ?? []).filter((id) => allowedArticleIds.has(id)),
    follow_up_question: scrub(raw.follow_up_question ?? '', allow),
    limitations: scrub(raw.limitations ?? '', allow),
  };

  // AI가 기관을 하나도 고르지 않았다면, 참고한 글에 연결된 기관을 대신 보여줍니다.
  let orgIds = answer.organizations;
  if (orgIds.length === 0) {
    orgIds = contextArticles.flatMap((a) => a.organizations).slice(0, 4);
  }

  const sources = answer.sources
    .map((id) => getArticle(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map((article) => {
      const { body } = resolveArticle(article, locale);
      return {
        id: article.id,
        title: body.title,
        href: `/${locale}/rights/${article.category}/${article.id}`,
        reviewed_at: article.reviewed_at,
        sources: article.sources ?? [],
      };
    });

  // AI가 위험 신호를 감지했다면 긴급 안내를 함께 보냅니다.
  const emergency = answer.urgency === 'urgent' ? buildEmergencyCard(locale) : null;

  return json({
    ok: true,
    mode: 'ai',
    answer,
    organizations: resolveOrganizations(emergency ? [...emergency.organizationIds, ...orgIds] : orgIds),
    sources,
    emergency: emergency
      ? { title: emergency.title, message: emergency.message, steps: emergency.steps, note: emergency.note }
      : undefined,
  });
}
