// AI 질문을 처리하는 서버 코드입니다.
// 브라우저는 이 주소(/api/ask)로 질문만 보내고, OpenAI 키는 서버에만 있습니다.
//
// 처리 순서
//  1) 질문 길이 확인 (너무 길면 거절 → 비용 보호)
//  2) 긴급 키워드 확인 (걸리면 AI를 부르지 않고 즉시 긴급 안내)
//  3) 사용량 제한 확인 (같은 사람의 반복 요청, 하루 총량)
//  4) 등록된 권리정보 중 관련 있는 것만 골라 AI에게 전달
//  5) AI 답변에서 등록되지 않은 기관·번호·링크를 걸러내고 화면으로 보냄
//
// 추가 질문: 브라우저가 이전 질문과 답변(history)을 함께 보내면 대화를 이어서 답합니다.
// history 가 없으면 최초 질문이며, 이때 동작은 추가 질문 기능이 생기기 전과 같습니다.

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
import { buildAllowlist, scrub, scrubBlocks, type Allowlist } from '@/lib/sanitize';
import { findRelevantArticles, fallbackArticles } from '@/lib/search';
import type { AiAnswer, AskApiResponse, AskHistoryTurn, Locale, RightsBlock } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 질문 최대 길이. 길수록 비용이 늘어나므로 제한합니다. */
const MAX_QUESTION_LENGTH = 500;
const MAX_CONTEXT_ARTICLES = 4;
/** 추가 질문 때 AI에게 함께 보내는 이전 대화 수. 많을수록 비용이 늘어나므로 최근 것만 보냅니다. */
const MAX_HISTORY_TURNS = 3;
/** 이전 답변의 문장 하나에 허용하는 최대 길이 */
const MAX_HISTORY_TEXT_LENGTH = 1000;

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function json(body: AskApiResponse, status = 200) {
  return NextResponse.json(body, { status });
}

/** 문자열이면 앞뒤 공백을 지우고 길이를 제한합니다. 문자열이 아니면 빈 문자열을 돌려줍니다. */
function limitText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function limitBlocks(value: unknown, maxItems: number): RightsBlock[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, maxItems)
    .map((block) => ({
      title: limitText(block?.title, MAX_HISTORY_TEXT_LENGTH),
      body: limitText(block?.body, MAX_HISTORY_TEXT_LENGTH),
    }))
    .filter((block) => block.title || block.body);
}

/**
 * 추가 질문 때 브라우저가 보낸 이전 대화를 안전한 모양으로 정리합니다.
 * 브라우저에서 온 값은 바뀌었을 수 있으므로 모양·개수·길이를 제한하고,
 * 등록되지 않은 전화번호와 링크는 AI에게 보내기 전에 지웁니다.
 */
function readHistory(value: unknown, allow: Allowlist): AskHistoryTurn[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({
      question: limitText(turn?.question, MAX_QUESTION_LENGTH),
      answer: {
        summary: scrub(limitText(turn?.answer?.summary, MAX_HISTORY_TEXT_LENGTH), allow),
        rights: scrubBlocks(limitBlocks(turn?.answer?.rights, 3), allow),
        actions: scrubBlocks(limitBlocks(turn?.answer?.actions, 4), allow),
        follow_up_question: scrub(limitText(turn?.answer?.follow_up_question, MAX_HISTORY_TEXT_LENGTH), allow),
        limitations: scrub(limitText(turn?.answer?.limitations, MAX_HISTORY_TEXT_LENGTH), allow),
      },
    }))
    .filter((turn) => turn.question && turn.answer.summary);
}

export async function POST(request: Request) {
  let question = '';
  let locale: Locale = DEFAULT_LOCALE;
  let rawHistory: unknown;

  try {
    const payload = (await request.json()) as { question?: unknown; locale?: unknown; history?: unknown };
    question = typeof payload.question === 'string' ? payload.question.trim() : '';
    if (typeof payload.locale === 'string' && isLocale(payload.locale)) locale = payload.locale;
    rawHistory = payload.history;
  } catch {
    return json({ ok: false, error: 'server' }, 400);
  }

  if (!question) return json({ ok: false, error: 'empty' }, 400);
  if (question.length > MAX_QUESTION_LENGTH) return json({ ok: false, error: 'too_long' }, 400);

  // --- 2) 긴급상황: AI를 호출하지 않고 검토된 안내만 즉시 보여줍니다 (추가 질문도 똑같이 확인) ---
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

  // --- 3) 사용량 제한 (추가 질문도 질문 1번으로 셉니다) ---
  const limit = checkLimits(clientIp(request));
  if (!limit.ok) {
    return json({ ok: false, error: limit.reason, fallback: fallbackArticles(locale) }, 429);
  }

  // --- 4) 관련 권리정보 고르기 ---
  const organizations = getOrganizations();
  const allow = buildAllowlist(organizations, getGroundingArticles());
  // 추가 질문이면 이전 대화를 정리해서 받습니다. 최초 질문이면 빈 목록입니다.
  const history = readHistory(rawHistory, allow);
  // "그러면 증거는요?"처럼 짧은 추가 질문도 관련 글을 찾을 수 있도록 이전 질문을 함께 검색합니다.
  // 최초 질문이면 질문만으로 검색하므로 기존과 같습니다.
  const searchText = [question, ...history.map((turn) => turn.question)].join('\n');
  const matches = findRelevantArticles(searchText, MAX_CONTEXT_ARTICLES);
  const contextArticles = matches.map((m) => m.article);
  const categoryIds = getCategories()
    .filter((c) => c.kind === 'rights')
    .map((c) => c.id);

  const context = buildContext(contextArticles, locale, organizations, categoryIds);

  // --- 5) AI 호출 ---
  const raw = await askOpenAi({ question, context, history });
  if (!raw) {
    return json({ ok: false, error: 'server', fallback: fallbackArticles(locale) }, 502);
  }

  // --- 6) 답변 검증: 등록되지 않은 정보 제거 ---
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
