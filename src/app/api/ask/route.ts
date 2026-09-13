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
import { askOpenAi, buildContext, type ContextArticle } from '@/lib/openai';
import { checkLimits } from '@/lib/rateLimit';
import { buildAllowlist, scrub, scrubBlocks, type Allowlist } from '@/lib/sanitize';
import { findRelevantArticles, fallbackArticles } from '@/lib/search';
import type { AiAnswer, AskApiResponse, AskHistoryTurn, Locale, RightsBlock } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 질문 최대 길이. 길수록 비용이 늘어나므로 제한합니다. */
const MAX_QUESTION_LENGTH = 500;
const MAX_CONTEXT_ARTICLES = 4;
/**
 * 등록 키워드는 맞지 않고 일상 단어만 겹친 글("관련 낮음")을 넘기는 기준입니다.
 * 이런 글을 많이 넘기면 AI가 사용자의 상황을 그 글의 상황(예: 차별, 학교폭력)으로 단정하기 쉬워서
 * 점수가 MIN_WEAK_SCORE 이상인 글만, 최대 MAX_WEAK_ARTICLES 개까지 넘깁니다.
 * (1점은 "학교에서", "말을" 같은 흔한 단어 한두 개만 겹쳐도 나오는 점수라서 1.5점부터 넘깁니다.)
 */
const MIN_WEAK_SCORE = 1.5;
const MAX_WEAK_ARTICLES = 2;
/** 화면에 보여주는 기관 수. 많이 보여주기보다 관련 높은 곳만 보여줍니다. (긴급 안내 기관은 별도) */
const MAX_ORGANIZATIONS = 2;
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
  const matches = findRelevantArticles(searchText, 10);
  // 등록 키워드가 질문에 들어 있는 글은 "관련 높음", 일상 단어만 겹친 글은 "관련 낮음"으로 나눠
  // 관련 높은 글을 먼저, 관련 낮은 글은 조금만 넘기고, AI에게도 어느 쪽인지 알려줍니다.
  const strongMatches = matches.filter((m) => m.keywordHits.length > 0);
  const weakMatches = matches
    .filter((m) => m.keywordHits.length === 0 && m.score >= MIN_WEAK_SCORE)
    .slice(0, MAX_WEAK_ARTICLES);
  const contextItems: ContextArticle[] = [...strongMatches, ...weakMatches].slice(0, MAX_CONTEXT_ARTICLES).map((m) => ({
    article: m.article,
    match: m.keywordHits.length > 0 ? 'strong' : 'weak',
    matchedKeywords: m.keywordHits,
  }));
  const contextArticles = contextItems.map((item) => item.article);
  const categoryIds = getCategories()
    .filter((c) => c.kind === 'rights')
    .map((c) => c.id);

  const context = buildContext(contextItems, locale, organizations, categoryIds);

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
    organizations: (raw.organizations ?? [])
      .filter((id) => organizations.some((o) => o.id === id))
      .slice(0, MAX_ORGANIZATIONS),
    // CONTEXT 로 실제 보낸 글의 id 만 출처로 인정합니다.
    sources: (raw.sources ?? []).filter((id) => allowedArticleIds.has(id)),
    follow_up_question: scrub(raw.follow_up_question ?? '', allow),
    limitations: scrub(raw.limitations ?? '', allow),
  };

  // AI가 기관을 고르지 않았을 때는, 질문과 강하게 맞는 글이 있고 AI가 추가 질문을 하지 않은 경우에만
  // 그 글에 연결된 기관(긴급 전화 제외)을 대신 보여줍니다.
  // 상황이 불확실해서 AI가 먼저 질문한 경우에는 기관을 억지로 늘어놓지 않습니다.
  let orgIds = answer.organizations;
  const topStrong = contextItems.find((item) => item.match === 'strong');
  if (orgIds.length === 0 && topStrong && !answer.follow_up_question) {
    orgIds = topStrong.article.organizations
      .filter((id) => organizations.some((o) => o.id === id && o.category !== 'emergency'))
      .slice(0, MAX_ORGANIZATIONS);
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
