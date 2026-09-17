// 사용자의 질문과 가장 관련이 높은 권리정보를 찾아주는 간단한 검색기입니다.
// 무거운 검색 엔진이나 벡터 DB 없이, 키워드가 얼마나 겹치는지로 점수를 냅니다.
// 이렇게 하면 비용이 들지 않고, 결과가 왜 나왔는지 설명하기도 쉽습니다.
//
// 중요: 점수가 있다는 것과 관련 자료라는 것은 다릅니다.
// AI의 근거 자료로는 "등록된 키워드가 질문에 실제로 들어 있는 글"(keywordHits 가 있는 글)만 씁니다. (route.ts 참고)
//
// 검색 단계
//  1) 조사·어미 정리 (stem)
//  2) 유사 표현 넓히기 (content/search-synonyms.json: "주급" → "월급"·"급여" 등) — 검색용일 뿐 근거가 아닙니다.
//  3) 등록 키워드 일치 (findRelevantArticles)
//  4) 상황 사전 (content/search-intents.json: 구어체·짧은 표현 → 등록 글, direct / possible)
//  5) 자료를 못 찾았을 때만: 제목·요약·상황·권리·할 일 제목에 비슷한 낱말이 있는 글을 "링크로만" 제안 (findSimilarArticles)

import { getGroundingArticles, getSearchIntents, getSearchSynonyms, resolveArticle } from './content';
import { LOCALES, type EvidenceTier, type Locale, type RightsArticle, type SearchIntent } from './types';

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s]+/g, ' ')
    .replace(/[.,!?;:()[\]{}"'`~/\\|<>@#$%^&*_+=-]/g, ' ')
    .trim();
}

/**
 * 한국어 조사·어미 규칙입니다. [끝부분, 바꿀 글자] 이며 긴 것부터 확인합니다.
 *  - "이라서 / 이라는 / 이라고" 는 모두 "이라" 로 맞춥니다.
 *    ("외국인이라는" 과 "외국인이라서" 는 같은 말로 보지만, "외국인도" 와는 다른 말로 봅니다)
 *  - "하고 / 해요 / 했" 같은 '하다' 활용은 "하" 로 맞춥니다. ("연장하고" → "연장하")
 *  - 조사("를", "에서" 등)는 떼어냅니다. ("비자를" → "비자")
 */
const ENDING_RULES: [string, string][] = [
  ['했어요', '하'],
  ['했는데', '하'],
  ['하는데', '하'],
  ['이라서', '이라'],
  ['이라는', '이라'],
  ['이라고', '이라'],
  ['에서는', ''],
  ['에게서', ''],
  ['으로는', ''],
  ['하고', '하'],
  ['해서', '하'],
  ['해요', '하'],
  ['하는', '하'],
  ['하게', '하'],
  ['했다', '하'],
  ['한다', '하'],
  ['라서', '이라'],
  ['라는', '이라'],
  ['라고', '이라'],
  ['에서', ''],
  ['에게', ''],
  ['한테', ''],
  ['으로', ''],
  ['이랑', ''],
  ['까지', ''],
  ['부터', ''],
  ['처럼', ''],
  ['보다', ''],
  ['는데', ''],
  ['했', '하'],
  ['해', '하'],
  ['은', ''],
  ['는', ''],
  ['이', ''],
  ['가', ''],
  ['을', ''],
  ['를', ''],
  ['에', ''],
  ['의', ''],
  ['도', ''],
  ['만', ''],
  ['과', ''],
  ['와', ''],
  ['로', ''],
  ['랑', ''],
];

/** 조사·어미를 한 번 정리합니다. 남는 글자가 minLength 보다 짧아지면 그대로 둡니다. */
function stem(token: string, minLength = 2): string {
  for (const [ending, replacement] of ENDING_RULES) {
    if (token.endsWith(ending) && token.length - ending.length >= minLength) {
      return token.slice(0, token.length - ending.length) + replacement;
    }
  }
  return token;
}

/** 어느 글에나 흔하게 나오는 말입니다. 제목·요약 점수 계산에서 뺍니다. */
const COMMON_WORDS = new Set([
  '있어요',
  '없어요',
  '싶어요',
  '같아요',
  '해요',
  '했어요',
  '싶은데',
  '있는데',
  '없는데',
  '어떻게',
  '해야',
  '하나요',
  '되나요',
  '있나요',
  '궁금',
  '계속',
  '자꾸',
  '너무',
  '정말',
  '그냥',
  '지금',
  '요즘',
  '많이',
  '때문',
  '때문에',
  '이유',
  '학교',
  '한국',
  '친구',
  '친구들',
  '선생님',
  '사람',
  '말',
  '나',
  '저',
  '제',
  '내',
  '우리',
]);

function isCommon(token: string): boolean {
  return COMMON_WORDS.has(token) || COMMON_WORDS.has(stem(token)) || COMMON_WORDS.has(stem(token, 1));
}

/** 질문의 단어 하나가 키워드 조각과 같은 말인지 확인합니다. (조사·어미 차이는 같은 말로 봅니다) */
function sameWord(token: string, part: string): boolean {
  if (token === part) return true;
  // "돈을" = "돈" 처럼 한 글자 낱말은 조사만 뗀 모양이 같을 때만 같은 말로 봅니다.
  if (part.length === 1) return stem(token, 1) === part;
  const partStem = stem(part);
  const tokenStem = stem(token);
  // "무시해요" = "무시" 처럼 명사 + '하다' 는 같은 말로 봅니다.
  return tokenStem === partStem || tokenStem === `${partStem}하`;
}

/** 등록된 키워드가 질문에 들어 있는지 확인합니다. */
function keywordMatches(keyword: string, q: string, tokens: string[]): boolean {
  const term = normalize(keyword);
  if (term.length < 2) return false;
  // 1) 키워드가 글자 그대로 들어 있는 경우 (띄어쓰기가 없는 중국어 등도 이 방법으로 찾습니다)
  if (q.includes(term)) return true;
  // 2) 키워드의 모든 낱말이 조사·어미만 다르게 들어 있는 경우 ("비자 연장" ↔ "비자를 연장하고")
  const parts = term.split(' ').filter(Boolean);
  if (parts.length === 1 && stem(parts[0]).length < 2) return false;
  return parts.every((part) => tokens.some((token) => sameWord(token, part)));
}

function articleText(article: RightsArticle): { title: string; summary: string } {
  const titles: string[] = [];
  const summaries: string[] = [];
  for (const locale of LOCALES) {
    const body = article.i18n[locale];
    if (!body) continue;
    titles.push(body.title);
    summaries.push(body.summary, ...body.situations);
  }
  return { title: normalize(titles.join(' ')), summary: normalize(summaries.join(' ')) };
}

// ---------------------------------------------------------------------------
// 유사 표현 넓히기 (content/search-synonyms.json)
// 질문에 묶음의 낱말 하나가 낱말 단위로 들어 있으면, 같은 묶음의 다른 낱말로도 등록 키워드를 찾습니다.
// ("페이스북"의 "페이"처럼 다른 낱말의 일부분은 맞은 것으로 보지 않습니다)
// 넓힌 낱말은 검색에만 쓰며, AI의 근거는 언제나 등록된 권리정보입니다.
// ---------------------------------------------------------------------------

/** 표현(한 낱말 또는 여러 낱말)이 질문에 낱말 단위로 들어 있는지 확인합니다. */
function termInQuery(term: string, q: string, tokens: string[]): boolean {
  const normalized = normalize(term);
  if (!normalized) return false;
  // 띄어쓰기가 없는 중국어는 글자 그대로 찾습니다.
  if (/\p{Script=Han}/u.test(normalized)) return q.includes(normalized);
  const parts = normalized.split(' ').filter(Boolean);
  if (parts.length === 1) return tokens.some((token) => sameWord(token, parts[0]));
  let from = 0;
  for (const part of parts) {
    const index = tokens.findIndex((token, i) => i >= from && partMatches(token, part));
    if (index === -1) return false;
    from = index + 1;
  }
  return true;
}

/** 질문에 들어 있는 표현과 같은 묶음의 다른 표현들을 돌려줍니다. (검색용) */
export function expandQuery(query: string): string[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(' ').filter(Boolean);
  const added = new Set<string>();
  for (const group of getSearchSynonyms()) {
    const present = group.terms.filter((term) => termInQuery(term, q, tokens));
    if (present.length === 0) continue;
    for (const term of group.terms) {
      if (!present.includes(term)) added.add(term);
    }
  }
  return [...added];
}

export interface ScoredArticle {
  article: RightsArticle;
  score: number;
  /**
   * 질문 안에 실제로 들어 있던 등록 키워드.
   * 비어 있으면 일상 단어만 겹친 결과이므로 AI의 근거 자료로 쓰지 않습니다.
   */
  keywordHits: string[];
}

/**
 * 질문과 관련이 높은 권리정보를 점수 순으로 돌려줍니다.
 * limit 개수만큼만 돌려줍니다. 근거 자료로 쓸지는 keywordHits 로 따로 판단합니다.
 */
export function findRelevantArticles(query: string, limit = 4): ScoredArticle[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(' ').filter(Boolean);
  const meaningfulTokens = tokens.filter((token) => token.length > 1 && !isCommon(token));

  const scored = getGroundingArticles().map((article) => {
    const { title, summary } = articleText(article);
    const keywordHits = article.keywords.filter((keyword) => keywordMatches(keyword, q, tokens));
    let score = 0;

    // 1) 등록된 키워드가 질문 안에 들어 있는가 (가장 강한 신호)
    score += keywordHits.length * 3;
    // 2) 제목의 (흔하지 않은) 낱말이 질문에 들어 있는가
    const titleWords = title.split(' ').filter((word) => word.length > 1 && !isCommon(word));
    score += titleWords.filter((word) => meaningfulTokens.some((token) => sameWord(token, word))).length;
    // 3) 질문의 (흔하지 않은) 낱말이 요약/상황 설명 안에 들어 있는가
    score += meaningfulTokens.filter((token) => summary.includes(stem(token))).length * 0.5;
    // 4) 카테고리 이름이 직접 언급되었는가
    if (q.includes(normalize(article.category))) score += 1;

    return { article, score, keywordHits };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id))
    .slice(0, limit);
}

/**
 * 근거 자료를 하나도 찾지 못했을 때 보여줄 "비슷한 권리정보"를 찾습니다.
 * 제목·요약·상황·권리 제목·할 일 제목에서 질문의 (흔하지 않은) 낱말을 찾습니다.
 * 결과는 등록 페이지 링크로만 보여주며 AI의 근거로 쓰지 않습니다.
 */
export function findSimilarArticles(query: string, limit = 3): RightsArticle[] {
  const q = normalize([query, ...expandQuery(query)].join(' '));
  const tokens = [...new Set(q.split(' ').map((token) => stem(token)))].filter(
    (token) => token.length > 1 && !isCommon(token),
  );
  if (tokens.length === 0) return [];
  return getGroundingArticles()
    .map((article) => {
      const parts: string[] = [];
      for (const locale of LOCALES) {
        const body = article.i18n[locale];
        if (!body) continue;
        parts.push(
          body.title,
          body.summary,
          ...body.situations,
          ...body.rights.map((item) => item.title),
          ...body.actions.map((item) => item.title),
        );
      }
      const text = normalize(parts.join(' '));
      const score = tokens.filter((token) => text.includes(token)).length;
      return { article, score };
    })
    .filter((item) => item.score >= 1)
    .sort((a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id))
    .slice(0, limit)
    .map((item) => item.article);
}

// ---------------------------------------------------------------------------
// 짧은 질문을 위한 단계별 근거 찾기 (AI 질문 /api/ask 에서 사용)
//
// 이주배경청소년은 "월급 안 줘요", "친구들이 놀려요"처럼 짧거나 문법이 완전하지 않은 한 문장만 쓰는 경우가 많습니다.
// 그래서 등록 키워드 일치(위의 기존 방식)에 더해, content/search-intents.json 의 "상황 사전"으로
// 구어체·짧은 표현·띄어쓰기 없는 표현을 이미 등록된 권리정보와 연결합니다.
//  - direct   : 등록 키워드가 질문에 있거나, 사전에서 "말만으로 상황이 분명함"으로 정한 표현이 있음
//  - possible : 사용자가 말하지 않은 조건이 맞을 때만 관련될 수 있음
//               (AI는 조건부로만 안내하고, 서버는 이 자료에 연결된 기관을 더 엄격하게 거릅니다. route.ts 참고)
// 사전은 등록된 글을 가리키기만 하므로 새 권리·기관·전화번호를 만들지 않습니다.
// ---------------------------------------------------------------------------

function compact(text: string): string {
  return text.replace(/\s+/g, '');
}

/**
 * 표현의 한 낱말이 질문의 낱말과 맞는지: 같거나, 조사·어미만 다르거나, 그 낱말로 시작합니다. ("끝나" ↔ "끝나요")
 * 한 글자 낱말("안", "싫")은 "안전", "안내"처럼 다른 말로 이어지지 않도록 짧은 활용("싫어요", "줘요")까지만 맞춥니다.
 */
function partMatches(token: string, part: string): boolean {
  if (token === part || sameWord(token, part)) return true;
  if (!token.startsWith(part)) return false;
  return part.length >= 2 || token.length <= part.length + 2;
}

/** 한글·영문·베트남어처럼 띄어쓰기로 낱말을 나누는 표현인지 (중국어는 띄어쓰기가 없어 낱말 경계를 보지 않습니다) */
function needsWordStart(term: string): boolean {
  return /^[\p{Script=Hangul}\p{Script=Latin}0-9]/u.test(term);
}

/** text 안에서 term 이 낱말의 시작 위치에 나오는지. ("용돈을 안 줘"의 "돈을 안 줘"는 낱말 중간이라 맞지 않습니다) */
function includesAtWordStart(text: string, term: string, wordStarts?: boolean[]): boolean {
  if (!needsWordStart(term)) return text.includes(term);
  for (let index = text.indexOf(term); index !== -1; index = text.indexOf(term, index + 1)) {
    const atStart = wordStarts ? wordStarts[index] : index === 0 || text[index - 1] === ' ';
    if (atStart) return true;
  }
  return false;
}

/** 상황 사전의 표현 하나가 질문에 들어 있는지 확인합니다. */
function triggerMatches(trigger: string, q: string, tokens: string[], compactQuery: string, wordStarts: boolean[]): boolean {
  const term = normalize(trigger);
  if (compact(term).length < 2) return false;
  // 1) 표현이 글자 그대로 들어 있음 (띄어쓰기가 없는 중국어도 이 방법으로 찾습니다)
  if (includesAtWordStart(q, term)) return true;
  // 2) "돈안줘요 사장님"처럼 띄어쓰기를 하지 않은 경우
  const compactTerm = compact(term);
  if (compactTerm.length >= 3 && includesAtWordStart(compactQuery, compactTerm, wordStarts)) return true;
  // 3) 여러 낱말 표현은 조사·어미가 달라도 순서대로 모두 나오면 맞은 것으로 봅니다. ("월급 안 줘" ↔ "월급을 아직 안 줘요")
  const parts = term.split(' ').filter(Boolean);
  if (parts.length < 2) return false;
  let from = 0;
  for (const part of parts) {
    const index = tokens.findIndex((token, i) => i >= from && partMatches(token, part));
    if (index === -1) return false;
    from = index + 1;
  }
  return true;
}

export interface MatchedIntent {
  intent: SearchIntent;
  /** 질문에서 실제로 찾은 표현 */
  trigger: string;
}

/** 질문에서 상황 사전의 상황을 찾습니다. (여러 개일 수 있습니다) */
export function matchIntents(query: string): MatchedIntent[] {
  const q = normalize(query);
  if (!q) return [];
  const tokens = q.split(' ').filter(Boolean);
  const compactQuery = compact(q);
  // 띄어쓰기를 뺀 질문의 글자마다, 원래 질문에서 낱말의 첫 글자였는지 기록합니다.
  const wordStarts: boolean[] = [];
  for (let i = 0; i < q.length; i += 1) {
    if (q[i] !== ' ') wordStarts.push(i === 0 || q[i - 1] === ' ');
  }
  const matched: MatchedIntent[] = [];
  for (const intent of getSearchIntents()) {
    const triggers = LOCALES.flatMap((locale) => intent.triggers[locale] ?? []);
    const trigger = triggers.find((candidate) => triggerMatches(candidate, q, tokens, compactQuery, wordStarts));
    if (trigger) matched.push({ intent, trigger });
  }
  return matched;
}

export interface EvidenceMatch {
  article: RightsArticle;
  tier: EvidenceTier;
  score: number;
  /** 질문 안에 실제로 들어 있던 등록 키워드 (상황 사전으로만 찾은 글은 비어 있습니다) */
  keywordHits: string[];
  /** 이 글을 찾은 이유. AI에게 "왜 이 자료가 왔는지" 알려주고, 테스트에서도 확인합니다. */
  reasons: string[];
}

export interface EvidenceResult {
  matches: EvidenceMatch[];
  intents: MatchedIntent[];
}

/**
 * AI의 근거 후보를 단계별로 찾습니다.
 * direct 를 먼저, possible 을 그다음으로 담으며, 개수 제한은 limits 로 정합니다.
 * 기존 findRelevantArticles 는 그대로 두고 그 결과(등록 키워드 일치)를 direct 의 출발점으로 씁니다.
 */
export function findEvidence(query: string, limits = { direct: 3, possible: 2, total: 4 }): EvidenceResult {
  const byId = new Map<string, EvidenceMatch>();
  const grounding = new Map(getGroundingArticles().map((article) => [article.id, article]));

  // 1) 등록 키워드가 질문(+ 유사 표현)에 들어 있는 글
  const synonyms = expandQuery(query);
  const searchQuery = synonyms.length > 0 ? `${query}\n${synonyms.join('\n')}` : query;
  const q = normalize(query);
  const tokens = q.split(' ').filter(Boolean);
  for (const match of findRelevantArticles(searchQuery, 20)) {
    if (match.keywordHits.length === 0) continue;
    const viaSynonym = match.keywordHits.filter((keyword) => !keywordMatches(keyword, q, tokens));
    byId.set(match.article.id, {
      article: match.article,
      tier: 'direct',
      score: match.score,
      keywordHits: match.keywordHits,
      reasons: [
        viaSynonym.length > 0
          ? `등록 키워드: ${match.keywordHits.join(', ')} (유사 표현으로 찾음: ${viaSynonym.join(', ')})`
          : `등록 키워드: ${match.keywordHits.join(', ')}`,
      ],
    });
  }

  // 2) 상황 사전: 짧은 표현·구어체를 등록된 글과 연결 (사용자가 실제로 쓴 말로만 찾습니다)
  const intents = matchIntents(query);
  for (const { intent, trigger } of intents) {
    for (const ref of intent.articles) {
      const article = grounding.get(ref.id);
      if (!article) continue;
      const reason =
        ref.match === 'direct'
          ? `표현 "${trigger}" → 상황 "${intent.label}"`
          : `표현 "${trigger}" → 상황 "${intent.label}" (사용자가 말하지 않은 조건이 맞을 때만 관련)`;
      const existing = byId.get(article.id);
      if (existing) {
        existing.reasons.push(reason);
        if (ref.match === 'direct') {
          existing.tier = 'direct';
          existing.score += 3;
        } else {
          existing.score += 1;
        }
      } else {
        byId.set(article.id, {
          article,
          tier: ref.match,
          score: ref.match === 'direct' ? 3 : 1.5,
          keywordHits: [],
          reasons: [reason],
        });
      }
    }
  }

  const sorted = [...byId.values()].sort((a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id));
  const direct = sorted.filter((match) => match.tier === 'direct').slice(0, limits.direct);
  const possible = sorted.filter((match) => match.tier === 'possible').slice(0, limits.possible);
  return { matches: [...direct, ...possible].slice(0, limits.total), intents };
}

/** 관련 글을 하나도 못 찾았을 때 보여줄 기본 목록 */
export function fallbackArticles(locale: Locale, limit = 4) {
  return getGroundingArticles()
    .filter((a) => a.featured)
    .slice(0, limit)
    .map((article) => {
      const { body } = resolveArticle(article, locale);
      return { id: article.id, title: body.title, href: `/${locale}/rights/${article.category}/${article.id}` };
    });
}
