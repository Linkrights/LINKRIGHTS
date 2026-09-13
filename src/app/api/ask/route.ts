// AI 질문을 처리하는 서버 코드입니다.
// 브라우저는 이 주소(/api/ask)로 질문만 보내고, OpenAI 키는 서버에만 있습니다.
//
// 처리 순서
//  1) 질문 길이 확인 (너무 길면 거절 → 비용 보호)
//  2) 긴급 키워드 확인 (걸리면 AI를 부르지 않고 즉시 긴급 안내)
//  3) 사용량 제한 확인 (같은 사람의 반복 요청, 하루 총량)
//  4) 근거 자료 고르기: 등록 키워드가 질문에 실제로 들어 있는 권리정보만 (맞는 자료가 없으면 "자료 없음"도 정상 결과)
//  5) AI 호출: 근거 자료와, 그 자료에 연결된 기관만 전달
//  6) 답변 검증: 근거 없는 권리, 연결되지 않은 기관, 등록되지 않은 번호·링크를 지우고 화면으로 보냄
//
// 개발 원칙
//  - 자료가 부족하면 답변을 억지로 완성하지 않는다.
//  - 검색 결과가 있다는 것과 관련성이 높다는 것은 다르다.
//  - 이전 AI 답변은 사실의 근거가 아니다.
//  - 기관과 법률정보는 실제 등록자료가 있을 때만 제공한다.
//
// 추가 질문: 브라우저가 이전 질문과 답변(history)을 함께 보내면 대화를 이어서 답합니다.
// 이전 대화는 상황 이해에만 쓰고, 근거 자료는 매번 새로 검색합니다.

import { NextResponse } from 'next/server';
import {
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
import { buildAllowlist, mentionsOrganization, phoneDigits, scrub, scrubBlocks, type Allowlist } from '@/lib/sanitize';
import { findRelevantArticles, fallbackArticles } from '@/lib/search';
import type { AiAnswer, AiRight, AskApiResponse, AskHistoryTurn, Locale, RightsBlock } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 질문 최대 길이. 길수록 비용이 늘어나므로 제한합니다. */
const MAX_QUESTION_LENGTH = 500;
/** AI에게 근거로 넘기는 권리정보 최대 수 */
const MAX_EVIDENCE_ARTICLES = 3;
/** 추가 질문 때 AI에게 함께 보내는 이전 대화 수. 많을수록 비용이 늘어나므로 최근 것만 보냅니다. */
const MAX_HISTORY_TURNS = 3;
/** 이전 답변의 문장 하나에 허용하는 최대 길이 */
const MAX_HISTORY_TEXT_LENGTH = 1000;
/** 화면에 보여주는 최대 개수 (긴급 안내 기관은 별도) */
const MAX_RIGHTS = 3;
const MAX_ACTIONS = 3;
const MAX_ORGANIZATIONS = 2;

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

function isBlock(value: unknown): value is RightsBlock {
  const block = value as Partial<RightsBlock> | null;
  return typeof block?.title === 'string' && typeof block?.body === 'string';
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

  // --- 4) 근거 자료 고르기 ---
  const organizations = getOrganizations();
  // 추가 질문이면 이전 대화를 정리해서 받습니다. 최초 질문이면 빈 목록입니다.
  const history = readHistory(rawHistory, buildAllowlist(organizations, getGroundingArticles()));
  // "그러면 증거는요?"처럼 짧은 추가 질문도 이어지는 주제를 찾을 수 있도록 이전 질문을 함께 검색합니다.
  const searchText = [question, ...history.map((turn) => turn.question)].join('\n');
  // 점수가 있다고 관련 자료인 것은 아닙니다. 등록 키워드가 질문에 실제로 들어 있는 글만 근거로 씁니다.
  const evidence = findRelevantArticles(searchText, 10)
    .filter((match) => match.keywordHits.length > 0)
    .slice(0, MAX_EVIDENCE_ARTICLES);
  const evidenceArticles = evidence.map((match) => match.article);
  // AI가 고를 수 있는 기관은 근거 자료에 연결된 기관뿐입니다. 근거 자료가 없으면 기관도 없습니다.
  // 긴급 전화(112·117·119 등)는 AI에게 고르게 하지 않고, 긴급 판단일 때만 서버가 긴급 안내로 붙입니다.
  const linkedOrganizations = resolveOrganizations(evidenceArticles.flatMap((article) => article.organizations)).filter(
    (org) => org.category !== 'emergency',
  );
  const categoryIds = getCategories()
    .filter((c) => c.kind === 'rights')
    .map((c) => c.id);

  const context = buildContext(
    evidence.map((match) => ({ article: match.article, matchedKeywords: match.keywordHits })),
    locale,
    linkedOrganizations,
    categoryIds,
  );

  // --- 5) AI 호출 ---
  const raw = await askOpenAi({ question, context, history });
  if (!raw) {
    return json({ ok: false, error: 'server', fallback: fallbackArticles(locale) }, 502);
  }

  // --- 6) 답변 검증 ---
  const evidenceIds = new Set(evidenceArticles.map((article) => article.id));

  // 권리: 근거 자료 id 가 붙은 것만 남깁니다. 근거 자료가 없으면 권리도 없습니다.
  const rights = (Array.isArray(raw.rights) ? raw.rights : [])
    .filter((right): right is AiRight => isBlock(right) && typeof right.source === 'string' && evidenceIds.has(right.source))
    .slice(0, MAX_RIGHTS);

  // 실제로 사용한 근거 자료 = AI가 출처로 적은 자료 + 권리에 붙은 자료 (보낸 근거 자료 안에서만)
  const citedIds = [...(Array.isArray(raw.sources) ? raw.sources : []), ...rights.map((right) => right.source)];
  const usedArticles = evidenceArticles.filter((article) => citedIds.includes(article.id));

  // 기관: 사용한 근거 자료에 연결된 기관만 보여줍니다. 긴급 전화(112·117·119 등)는 긴급 판단일 때만 따로 붙입니다.
  const candidates = resolveOrganizations(usedArticles.flatMap((article) => article.organizations)).filter(
    (org) => org.category !== 'emergency',
  );
  const aiActions = (Array.isArray(raw.actions) ? raw.actions : []).filter(isBlock);
  const chosenIds = (Array.isArray(raw.organizations) ? raw.organizations : []).filter((id) =>
    candidates.some((org) => org.id === id),
  );
  // "할 일"에서 이름을 말한 기관이 근거 자료와 연결된 곳이면 기관 카드로도 보여줍니다.
  const mentionedIds = candidates
    .filter((org) => aiActions.some((action) => mentionsOrganization(`${action.title} ${action.body}`, org)))
    .map((org) => org.id);
  const orgIds = [...new Set([...chosenIds, ...mentionedIds])].slice(0, MAX_ORGANIZATIONS);

  // AI가 위험 신호를 감지했다면 긴급 안내를 함께 보냅니다.
  const urgent = raw.urgency === 'urgent';
  const emergency = urgent ? buildEmergencyCard(locale) : null;
  const shownOrganizations = resolveOrganizations([...(emergency ? emergency.organizationIds : []), ...orgIds]);

  // 이 답변에서 허용하는 번호·링크: 화면에 보여주는 기관과, 사용한 근거 자료의 출처뿐입니다.
  const allow = buildAllowlist(shownOrganizations, usedArticles);
  // 화면에 보여주지 않는 기관의 이름이나 번호를 말하는 "할 일"은 뺍니다. (근거 없는 기관 추천 방지)
  const shownPhones = new Set(shownOrganizations.map((org) => phoneDigits(org)).filter(Boolean));
  const hiddenOrganizations = organizations.filter((org) => !shownOrganizations.some((shown) => shown.id === org.id));
  const actions = aiActions
    .filter(
      (action) =>
        !hiddenOrganizations.some((org) => mentionsOrganization(`${action.title} ${action.body}`, org, shownPhones)),
    )
    .slice(0, MAX_ACTIONS);

  const answer: AiAnswer = {
    category: categoryIds.includes(raw.category) ? raw.category : 'other',
    urgency: urgent ? 'urgent' : 'normal',
    summary: scrub(raw.summary ?? '', allow),
    rights: scrubBlocks(rights, allow),
    actions: scrubBlocks(actions, allow),
    organizations: orgIds,
    sources: usedArticles.map((article) => article.id),
    follow_up_question: scrub(raw.follow_up_question ?? '', allow),
    limitations: scrub(raw.limitations ?? '', allow),
  };

  // 출처: 실제로 사용한 등록 자료의 제목·검토일·공식 출처(발행기관, 주소)만 보여줍니다.
  const sources = usedArticles.map((article) => {
    const { body } = resolveArticle(article, locale);
    return {
      id: article.id,
      title: body.title,
      href: `/${locale}/rights/${article.category}/${article.id}`,
      reviewed_at: article.reviewed_at,
      sources: article.sources ?? [],
    };
  });

  return json({
    ok: true,
    mode: 'ai',
    answer,
    evidence: usedArticles.length > 0 ? 'found' : 'none',
    organizations: shownOrganizations,
    sources,
    emergency: emergency
      ? { title: emergency.title, message: emergency.message, steps: emergency.steps, note: emergency.note }
      : undefined,
  });
}
