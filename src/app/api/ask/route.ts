// AI 질문을 처리하는 서버 코드입니다.
// 브라우저는 이 주소(/api/ask)로 질문만 보내고, OpenAI 키는 서버에만 있습니다.
//
// 처리 순서
//  1) 질문 길이 확인 (너무 길면 거절 → 비용 보호)
//  2) 긴급 키워드 확인 (걸리면 AI를 부르지 않고 즉시 긴급 안내)
//  3) 사용량 제한 확인 (같은 사람의 반복 요청, 하루 총량)
//  4) 근거 자료 고르기 (search.ts 의 findEvidence)
//     - direct   : 등록 키워드가 질문에 있거나, 상황 사전에서 말만으로 상황이 분명한 표현
//     - possible : 사용자가 말하지 않은 조건이 맞을 때만 관련될 수 있는 자료 (AI는 조건부로만 안내)
//     맞는 자료가 없으면 "자료 없음"도 정상 결과입니다.
//  5) AI 호출: 근거 자료, 질문에서 알아챈 상황 힌트, 그 자료에 연결된 기관만 전달
//  6) 답변 검증: 근거 없는 권리, 연결되지 않은 기관, 등록되지 않은 번호·링크를 지우고 화면으로 보냄
//
// 개발 원칙
//  - 사용자가 한 가지 단서만 줘도 먼저 돕는다. 다만 자료가 없으면 답변을 억지로 완성하지 않는다.
//  - 검색 결과가 있다는 것과 관련성이 높다는 것은 다르다. (그래서 direct / possible 을 나눈다)
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
  localizeSource,
  resolveArticle,
  resolveOrganizations,
} from '@/lib/content';
import { buildEmergencyCard, detectEmergency } from '@/lib/emergency';
import { DEFAULT_LOCALE, isLocale } from '@/lib/i18n';
import { askOpenAi, buildContext, type ContextSituation } from '@/lib/openai';
import { checkLimits } from '@/lib/rateLimit';
import {
  buildAllowlist,
  dropLegalLabelSentences,
  dropSentencesMentioning,
  isConditional,
  isLegalLabel,
  mentionsOrganization,
  phoneDigits,
  scrub,
  scrubBlocks,
  type Allowlist,
} from '@/lib/sanitize';
import { findEvidence, findSimilarArticles, fallbackArticles } from '@/lib/search';
import type {
  AiAnswer,
  AiRight,
  AskApiResponse,
  AskHistoryTurn,
  Locale,
  Organization,
  RightsArticle,
  RightsBlock,
} from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 추론형 모델은 답이 늦을 수 있어 서버 함수가 기다리는 시간을 넉넉히 둡니다. (openai.ts 의 45초 제한보다 길게)
export const maxDuration = 60;

/** 질문 최대 길이. 길수록 비용이 늘어나므로 제한합니다. */
const MAX_QUESTION_LENGTH = 500;
/** AI에게 근거로 넘기는 권리정보 최대 수 (direct 최대 3개, possible 최대 2개, 합쳐서 최대 4개) */
const MAX_DIRECT_EVIDENCE = 3;
const MAX_POSSIBLE_EVIDENCE = 2;
const MAX_EVIDENCE_ARTICLES = 4;
/** 추가 질문 때 AI에게 함께 보내는 이전 대화 수. 많을수록 비용이 늘어나므로 최근 것만 보냅니다. */
const MAX_HISTORY_TURNS = 3;
/** 이전 답변의 문장 하나에 허용하는 최대 길이 */
const MAX_HISTORY_TEXT_LENGTH = 1000;
/** 화면에 보여주는 최대 개수 (긴급 안내 기관은 별도) */
const MAX_RIGHTS = 3;
const MAX_ACTIONS = 4;
const MAX_ORGANIZATIONS = 2;
/** possible 자료에만 연결된 기관은 AI가 직접 고른 경우에만, 최대 1곳까지 보여줍니다. */
const MAX_POSSIBLE_ORGANIZATIONS = 1;
/** possible 자료에서 온 권리는 조건을 붙여 쓴 것만, 최대 2개까지 보여줍니다. (짧은 설명만으로 권리를 단정하지 않도록) */
const MAX_POSSIBLE_RIGHTS = 2;
/** 답변에 쓰지 않았지만 함께 볼 수 있는 등록 권리정보 링크 수 */
const MAX_RELATED = 3;
/** 답변 아래에 보여줄 "이런 것도 물어볼 수 있어요" 문장 수와 길이 */
const MAX_SUGGESTIONS = 3;
const MAX_SUGGESTION_LENGTH = 60;
/** "먼저 확인할 것" 최대 개수와 한 항목의 최대 길이 */
const MAX_CHECKS = 3;
const MAX_CHECK_LENGTH = 200;
/**
 * possible 자료에서 AI에게 넘기는 기관 분류.
 * 사용자가 확인하지 않은 조건에 기대어 전문 기관(인권위, 법률, 이주민 재단 등)으로 서둘러 연결하지 않도록,
 * 청소년이 폭넓게 상담받을 수 있는 일반 상담 기관만 넘깁니다.
 */
const GENERAL_HELP_CATEGORIES: Organization['category'][] = ['youth'];

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

/** 추가 질문은 한 번에 하나만 보여줍니다. AI가 질문을 여러 개 쓰면 첫 번째 질문까지만 남깁니다. */
function firstQuestion(text: string): string {
  const clean = text.trim();
  const match = clean.match(/^[^?？]*[?？]/);
  return (match ? match[0] : clean).trim().slice(0, 300);
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
  const groundingArticles = getGroundingArticles();
  // 추가 질문이면 이전 대화를 정리해서 받습니다. 최초 질문이면 빈 목록입니다.
  const history = readHistory(rawHistory, buildAllowlist(organizations, groundingArticles));
  // "그러면 증거는요?"처럼 짧은 추가 질문도 이어지는 주제를 찾을 수 있도록 이전 질문을 함께 검색합니다.
  const searchText = [question, ...history.map((turn) => turn.question)].join('\n');
  // 한 문장만으로도 관련 가능성이 높은 자료를 찾되, 관련 단계(direct / possible)를 함께 기록합니다.
  const { matches: evidence, intents } = findEvidence(searchText, {
    direct: MAX_DIRECT_EVIDENCE,
    possible: MAX_POSSIBLE_EVIDENCE,
    total: MAX_EVIDENCE_ARTICLES,
  });
  const evidenceArticles = evidence.map((match) => match.article);
  const directIds = new Set(evidence.filter((match) => match.tier === 'direct').map((match) => match.article.id));

  /**
   * 자료에 연결된 기관 중 AI가 고를 수 있는 곳 (등록되지 않은 id 는 resolveOrganizations 가 버립니다)
   *  - direct 자료: 연결된 기관
   *  - possible 자료: 연결된 기관 중 청소년 일반 상담 기관만
   * 긴급 전화(112·117·119 등)는 AI에게 고르게 하지 않고, 긴급 판단일 때만 서버가 긴급 안내로 붙입니다.
   */
  function linkedOrganizationsOf(articles: RightsArticle[]): Organization[] {
    const ids = articles.flatMap((article) => {
      const linked = resolveOrganizations(article.organizations);
      const allowed = directIds.has(article.id)
        ? linked
        : linked.filter((org) => GENERAL_HELP_CATEGORIES.includes(org.category));
      return allowed.map((org) => org.id);
    });
    return resolveOrganizations(ids).filter((org) => org.category !== 'emergency');
  }

  const linkedOrganizations = linkedOrganizationsOf(evidenceArticles);
  const categoryIds = getCategories()
    .filter((c) => c.kind === 'rights')
    .map((c) => c.id);

  // 질문의 표현에서 알아챈 상황, 아직 확인되지 않은 사실, 확인 질문 후보 (AI의 이해를 돕는 힌트이며 근거가 아닙니다)
  const situations: ContextSituation[] = intents.map(({ intent }) => ({
    label: intent.label,
    relevance: intent.articles.some((ref) => ref.match === 'direct') ? 'direct' : 'possible',
    unknowns: intent.unknowns ?? [],
    clarify: intent.clarify ?? '',
  }));

  const context = buildContext(
    evidence.map((match) => ({
      article: match.article,
      matchedKeywords: match.keywordHits,
      relevance: match.tier,
      reasons: match.reasons,
    })),
    locale,
    linkedOrganizations,
    categoryIds,
    situations,
  );

  // --- 5) AI 호출 ---
  const raw = await askOpenAi({ question, context, history });
  if (!raw) {
    return json({ ok: false, error: 'server', fallback: fallbackArticles(locale) }, 502);
  }

  // --- 6) 답변 검증 ---
  const evidenceIds = new Set(evidenceArticles.map((article) => article.id));

  // 권리: 근거 자료 id 가 붙은 것만 남깁니다. 근거 자료가 없으면 권리도 없습니다.
  // possible 자료에서 온 권리는 조건을 붙여 쓴 것만 남깁니다. (개수 제한과 기관 문장 정리는 아래에서)
  const rights = (Array.isArray(raw.rights) ? raw.rights : [])
    .filter((right): right is AiRight => isBlock(right) && typeof right.source === 'string' && evidenceIds.has(right.source))
    .filter((right) => directIds.has(right.source) || isConditional(`${right.title} ${right.body}`));

  // 실제로 사용한 근거 자료 = AI가 출처로 적은 자료 + 권리에 붙은 자료 (보낸 근거 자료 안에서만)
  const citedIds = [...(Array.isArray(raw.sources) ? raw.sources : []), ...rights.map((right) => right.source)];
  const usedArticles = evidenceArticles.filter((article) => citedIds.includes(article.id));
  const usedDirect = usedArticles.filter((article) => directIds.has(article.id));
  const usedPossible = usedArticles.filter((article) => !directIds.has(article.id));

  // 기관: 사용한 근거 자료에 연결된 기관만 보여줍니다.
  //  - direct 자료의 기관: AI가 고르거나 "할 일"에서 이름을 말한 곳
  //  - possible 자료에만 연결된 기관: AI가 직접 고른 경우에만, 최대 1곳 (조건이 확인되지 않았으므로 더 엄격하게)
  const directCandidates = linkedOrganizationsOf(usedDirect);
  const possibleCandidates = linkedOrganizationsOf(usedPossible).filter(
    (org) => !directCandidates.some((candidate) => candidate.id === org.id),
  );
  const aiActions = (Array.isArray(raw.actions) ? raw.actions : []).filter(isBlock);
  const requestedIds = Array.isArray(raw.organizations) ? raw.organizations : [];
  const chosenDirectIds = requestedIds.filter((id) => directCandidates.some((org) => org.id === id));
  const mentionedDirectIds = directCandidates
    .filter((org) => [...aiActions, ...rights].some((block) => mentionsOrganization(`${block.title} ${block.body}`, org)))
    .map((org) => org.id);
  const chosenPossibleIds = requestedIds
    .filter((id) => possibleCandidates.some((org) => org.id === id))
    .slice(0, MAX_POSSIBLE_ORGANIZATIONS);
  const orgIds = [...new Set([...chosenDirectIds, ...mentionedDirectIds, ...chosenPossibleIds])].slice(0, MAX_ORGANIZATIONS);

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
    // "법을 어기는 일입니다"처럼 위법·범죄를 단정하는 문장은 뺍니다.
    .map((action) => ({ ...action, body: dropLegalLabelSentences(action.body) }))
    .filter((action) => action.body && !isLegalLabel(action.title))
    .slice(0, MAX_ACTIONS);

  // 권리·요약·참고·추가 질문에서도 보여주지 않는 기관(이름·번호)을 말하는 문장은 뺍니다. 나머지 안내 문장은 남깁니다.
  // 위법·범죄를 단정하는 문장("법을 어기는 일입니다" 등)도 뺍니다. 등록 자료에 있는 문장이라도 짧은 질문에 그대로 붙이지 않습니다.
  const withoutHidden = (text: string) =>
    dropLegalLabelSentences(dropSentencesMentioning(text, hiddenOrganizations, shownPhones));
  let possibleRights = 0;
  const visibleRights = rights
    .filter(
      (right) =>
        !hiddenOrganizations.some((org) => mentionsOrganization(right.title, org, shownPhones)) && !isLegalLabel(right.title),
    )
    .map((right) => ({ ...right, body: withoutHidden(right.body) }))
    .filter((right) => {
      if (!right.body) return false;
      if (directIds.has(right.source)) return true;
      possibleRights += 1;
      return possibleRights <= MAX_POSSIBLE_RIGHTS;
    })
    .slice(0, MAX_RIGHTS);
  const followUp = firstQuestion(typeof raw.follow_up_question === 'string' ? raw.follow_up_question : '');

  // 먼저 확인할 것: 질문이 아닌 짧은 문장만, 최대 3개. (사용자에게 묻는 질문은 follow_up_question 하나뿐입니다)
  // 보여주지 않는 기관을 말하거나 위법을 단정하는 문장, 등록되지 않은 번호·링크는 다른 칸과 똑같이 지웁니다.
  const checks = (Array.isArray(raw.checks) ? raw.checks : [])
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().slice(0, MAX_CHECK_LENGTH))
    .filter((item) => item && !/[?？]/.test(item))
    .map((item) => scrub(withoutHidden(item), allow))
    .filter(Boolean)
    .slice(0, MAX_CHECKS);

  const answer: AiAnswer = {
    category: categoryIds.includes(raw.category) ? raw.category : 'other',
    urgency: urgent ? 'urgent' : 'normal',
    summary: scrub(withoutHidden(typeof raw.summary === 'string' ? raw.summary : ''), allow),
    checks,
    rights: scrubBlocks(visibleRights, allow),
    actions: scrubBlocks(actions, allow),
    organizations: orgIds,
    sources: usedArticles.map((article) => article.id),
    follow_up_question: scrub(withoutHidden(followUp), allow),
    limitations: scrub(withoutHidden(typeof raw.limitations === 'string' ? raw.limitations : ''), allow),
  };

  // 출처: 실제로 사용한 등록 자료의 제목·검토일·공식 출처(발행기관, 주소)만 보여줍니다.
  const sources = usedArticles.map((article) => {
    const { body } = resolveArticle(article, locale);
    return {
      id: article.id,
      title: body.title,
      href: `/${locale}/rights/${article.category}/${article.id}`,
      reviewed_at: article.reviewed_at,
      sources: (article.sources ?? []).map((source) => localizeSource(source, locale)),
    };
  });

  // 함께 볼 수 있는 권리정보: 이번에 찾았지만 답변에 쓰지 않은 자료, 그리고 사용한 direct 자료의 관련 글 (등록 페이지 링크만)
  const usedIds = new Set(usedArticles.map((article) => article.id));
  const groundingById = new Map(groundingArticles.map((article) => [article.id, article]));
  const related = [...new Set([...evidenceArticles.map((article) => article.id), ...usedDirect.flatMap((article) => article.related ?? [])])]
    .filter((id) => !usedIds.has(id))
    .map((id) => groundingById.get(id))
    .filter((article): article is RightsArticle => Boolean(article))
    .slice(0, MAX_RELATED)
    .map((article) => ({
      id: article.id,
      title: resolveArticle(article, locale).body.title,
      href: `/${locale}/rights/${article.category}/${article.id}`,
    }));
  // 근거 자료를 하나도 쓰지 못했다면, 질문과 낱말이 비슷한 등록 권리정보를 "링크로만" 더 보여줍니다. (근거로 쓰지 않습니다)
  if (usedArticles.length === 0 && related.length < MAX_RELATED) {
    for (const article of findSimilarArticles(searchText, MAX_RELATED)) {
      if (related.length >= MAX_RELATED) break;
      if (usedIds.has(article.id) || related.some((item) => item.id === article.id)) continue;
      related.push({
        id: article.id,
        title: resolveArticle(article, locale).body.title,
        href: `/${locale}/rights/${article.category}/${article.id}`,
      });
    }
  }

  // 이어서 물어볼 수 있는 질문: AI가 새로 지어내지 않고, 등록된 권리정보에 실제로 적혀 있는 문장만 씁니다.
  //  ① 이번에 쓴 자료의 "이런 상황인가요?"(situations) 문장 — 이용자가 말하듯 적힌 문장입니다.
  //  ② 함께 볼 수 있는 권리정보의 제목 — 대부분 질문 형태입니다.
  // 이미 물어본 것과 같은 문장은 빼고, 최대 MAX_SUGGESTIONS 개만 보냅니다.
  const askedBefore = [question, ...history.map((turn) => turn.question)].map((text) => text.replace(/\s+/g, ''));
  const suggestions: string[] = [];
  const addSuggestion = (text: string) => {
    const clean = text.trim();
    if (!clean || clean.length > MAX_SUGGESTION_LENGTH || suggestions.length >= MAX_SUGGESTIONS) return;
    const compact = clean.replace(/\s+/g, '');
    if (askedBefore.some((asked) => asked === compact) || suggestions.some((item) => item.replace(/\s+/g, '') === compact)) return;
    suggestions.push(clean);
  };
  for (const article of usedArticles) {
    for (const situation of resolveArticle(article, locale).body.situations) addSuggestion(situation);
  }
  for (const item of related) addSuggestion(item.title);

  return json({
    ok: true,
    mode: 'ai',
    answer,
    evidence: usedArticles.length === 0 ? 'none' : usedDirect.length > 0 ? 'found' : 'possible',
    related,
    suggestions,
    organizations: shownOrganizations,
    sources,
    emergency: emergency
      ? { title: emergency.title, message: emergency.message, steps: emergency.steps, note: emergency.note }
      : undefined,
  });
}
